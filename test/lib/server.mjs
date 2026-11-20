import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import {
  SERVER_DIR,
  SERVER_HOST,
  MC_PORT,
  RCON_PORT,
  RCON_PASSWORD,
  PAPER_JAR_PATH,
} from './config.mjs';
import { syncDatapack } from './setup.mjs';
import { RconClient } from './rcon.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MinecraftServer {
  constructor({ javaPath, keepWorld = false, verbose = false } = {}) {
    this.javaPath = javaPath;
    this.keepWorld = keepWorld;
    this.verbose = verbose;
    this.proc = null;
    this.rcon = null;
    this.logs = [];
    this.exited = false;
    this.exitCode = null;
  }

  prepareFiles() {
    fs.mkdirSync(SERVER_DIR, { recursive: true });

    if (!this.keepWorld) {
      for (const dir of ['world', 'world_nether', 'world_the_end']) {
        fs.rmSync(path.join(SERVER_DIR, dir), { recursive: true, force: true });
      }
      fs.rmSync(path.join(SERVER_DIR, 'logs', 'latest.log'), { force: true });
    }

    syncDatapack();

    fs.writeFileSync(path.join(SERVER_DIR, 'eula.txt'), 'eula=true\n', 'utf8');

    // Paper defaults connection-throttle to 4000ms, which disconnects the second local bot
    fs.writeFileSync(
      path.join(SERVER_DIR, 'bukkit.yml'),
      'settings:\n  connection-throttle: -1\n',
      'utf8',
    );

    const props = [
      `server-ip=${SERVER_HOST}`,
      `server-port=${MC_PORT}`,
      'enable-rcon=true',
      `rcon.port=${RCON_PORT}`,
      `rcon.password=${RCON_PASSWORD}`,
      'broadcast-rcon-to-ops=false',
      'online-mode=false',
      'enforce-secure-profile=false',
      'white-list=false',
      'enforce-whitelist=false',
      'allow-flight=true',
      'spawn-protection=0',
      'pause-when-empty-seconds=0',
      'level-type=minecraft\\:flat',
      'generate-structures=false',
      'difficulty=normal',
      'spawn-monsters=false',
      'spawn-animals=false',
      'spawn-npcs=false',
      'allow-nether=true',
      'pvp=true',
      'view-distance=4',
      'simulation-distance=4',
      'max-players=10',
      'motd=DrinkingCraft Test Server 26.3',
    ].join('\n');

    fs.writeFileSync(path.join(SERVER_DIR, 'server.properties'), `${props}\n`, 'utf8');
  }

  async start({ timeoutMs = 240_000 } = {}) {
    this.prepareFiles();
    this.logs = [];
    this.exited = false;
    this.exitCode = null;

    console.log(`[server] Starting Paper 26.3 on ${SERVER_HOST}:${MC_PORT} (RCON ${RCON_PORT})...`);

    const args = [
      '-Xms512M',
      '-Xmx1536M',
      '-Dcom.mojang.eula.agree=true',
      '-jar',
      PAPER_JAR_PATH,
      'nogui',
    ];

    this.proc = spawn(this.javaPath, args, {
      cwd: SERVER_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.proc.on('exit', (code) => {
      this.exited = true;
      this.exitCode = code;
    });

    await new Promise((resolve, reject) => {
      let settled = false;
      let stdoutBuf = '';
      let stderrBuf = '';

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Server did not finish starting within ${timeoutMs}ms. Last logs:\n${this.logs.slice(-25).join('\n')}`));
        }
      }, timeoutMs);

      const handleLine = (line, isErr = false) => {
        const clean = line.replace(/\r$/, '');
        if (!clean) return;
        this.logs.push(clean);
        if (this.verbose) {
          console.log(`${isErr ? '[paper:err]' : '[paper]'} ${clean}`);
        }
        if (!settled && /Done \([\d.]+s\)!/.test(clean)) {
          settled = true;
          clearTimeout(timer);
          resolve();
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

      this.proc.once('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      this.proc.once('exit', (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(`Server exited prematurely with code ${code}.\n${this.logs.slice(-30).join('\n')}`));
        }
      });
    });

    // Connect RCON with brief retries in case RCON binds right after Done
    let lastRconErr = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        const rcon = new RconClient({ host: SERVER_HOST, port: RCON_PORT, password: RCON_PASSWORD });
        await rcon.connect();
        this.rcon = rcon;
        break;
      } catch (err) {
        lastRconErr = err;
        await sleep(300);
      }
    }
    if (!this.rcon) {
      throw new Error(`Failed to connect RCON on port ${RCON_PORT}: ${lastRconErr?.message}`);
    }

    await this.configureTestWorld();
    console.log('[server] Server ready, RCON connected, test arena prepared.');
  }

  async cmd(command) {
    if (!this.rcon) throw new Error('RCON not connected');
    return this.rcon.send(command);
  }

  async configureTestWorld() {
    const setupCommands = [
      'gamerule immediate_respawn true',
      'gamerule spawn_mobs false',
      'gamerule advance_time false',
      'gamerule advance_weather false',
      'time set day',
      'weather clear',
      'setworldspawn 10 100 10',
      // Force-load arena and distant platform chunks so fill succeeds with view-distance=4
      'forceload add -16 -16 32 32',
      'forceload add 144 -16 160 16',
      // Main arena platform at y=99 (player stands on y=100)
      'fill -5 99 -5 25 99 25 minecraft:stone',
      'fill -5 100 -5 25 112 25 minecraft:air',
      // Distant platform at x=150 for multiplayer distance sound testing
      'fill 147 99 -3 153 99 3 minecraft:stone',
      'fill 147 100 -3 153 108 3 minecraft:air',
      'forceload remove -16 -16 32 32',
      'forceload remove 144 -16 160 16',
    ];
    for (const c of setupCommands) {
      const out = await this.cmd(c);
      if (/(Cannot place blocks|Unknown or incomplete command|Incorrect argument)/i.test(out)) {
        throw new Error(`Setup command "${c}" failed: ${out}`);
      }
    }
  }

  getLogText() {
    return this.logs.join('\n');
  }

  getLogsSince(index) {
    return this.logs.slice(index);
  }

  getLogCursor() {
    return this.logs.length;
  }

  getDatapackErrors(sinceIndex = 0) {
    const relevant = this.logs.slice(sinceIndex);
    return relevant.filter((line) => {
      if (!/(ERROR|Exception|Failed to load|Couldn't parse|Unknown function|Unknown advancement|Unknown predicate|Unknown command)/i.test(line)) {
        return false;
      }
      // Ignore unrelated non-datapack noise unless it mentions bebida, datapack, function, advancement, predicate, or pack.mcmeta
      return /(bebida|datapack|DrinkingCraft|function|advancement|predicate|pack\.mcmeta|Failed to reload|Couldn't parse|Parsing error|Validation error)/i.test(
        line,
      );
    });
  }

  async stop() {
    try {
      if (this.rcon?.connected) {
        await Promise.race([
          this.rcon.send('stop').catch(() => {}),
          sleep(2000),
        ]);
      }
    } finally {
      this.rcon?.close();
      this.rcon = null;
    }

    if (!this.proc || this.exited) return;

    try {
      if (this.proc.stdin && !this.proc.stdin.destroyed) {
        this.proc.stdin.write('stop\n');
      }
    } catch {
      // ignore
    }

    const exitedGracefully = await Promise.race([
      new Promise((resolve) => {
        if (this.exited) resolve(true);
        else this.proc.once('exit', () => resolve(true));
      }),
      sleep(15_000).then(() => false),
    ]);

    if (!exitedGracefully && this.proc && !this.exited) {
      console.warn('[server] Server did not stop gracefully, forcing termination...');
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
