import { parseArgs } from './lib/config.mjs';
import { provisionEnvironment } from './lib/setup.mjs';
import { MinecraftServer } from './lib/server.mjs';
import { disconnectBot } from './lib/bot.mjs';
import { createRunner } from './lib/runner.mjs';
import { registerSuite01 } from './suites/01-load.mjs';
import { registerSuite02 } from './suites/02-first-join-reload.mjs';
import { registerSuite03 } from './suites/03-multiplayer.mjs';
import { registerSuite04 } from './suites/04-global-locks.mjs';
import { registerSuite05 } from './suites/05-mining.mjs';
import { registerSuite06 } from './suites/06-continuous.mjs';
import { registerSuite07 } from './suites/07-uninstall.mjs';

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { javaPath } = await provisionEnvironment({ skipDownload: opts.skipDownload });

  const server = new MinecraftServer({
    javaPath,
    keepWorld: opts.keepWorld,
    verbose: opts.verbose,
  });

  const ctx = {
    server,
    opts,
    bots: {
      alpha: null,
      beta: null,
    },
  };

  let cleaningUp = false;
  const cleanup = async () => {
    if (cleaningUp) return;
    cleaningUp = true;
    await Promise.allSettled([
      disconnectBot(ctx.bots.alpha),
      disconnectBot(ctx.bots.beta),
    ]);
    await server.stop();
  };

  const onSignal = (sig) => {
    console.warn(`\n[runner] Received ${sig}, shutting down server...`);
    cleanup().finally(() => process.exit(1));
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const runner = createRunner({ filter: opts.only });
  registerSuite01(runner.suite, runner.test);
  registerSuite02(runner.suite, runner.test);
  registerSuite03(runner.suite, runner.test);
  registerSuite04(runner.suite, runner.test);
  registerSuite05(runner.suite, runner.test);
  registerSuite06(runner.suite, runner.test);
  registerSuite07(runner.suite, runner.test);

  try {
    await server.start();
    const result = await runner.run(ctx);
    process.exitCode = result.failed > 0 ? 1 : 0;
  } catch (err) {
    console.error('[runner] Fatal error:', err);
    process.exitCode = 1;
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    await cleanup();
  }
}

main();
