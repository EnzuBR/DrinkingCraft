import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import {
  SERVER_HOST,
  MC_PORT,
  BACKEND_PORT,
  MC_VERSION,
  VIAPROXY_DIR,
  VIAPROXY_JAR_PATH,
} from './config.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnectTcp(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port });
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
  });
}

export class ViaProxyProcess {
  constructor({
    javaPath,
    jarPath = VIAPROXY_JAR_PATH,
    bindHost = SERVER_HOST,
    bindPort = MC_PORT,
    targetHost = SERVER_HOST,
    targetPort = BACKEND_PORT,
    targetVersion = MC_VERSION,
    verbose = false,
  } = {}) {
    this.javaPath = javaPath;
    this.jarPath = jarPath;
    this.bindHost = bindHost;
    this.bindPort = bindPort;
    this.targetHost = targetHost;
    this.targetPort = targetPort;
    this.targetVersion = targetVersion;
    this.verbose = verbose;
    this.proc = null;
    this.logs = [];
    this.exited = false;
    this.exitCode = null;
  }

  writeConfig() {
    fs.mkdirSync(VIAPROXY_DIR, { recursive: true });
    const configPath = path.join(VIAPROXY_DIR, 'viaproxy.yml');
    const yaml = [
      `bind-address: ${this.bindHost}:${this.bindPort}`,
      `target-address: ${this.targetHost}:${this.targetPort}`,
      `target-version: "${this.targetVersion}"`,
      'proxy-online-mode: false',
      'auth-method: NONE',
      'wildcard-domain-handling: NONE',
      '',
    ].join('\n');
    fs.writeFileSync(configPath, yaml, 'utf8');
    return configPath;
  }

  async start({ timeoutMs = 30_000 } = {}) {
    const configPath = this.writeConfig();
    this.logs = [];
    this.exited = false;
    this.exitCode = null;

    console.log(
      `[viaproxy] Starting ViaProxy on ${this.bindHost}:${this.bindPort} -> ${this.targetHost}:${this.targetPort} (target ${this.targetVersion})...`,
    );

    this.proc = spawn(
      this.javaPath,
      ['-Xms128M', '-Xmx512M', '-jar', this.jarPath, 'config', path.basename(configPath)],
      {
        cwd: VIAPROXY_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );

    this.proc.on('exit', (code) => {
      this.exited = true;
      this.exitCode = code;
    });

    await new Promise((resolve, reject) => {
      let settled = false;
      let stdoutBuf = '';
      let stderrBuf = '';
      let sawListeningLog = false;

      const fail = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(probeInterval);
        reject(err);
      };

      const succeed = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(probeInterval);
        resolve();
      };

      const timer = setTimeout(() => {
        fail(
          new Error(
            `ViaProxy did not become ready on ${this.bindHost}:${this.bindPort} within ${timeoutMs}ms.\nLast logs:\n${this.logs.slice(-25).join('\n')}`,
          ),
        );
      }, timeoutMs);

      const handleLine = (line, isErr = false) => {
        const clean = line.replace(/\r$/, '');
        if (!clean) return;
        this.logs.push(clean);
        if (this.verbose) {
          console.log(`${isErr ? '[viaproxy:err]' : '[viaproxy]'} ${clean}`);
        }
        if (/ViaProxy started successfully|Listening on|Started ViaProxy|bound to|Ready/i.test(clean)) {
          sawListeningLog = true;
        }
      };

      this.proc.stdout.on('data', (chunk) => {
        stdoutBuf += chunk.toString('utf8');
        const lines = stdoutBuf.split('\n');
        stdoutBuf = lines.pop() || '';
        for (const l of lines) handleLine(l, false);
      });

      this.proc.stderr.on('data', (chunk) => {
        stderrBuf += chunk.toString('utf8');
        const lines = stderrBuf.split('\n');
        stderrBuf = lines.pop() || '';
        for (const l of lines) handleLine(l, true);
      });

      this.proc.once('error', (err) => fail(err));
      this.proc.once('exit', (code) => {
        fail(new Error(`ViaProxy exited prematurely with code ${code}.\n${this.logs.slice(-30).join('\n')}`));
      });

      const probeInterval = setInterval(async () => {
        if (settled || this.exited) return;
        if (!sawListeningLog) return;
        const ok = await canConnectTcp(this.bindHost, this.bindPort, 400);
        if (ok) {
          succeed();
        }
      }, 200);
    });

    console.log(`[viaproxy] Ready on ${this.bindHost}:${this.bindPort}.`);
  }

  async stop() {
    if (!this.proc || this.exited) return;

    try {
      if (this.proc.stdin && !this.proc.stdin.destroyed) {
        this.proc.stdin.write('stop\n');
        this.proc.stdin.end();
      }
    } catch {
      // ignore
    }

    try {
      this.proc.kill('SIGTERM');
    } catch {
      // ignore
    }

    const exitedGracefully = await Promise.race([
      new Promise((resolve) => {
        if (this.exited) resolve(true);
        else this.proc.once('exit', () => resolve(true));
      }),
      sleep(5000).then(() => false),
    ]);

    if (!exitedGracefully && this.proc && !this.exited) {
      if (process.platform === 'win32' && this.proc.pid) {
        try {
          execFileSync('taskkill', ['/PID', String(this.proc.pid), '/T', '/F'], { stdio: 'ignore' });
        } catch {
          this.proc.kill('SIGKILL');
        }
      } else {
        this.proc.kill('SIGKILL');
      }
    }
  }
}
