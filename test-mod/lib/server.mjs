import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import {
  SERVER_HOST,
  BACKEND_PORT,
  RCON_PORT,
  RCON_PASSWORD,
  MC_VERSION,
  getLoaderPaths,
} from './config.mjs';
import { RconClient } from './rcon.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ModdedServer {
  constructor({ loader, javaPath, launchInfo, keepWorld = false, verbose = false } = {}) {
    this.loader = loader;
    this.javaPath = javaPath;
    this.launchInfo = launchInfo;
    this.keepWorld = keepWorld;
    this.verbose = verbose;
    this.paths = getLoaderPaths(loader);
    this.proc = null;
    this.rcon = null;
    this.logs = [];
    this.exited = false;
    this.exitCode = null;
  }

  prepareFiles() {
    const { serverDir, worldDir, datapacksDir } = this.paths;
    fs.mkdirSync(serverDir, { recursive: true });

    if (!this.keepWorld) {
      fs.rmSync(worldDir, { recursive: true, force: true });
      fs.rmSync(path.join(serverDir, 'logs', 'latest.log'), { force: true });
    } else if (fs.existsSync(datapacksDir)) {
      fs.rmSync(datapacksDir, { recursive: true, force: true });
    }

    fs.writeFileSync(path.join(serverDir, 'eula.txt'), 'eula=true\n', 'utf8');

    const props = [
      `server-ip=${SERVER_HOST}`,
      `server-port=${BACKEND_PORT}`,
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
      `motd=DrinkingCraft Mod Test (${this.loader} ${MC_VERSION})`,
    ].join('\n');

    fs.writeFileSync(path.join(serverDir, 'server.properties'), `${props}\n`, 'utf8');
  }

  buildJavaArgs() {
    const common = ['-Xms512M', '-Xmx1536M', '-Dcom.mojang.eula.agree=true'];
    if (this.loader === 'fabric') {
      return [...common, '-jar', this.launchInfo?.launcherJar || 'fabric-server-launch.jar', 'nogui'];
    }
    if (this.launchInfo?.mode === 'jar' && this.launchInfo?.launcherJar) {
      return [...common, '-jar', this.launchInfo.launcherJar, 'nogui'];
    }
    if (this.launchInfo?.argsFile) {
      return [...common, `@${this.launchInfo.argsFile}`, 'nogui'];
    }
    throw new Error(`No valid Java launch arguments configured for loader "${this.loader}"`);
  }

  async start({ timeoutMs = 300_000 } = {}) {
    this.prepareFiles();
    this.logs = [];
    this.exited = false;
    this.exitCode = null;

    const args = this.buildJavaArgs();
    console.log(
      `[server:${this.loader}] Starting ${this.loader} ${MC_VERSION} on ${SERVER_HOST}:${BACKEND_PORT} (RCON ${RCON_PORT})...`,
    );

    this.proc = spawn(this.javaPath, args, {
      cwd: this.paths.serverDir,
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
          reject(
            new Error(
              `${this.loader} server did not finish starting within ${timeoutMs}ms. Last logs:\n${this.logs.slice(-35).join('\n')}`,
            ),
          );
        }
      }, timeoutMs);

      const handleLine = (line, isErr = false) => {
        const clean = line.replace(/\r$/, '');
        if (!clean) return;
        this.logs.push(clean);
        if (this.verbose) {
          console.log(`${isErr ? `[${this.loader}:err]` : `[${this.loader}]`} ${clean}`);
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
          reject(
            new Error(
              `${this.loader} server exited prematurely with code ${code}.\n${this.logs.slice(-45).join('\n')}`,
            ),
          );
        }
      });
    });

    let lastRconErr = null;
    for (let attempt = 0; attempt < 20; attempt++) {
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
      throw new Error(`Failed to connect RCON on port ${RCON_PORT} for ${this.loader}: ${lastRconErr?.message}`);
    }

    await this.configureTestWorld();
    console.log(`[server:${this.loader}] Server ready, RCON connected, test arena prepared.`);
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
      'forceload add -16 -16 32 32',
      'forceload add 144 -16 160 16',
      'fill -5 99 -5 25 99 25 minecraft:stone',
      'fill -5 100 -5 25 112 25 minecraft:air',
      'fill 147 99 -3 153 99 3 minecraft:stone',
      'fill 147 100 -3 153 108 3 minecraft:air',
      'forceload remove -16 -16 32 32',
      'forceload remove 144 -16 160 16',
    ];
    for (const c of setupCommands) {
      const out = await this.cmd(c);
      if (/(Cannot place blocks|Unknown or incomplete command|Incorrect argument)/i.test(out)) {
        throw new Error(`Setup command "${c}" failed on ${this.loader}: ${out}`);
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
      if (
        !/(ERROR|Exception|Failed to load|Couldn't parse|Unknown function|Unknown advancement|Unknown predicate|Unknown command|Incompatible mods|ModResolutionException|ModLoadingException|Missing or unsupported)/i.test(
          line,
        )
      ) {
        return false;
      }
      return /(bebida|datapack|DrinkingCraft|mr_drinkingcraft|function|advancement|predicate|pack\.mcmeta|Failed to reload|Couldn't parse|Parsing error|Validation error|Incompatible mods|ModResolution|ModLoading|fabric-resource-loader)/i.test(
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
      console.warn(`[server:${this.loader}] Server did not stop gracefully, forcing termination...`);
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
