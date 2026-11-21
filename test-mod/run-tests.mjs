import path from 'node:path';
import {
  REPO_ROOT,
  LOCALES,
  parseArgs,
  resolveTargetJar,
} from './lib/config.mjs';
import { inspectModJar } from './lib/jar.mjs';
import { provisionLoader } from './lib/setup.mjs';
import { ModdedServer } from './lib/server.mjs';
import { ViaProxyProcess } from './lib/proxy.mjs';
import { disconnectBot } from './lib/bot.mjs';
import { createRunner } from './lib/runner.mjs';
import { registerSuite01 } from './suites/01-load.mjs';
import { registerSuite02 } from './suites/02-first-join-reload.mjs';
import { registerSuite03 } from './suites/03-multiplayer.mjs';
import { registerSuite04 } from './suites/04-global-locks.mjs';
import { registerSuite05 } from './suites/05-mining.mjs';
import { registerSuite06 } from './suites/06-continuous.mjs';
import { registerSuite07 } from './suites/07-uninstall.mjs';

function formatSummaryTable(results) {
  const rows = results.map((r) => ({
    loader: r.loader,
    status: r.status,
    passed: String(r.passed ?? 0),
    failed: String(r.failed ?? 0),
    skipped: String(r.skipped ?? 0),
    notes: r.note || '',
  }));

  const headers = {
    loader: 'Loader',
    status: 'Status',
    passed: 'Passed',
    failed: 'Failed',
    skipped: 'Skipped',
    notes: 'Notes',
  };

  const widths = {
    loader: Math.max(headers.loader.length, ...rows.map((r) => r.loader.length)),
    status: Math.max(headers.status.length, ...rows.map((r) => r.status.length)),
    passed: Math.max(headers.passed.length, ...rows.map((r) => r.passed.length)),
    failed: Math.max(headers.failed.length, ...rows.map((r) => r.failed.length)),
    skipped: Math.max(headers.skipped.length, ...rows.map((r) => r.skipped.length)),
  };

  const pad = (val, w) => val.padEnd(w);
  const sep = `${'-'.repeat(widths.loader)} | ${'-'.repeat(widths.status)} | ${'-'.repeat(widths.passed)} | ${'-'.repeat(widths.failed)} | ${'-'.repeat(widths.skipped)} | -----`;

  const lines = [
    `${pad(headers.loader, widths.loader)} | ${pad(headers.status, widths.status)} | ${pad(headers.passed, widths.passed)} | ${pad(headers.failed, widths.failed)} | ${pad(headers.skipped, widths.skipped)} | ${headers.notes}`,
    sep,
  ];
  for (const r of rows) {
    lines.push(
      `${pad(r.loader, widths.loader)} | ${pad(r.status, widths.status)} | ${pad(r.passed, widths.passed)} | ${pad(r.failed, widths.failed)} | ${pad(r.skipped, widths.skipped)} | ${r.notes}`,
    );
  }
  return lines.join('\n');
}

async function runSingleLoader({ loader, opts, jarInfo, locale, activeHandles }) {
  console.log(`\n============================================================`);
  console.log(`[runner] Testing loader: ${loader.toUpperCase()}`);
  console.log(`============================================================`);

  let server = null;
  let proxy = null;
  const ctx = {
    loader,
    jarInfo,
    locale,
    opts,
    server: null,
    proxy: null,
    bots: {
      alpha: null,
      beta: null,
    },
  };

  try {
    const provisioned = await provisionLoader(loader, {
      skipDownload: opts.skipDownload,
      jarPath: jarInfo.jarPath,
    });

    server = new ModdedServer({
      loader,
      javaPath: provisioned.javaPath,
      launchInfo: provisioned.launchInfo,
      keepWorld: opts.keepWorld,
      verbose: opts.verbose,
    });
    ctx.server = server;
    activeHandles.server = server;

    await server.start();

    proxy = new ViaProxyProcess({
      javaPath: provisioned.javaPath,
      jarPath: provisioned.viaProxyPath,
      verbose: opts.verbose,
    });
    ctx.proxy = proxy;
    activeHandles.proxy = proxy;
    activeHandles.bots = ctx.bots;

    await proxy.start();

    const runner = createRunner({ filter: opts.only, label: loader });
    registerSuite01(runner.suite, runner.test);
    registerSuite02(runner.suite, runner.test);
    registerSuite03(runner.suite, runner.test);
    registerSuite04(runner.suite, runner.test);
    registerSuite05(runner.suite, runner.test);
    registerSuite06(runner.suite, runner.test);
    registerSuite07(runner.suite, runner.test);

    const result = await runner.run(ctx);
    const status = result.failed > 0 ? 'FAIL' : 'PASS';
    const note =
      result.failed > 0
        ? result.failures.map((f) => `${f.test}`).join('; ').slice(0, 120)
        : `All ${result.passed} executed tests passed`;

    return {
      loader,
      status,
      passed: result.passed,
      failed: result.failed,
      skipped: result.skipped,
      note,
    };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error(`\n[runner:${loader}] Loader error:\n${msg}`);
    if (server && server.logs.length > 0 && !msg.includes(server.logs[server.logs.length - 1])) {
      console.error(`[runner:${loader}] Last server logs:\n${server.logs.slice(-25).join('\n')}`);
    }
    const firstLine = msg.split(/\r?\n/).find((l) => l.trim().length > 0) || 'Boot/provision error';
    return {
      loader,
      status: 'ERROR',
      passed: 0,
      failed: 0,
      skipped: 0,
      note: firstLine.slice(0, 140),
      error: err,
    };
  } finally {
    await Promise.allSettled([
      disconnectBot(ctx.bots.alpha),
      disconnectBot(ctx.bots.beta),
    ]);
    ctx.bots.alpha = null;
    ctx.bots.beta = null;

    if (proxy) {
      await proxy.stop().catch(() => {});
    }
    if (server) {
      await server.stop().catch(() => {});
    }
    activeHandles.server = null;
    activeHandles.proxy = null;
    activeHandles.bots = null;
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const jarPath = resolveTargetJar(opts.jar);
  const jarInfo = inspectModJar(jarPath);
  const effectiveLang = opts.lang === 'auto' ? jarInfo.lang : opts.lang;
  const locale = LOCALES[effectiveLang];

  console.log('============================================================');
  console.log('[runner] DrinkingCraft Modded Test Harness (MC 26.3)');
  console.log(`[runner] Target JAR : ${path.relative(REPO_ROOT, jarInfo.jarPath)}`);
  console.log(`[runner] Mod ID/Ver : ${jarInfo.modId} (${jarInfo.modVersion})`);
  console.log(`[runner] Language   : ${effectiveLang} (detected: ${jarInfo.lang})`);
  console.log(`[runner] Loaders    : ${opts.loaders.join(', ')}`);
  if (opts.only) console.log(`[runner] Filter     : "${opts.only}"`);
  console.log('============================================================');

  const activeHandles = { server: null, proxy: null, bots: null };
  let shuttingDown = false;

  const emergencyCleanup = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await Promise.allSettled([
      disconnectBot(activeHandles.bots?.alpha),
      disconnectBot(activeHandles.bots?.beta),
    ]);
    if (activeHandles.proxy) await activeHandles.proxy.stop().catch(() => {});
    if (activeHandles.server) await activeHandles.server.stop().catch(() => {});
  };

  const onSignal = (sig) => {
    console.warn(`\n[runner] Received ${sig}, shutting down active processes...`);
    emergencyCleanup().finally(() => process.exit(1));
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const results = [];
  try {
    for (const loader of opts.loaders) {
      const res = await runSingleLoader({ loader, opts, jarInfo, locale, activeHandles });
      results.push(res);
    }
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }

  console.log('\n============================================================');
  console.log('FINAL MOD LOADER MATRIX SUMMARY');
  console.log('============================================================');
  console.log(formatSummaryTable(results));

  const anyProblem = results.some((r) => r.status !== 'PASS');
  process.exitCode = anyProblem ? 1 : 0;
}

main().catch((err) => {
  console.error('[runner] Fatal error:', err);
  process.exitCode = 1;
});
