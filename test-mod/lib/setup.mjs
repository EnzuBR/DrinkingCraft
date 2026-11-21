import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  MC_VERSION,
  RUNTIME_DIR,
  DOWNLOADS_DIR,
  JRE_DIR,
  SHARED_TEST_JRE_DIR,
  VIAPROXY_DIR,
  VIAPROXY_JAR_PATH,
  SERVERS_DIR,
  VERSIONS_CACHE_PATH,
  USER_AGENT,
  getLoaderPaths,
} from './config.mjs';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadVersionsCache() {
  try {
    if (fs.existsSync(VERSIONS_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(VERSIONS_CACHE_PATH, 'utf8'));
    }
  } catch {
    // ignore corrupt cache
  }
  return {};
}

function saveVersionsCache(cache) {
  ensureDir(path.dirname(VERSIONS_CACHE_PATH));
  fs.writeFileSync(VERSIONS_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} fetching ${url}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest('hex').toLowerCase();
}

async function downloadFile(url, destPath, expectedSha256 = null) {
  ensureDir(path.dirname(destPath));
  const tmpPath = `${destPath}.tmp-${process.pid}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status} downloading ${url}`);
    }
    const out = fs.createWriteStream(tmpPath);
    await pipeline(Readable.fromWeb(res.body), out);

    if (expectedSha256) {
      const actual = await sha256File(tmpPath);
      if (actual !== expectedSha256.toLowerCase()) {
        throw new Error(`SHA256 mismatch for ${path.basename(destPath)}: expected ${expectedSha256}, got ${actual}`);
      }
    }
    fs.renameSync(tmpPath, destPath);
  } catch (err) {
    fs.rmSync(tmpPath, { force: true });
    throw err;
  }
}

export function getJavaMajorVersion(javaExe) {
  const res = spawnSync(javaExe, ['-version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (res.error) return null;
  const combined = `${res.stdout || ''}\n${res.stderr || ''}`;
  return parseJavaMajor(combined);
}

function parseJavaMajor(output) {
  const match = output.match(/version\s+"(\d+)(?:\.(\d+))?/i) || output.match(/openjdk\s+(\d+)/i);
  if (!match) return null;
  const first = Number.parseInt(match[1], 10);
  if (first === 1 && match[2]) return Number.parseInt(match[2], 10);
  return first;
}

function findFileRecursive(dir, filename, maxDepth = 4) {
  if (maxDepth < 0 || !fs.existsSync(dir)) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) {
      return full;
    }
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, filename, maxDepth - 1);
      if (found) return found;
    }
  }
  return null;
}

function findExistingJava25() {
  const exeName = process.platform === 'win32' ? 'java.exe' : 'java';
  const candidates = [];

  if (process.env.MC_JAVA_PATH) {
    candidates.push(process.env.MC_JAVA_PATH);
  }

  const localJre = findFileRecursive(JRE_DIR, exeName, 4);
  if (localJre) candidates.push(localJre);

  const sharedJre = findFileRecursive(SHARED_TEST_JRE_DIR, exeName, 4);
  if (sharedJre) candidates.push(sharedJre);

  if (process.env.JAVA_HOME) {
    candidates.push(path.join(process.env.JAVA_HOME, 'bin', exeName));
  }

  if (process.platform === 'win32') {
    const roots = [
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\Amazon Corretto',
      'C:\\Program Files\\Zulu',
    ];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          candidates.push(path.join(root, entry.name, 'bin', exeName));
        }
      }
    }
  }

  candidates.push('java');

  for (const cand of candidates) {
    if (cand !== 'java' && !fs.existsSync(cand)) continue;
    const major = getJavaMajorVersion(cand);
    if (major !== null && major >= 25) {
      return { javaPath: cand, major };
    }
  }
  return null;
}

export async function ensureJava25({ skipDownload = false } = {}) {
  const existing = findExistingJava25();
  if (existing) {
    console.log(`[setup] Using Java ${existing.major}: ${existing.javaPath}`);
    return existing.javaPath;
  }

  if (skipDownload) {
    throw new Error('Java 25+ not found locally and --skip-download was specified.');
  }

  const osMap = { win32: 'windows', linux: 'linux', darwin: 'mac' };
  const archMap = { x64: 'x64', arm64: 'aarch64' };
  const os = osMap[process.platform];
  const arch = archMap[process.arch];
  if (!os || !arch) {
    throw new Error(`Unsupported platform/arch for automatic JRE 25 download: ${process.platform}/${process.arch}`);
  }

  console.log(`[setup] Java 25+ not found locally. Downloading Eclipse Temurin 25 JRE (${os}/${arch})...`);
  const apiUrl = `https://api.adoptium.net/v3/assets/latest/25/hotspot?architecture=${arch}&image_type=jre&os=${os}&vendor=eclipse`;
  const payload = await fetchJson(apiUrl);
  const asset = Array.isArray(payload) ? payload[0] : payload;
  const pkg = asset?.binary?.package;
  if (!pkg?.link || !pkg?.name) {
    throw new Error(`Unexpected Adoptium API response: ${JSON.stringify(payload).slice(0, 300)}`);
  }

  ensureDir(DOWNLOADS_DIR);
  const archivePath = path.join(DOWNLOADS_DIR, pkg.name);
  await downloadFile(pkg.link, archivePath, pkg.checksum || null);

  fs.rmSync(JRE_DIR, { recursive: true, force: true });
  ensureDir(JRE_DIR);

  try {
    execFileSync('tar', ['-xf', archivePath, '-C', JRE_DIR], { stdio: 'inherit' });
  } catch (err) {
    if (process.platform === 'win32' && archivePath.endsWith('.zip')) {
      execFileSync(
        'powershell',
        ['-NoProfile', '-Command', `Expand-Archive -Path '${archivePath}' -DestinationPath '${JRE_DIR}' -Force`],
        { stdio: 'inherit' },
      );
    } else {
      throw err;
    }
  } finally {
    fs.rmSync(archivePath, { force: true });
  }

  const exeName = process.platform === 'win32' ? 'java.exe' : 'java';
  const extracted = findFileRecursive(JRE_DIR, exeName, 4);
  if (!extracted) {
    throw new Error(`Downloaded Temurin JRE 25 but failed to locate ${exeName} inside ${JRE_DIR}`);
  }
  const major = getJavaMajorVersion(extracted);
  if (!major || major < 25) {
    throw new Error(`Extracted Java at ${extracted} has unexpected version: ${major}`);
  }

  console.log(`[setup] Provisioned Java ${major}: ${extracted}`);
  return extracted;
}

export async function ensureViaProxy({ skipDownload = false } = {}) {
  ensureDir(VIAPROXY_DIR);
  const cache = loadVersionsCache();
  if (fs.existsSync(VIAPROXY_JAR_PATH) && fs.statSync(VIAPROXY_JAR_PATH).size > 1_000_000) {
    if (skipDownload || cache.viaproxy?.version) {
      console.log(`[setup] Using cached ViaProxy (${cache.viaproxy?.version ?? 'local'})`);
      return VIAPROXY_JAR_PATH;
    }
  }

  if (skipDownload) {
    throw new Error(`ViaProxy jar missing at ${VIAPROXY_JAR_PATH} and --skip-download was specified.`);
  }

  console.log('[setup] Querying GitHub releases for ViaProxy...');
  const release = await fetchJson('https://api.github.com/repos/ViaVersion/ViaProxy/releases/latest');
  const assets = Array.isArray(release?.assets) ? release.assets : [];

  const chosen =
    assets.find((a) => /^ViaProxy-[\d.]+\.jar$/i.test(a.name)) ||
    assets.find(
      (a) =>
        /^ViaProxy-.*\.jar$/i.test(a.name) &&
        !/(java8|sources|javadoc|natives)/i.test(a.name),
    );

  if (!chosen?.browser_download_url) {
    throw new Error(`No suitable ViaProxy JAR asset found in release ${release?.tag_name || 'latest'}`);
  }

  const sha256 =
    typeof chosen.digest === 'string' && chosen.digest.startsWith('sha256:')
      ? chosen.digest.slice('sha256:'.length)
      : null;

  console.log(`[setup] Downloading ${chosen.name} (${release.tag_name})...`);
  await downloadFile(chosen.browser_download_url, VIAPROXY_JAR_PATH, sha256);

  const updated = loadVersionsCache();
  updated.viaproxy = {
    version: release.tag_name || chosen.name,
    asset: chosen.name,
    sha256,
    downloadedAt: new Date().toISOString(),
  };
  saveVersionsCache(updated);
  return VIAPROXY_JAR_PATH;
}

export async function ensureFabric263({ skipDownload = false } = {}) {
  const { serverDir, modsDir } = getLoaderPaths('fabric');
  ensureDir(serverDir);
  ensureDir(modsDir);

  const launcherPath = path.join(serverDir, 'fabric-server-launch.jar');
  const fabricApiPath = path.join(modsDir, 'fabric-api.jar');
  const cache = loadVersionsCache();

  const hasLauncher = fs.existsSync(launcherPath) && fs.statSync(launcherPath).size > 50_000;
  const hasFabricApi = fs.existsSync(fabricApiPath) && fs.statSync(fabricApiPath).size > 100_000;

  if (hasLauncher && hasFabricApi && (skipDownload || cache.fabric?.mcVersion === MC_VERSION)) {
    console.log(
      `[setup] Using cached Fabric ${MC_VERSION} (loader ${cache.fabric?.loaderVersion ?? 'local'}, fabric-api ${cache.fabric?.fabricApiVersion ?? 'local'})`,
    );
    return {
      loader: 'fabric',
      version: cache.fabric?.loaderVersion || 'cached',
      fabricApiVersion: cache.fabric?.fabricApiVersion || 'cached',
      launcherJar: 'fabric-server-launch.jar',
    };
  }

  if (skipDownload) {
    throw new Error(`Fabric ${MC_VERSION} server/Fabric API missing under ${serverDir} and --skip-download was specified.`);
  }

  console.log(`[setup] Querying Fabric Meta API for Minecraft ${MC_VERSION}...`);
  const loaders = await fetchJson(`https://meta.fabricmc.net/v2/versions/loader/${MC_VERSION}`);
  if (!Array.isArray(loaders) || loaders.length === 0) {
    throw new Error(`No Fabric loader versions available for Minecraft ${MC_VERSION}`);
  }
  const chosenLoader = loaders.find((l) => l.loader?.stable)?.loader || loaders[0]?.loader;
  if (!chosenLoader?.version) {
    throw new Error(`Unexpected Fabric loader metadata response for ${MC_VERSION}`);
  }

  const installers = await fetchJson('https://meta.fabricmc.net/v2/versions/installer');
  if (!Array.isArray(installers) || installers.length === 0) {
    throw new Error('No Fabric installer versions available');
  }
  const chosenInstaller = installers.find((i) => i.stable) || installers[0];
  if (!chosenInstaller?.version) {
    throw new Error('Unexpected Fabric installer metadata response');
  }

  if (!hasLauncher || cache.fabric?.loaderVersion !== chosenLoader.version) {
    const serverJarUrl = `https://meta.fabricmc.net/v2/versions/loader/${MC_VERSION}/${encodeURIComponent(chosenLoader.version)}/${encodeURIComponent(chosenInstaller.version)}/server/jar`;
    console.log(
      `[setup] Downloading Fabric server launcher (MC ${MC_VERSION}, loader ${chosenLoader.version}, installer ${chosenInstaller.version})...`,
    );
    await downloadFile(serverJarUrl, launcherPath);
  }

  console.log(`[setup] Querying Modrinth for Fabric API (${MC_VERSION})...`);
  const modrinthUrl =
    `https://api.modrinth.com/v2/project/fabric-api/version?loaders=${encodeURIComponent('["fabric"]')}&game_versions=${encodeURIComponent(JSON.stringify([MC_VERSION]))}`;
  const apiVersions = await fetchJson(modrinthUrl);
  if (!Array.isArray(apiVersions) || apiVersions.length === 0) {
    throw new Error(`No Fabric API builds found on Modrinth for Minecraft ${MC_VERSION}`);
  }

  const chosenApi = apiVersions.find((v) => v.version_type === 'release') || apiVersions[0];
  const primaryFile = chosenApi.files?.find((f) => f.primary) || chosenApi.files?.[0];
  if (!primaryFile?.url) {
    throw new Error(`No downloadable Fabric API file found for ${chosenApi.version_number}`);
  }

  if (!hasFabricApi || cache.fabric?.fabricApiVersion !== chosenApi.version_number) {
    console.log(`[setup] Downloading Fabric API ${chosenApi.version_number}...`);
    await downloadFile(primaryFile.url, fabricApiPath, primaryFile.hashes?.sha256 || null);
  }

  const updated = loadVersionsCache();
  updated.fabric = {
    mcVersion: MC_VERSION,
    loaderVersion: chosenLoader.version,
    installerVersion: chosenInstaller.version,
    fabricApiVersion: chosenApi.version_number,
    downloadedAt: new Date().toISOString(),
  };
  saveVersionsCache(updated);

  return {
    loader: 'fabric',
    version: chosenLoader.version,
    fabricApiVersion: chosenApi.version_number,
    launcherJar: 'fabric-server-launch.jar',
  };
}

function compareNumericSegments(a, b) {
  const segsA = String(a).split(/[.-]/).map((p) => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : p));
  const segsB = String(b).split(/[.-]/).map((p) => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : p));
  const len = Math.max(segsA.length, segsB.length);
  for (let i = 0; i < len; i++) {
    const va = segsA[i] ?? 0;
    const vb = segsB[i] ?? 0;
    if (typeof va === 'number' && typeof vb === 'number') {
      if (va !== vb) return va - vb;
    } else if (String(va) !== String(vb)) {
      return String(va).localeCompare(String(vb));
    }
  }
  return 0;
}

function detectArgsLaunch(serverDir, argsRelPath, shimJarRelPath = null) {
  const argsAbs = argsRelPath ? path.join(serverDir, argsRelPath) : null;
  const shimAbs = shimJarRelPath ? path.join(serverDir, shimJarRelPath) : null;

  const runScriptName = process.platform === 'win32' ? 'run.bat' : 'run.sh';
  const runScriptPath = path.join(serverDir, runScriptName);
  if (fs.existsSync(runScriptPath)) {
    const scriptText = fs.readFileSync(runScriptPath, 'utf8');
    const shimMatch = scriptText.match(/-jar\s+(?:"?([^"\s]+-shim\.jar)"?)/i);
    if (shimMatch && fs.existsSync(path.join(serverDir, shimMatch[1]))) {
      return { mode: 'jar', launcherJar: shimMatch[1] };
    }
    const argsMatch = scriptText.match(/@(libraries[\\/][^\s"]+(?:win|unix)_args\.txt)/i);
    if (argsMatch && fs.existsSync(path.join(serverDir, argsMatch[1]))) {
      return { mode: 'args', argsFile: argsMatch[1] };
    }
  }

  if (argsAbs && fs.existsSync(argsAbs)) {
    return { mode: 'args', argsFile: argsRelPath };
  }
  if (shimAbs && fs.existsSync(shimAbs)) {
    return { mode: 'jar', launcherJar: shimJarRelPath };
  }
  return null;
}

export async function ensureNeoForge263({ skipDownload = false, javaPath } = {}) {
  const { serverDir, modsDir } = getLoaderPaths('neoforge');
  ensureDir(serverDir);
  ensureDir(modsDir);

  const argsName = process.platform === 'win32' ? 'win_args.txt' : 'unix_args.txt';
  const cache = loadVersionsCache();
  const cachedVer = cache.neoforge?.version;

  if (cachedVer) {
    const relArgs = path.join('libraries', 'net', 'neoforged', 'neoforge', cachedVer, argsName);
    const detected = detectArgsLaunch(serverDir, relArgs);
    if (detected && (skipDownload || cache.neoforge?.mcVersion === MC_VERSION)) {
      console.log(`[setup] Using cached NeoForge ${cachedVer}`);
      return { loader: 'neoforge', version: cachedVer, ...detected };
    }
  }

  if (skipDownload) {
    throw new Error(`NeoForge ${MC_VERSION} not installed under ${serverDir} and --skip-download was specified.`);
  }

  console.log(`[setup] Querying NeoForged Maven API for Minecraft ${MC_VERSION}...`);
  const payload = await fetchJson('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge');
  const allVersions = Array.isArray(payload?.versions) ? payload.versions : [];
  const matching = allVersions.filter((v) => v.startsWith(`${MC_VERSION}.`));
  if (matching.length === 0) {
    throw new Error(`No NeoForge versions found for Minecraft ${MC_VERSION}`);
  }

  const nonBeta = matching.filter((v) => !/beta|alpha|snapshot/i.test(v));
  const pool = nonBeta.length > 0 ? nonBeta : matching;
  pool.sort(compareNumericSegments);
  const chosenVer = pool[pool.length - 1];

  const relArgs = path.join('libraries', 'net', 'neoforged', 'neoforge', chosenVer, argsName);
  if (!fs.existsSync(path.join(serverDir, relArgs))) {
    ensureDir(DOWNLOADS_DIR);
    const installerName = `neoforge-${chosenVer}-installer.jar`;
    const installerPath = path.join(DOWNLOADS_DIR, installerName);
    const url = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${encodeURIComponent(chosenVer)}/${installerName}`;

    console.log(`[setup] Downloading NeoForge ${chosenVer} installer...`);
    await downloadFile(url, installerPath);

    console.log(`[setup] Running NeoForge ${chosenVer} --installServer...`);
    try {
      execFileSync(javaPath, ['-jar', installerPath, '--installServer'], {
        cwd: serverDir,
        stdio: 'inherit',
      });
    } finally {
      fs.rmSync(installerPath, { force: true });
    }
  }

  const detected = detectArgsLaunch(serverDir, relArgs);
  if (!detected) {
    throw new Error(`NeoForge ${chosenVer} --installServer completed, but failed to find ${relArgs} or run script launch args.`);
  }

  const updated = loadVersionsCache();
  updated.neoforge = {
    mcVersion: MC_VERSION,
    version: chosenVer,
    ...detected,
    installedAt: new Date().toISOString(),
  };
  saveVersionsCache(updated);

  return { loader: 'neoforge', version: chosenVer, ...detected };
}

export async function ensureForge263({ skipDownload = false, javaPath } = {}) {
  const { serverDir, modsDir } = getLoaderPaths('forge');
  ensureDir(serverDir);
  ensureDir(modsDir);

  const argsName = process.platform === 'win32' ? 'win_args.txt' : 'unix_args.txt';
  const cache = loadVersionsCache();
  const cachedFullVer = cache.forge?.fullVersion;

  if (cachedFullVer) {
    const relArgs = path.join('libraries', 'net', 'minecraftforge', 'forge', cachedFullVer, argsName);
    const shimRel = `forge-${cachedFullVer}-shim.jar`;
    const detected = detectArgsLaunch(serverDir, relArgs, shimRel);
    if (detected && (skipDownload || cache.forge?.mcVersion === MC_VERSION)) {
      console.log(`[setup] Using cached Forge ${cachedFullVer}`);
      return { loader: 'forge', version: cachedFullVer, ...detected };
    }
  }

  if (skipDownload) {
    throw new Error(`Forge ${MC_VERSION} not installed under ${serverDir} and --skip-download was specified.`);
  }

  console.log(`[setup] Querying Forge promotions for Minecraft ${MC_VERSION}...`);
  const promosPayload = await fetchJson('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
  const promos = promosPayload?.promos || {};
  const forgeVer = promos[`${MC_VERSION}-recommended`] || promos[`${MC_VERSION}-latest`];
  if (!forgeVer) {
    throw new Error(`No Forge build found in promotions_slim.json for Minecraft ${MC_VERSION}`);
  }

  const fullVer = `${MC_VERSION}-${forgeVer}`;
  const relArgs = path.join('libraries', 'net', 'minecraftforge', 'forge', fullVer, argsName);
  const shimRel = `forge-${fullVer}-shim.jar`;

  if (!detectArgsLaunch(serverDir, relArgs, shimRel)) {
    ensureDir(DOWNLOADS_DIR);
    const installerName = `forge-${fullVer}-installer.jar`;
    const installerPath = path.join(DOWNLOADS_DIR, installerName);
    const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${encodeURIComponent(fullVer)}/${installerName}`;

    console.log(`[setup] Downloading Forge ${fullVer} installer...`);
    await downloadFile(url, installerPath);

    console.log(`[setup] Running Forge ${fullVer} --installServer...`);
    try {
      execFileSync(javaPath, ['-jar', installerPath, '--installServer'], {
        cwd: serverDir,
        stdio: 'inherit',
      });
    } finally {
      fs.rmSync(installerPath, { force: true });
    }
  }

  const detected = detectArgsLaunch(serverDir, relArgs, shimRel);
  if (!detected) {
    throw new Error(`Forge ${fullVer} --installServer completed, but failed to detect ${shimRel} or ${relArgs}.`);
  }

  const updated = loadVersionsCache();
  updated.forge = {
    mcVersion: MC_VERSION,
    forgeVersion: forgeVer,
    fullVersion: fullVer,
    ...detected,
    installedAt: new Date().toISOString(),
  };
  saveVersionsCache(updated);

  return { loader: 'forge', version: fullVer, ...detected };
}

export function installModJar(loader, jarPath) {
  const { modsDir } = getLoaderPaths(loader);
  ensureDir(modsDir);

  for (const entry of fs.readdirSync(modsDir, { withFileTypes: true })) {
    if (entry.isFile() && /drinkingcraft.*\.jar$/i.test(entry.name)) {
      fs.rmSync(path.join(modsDir, entry.name), { force: true });
    }
  }

  const destPath = path.join(modsDir, path.basename(jarPath));
  fs.copyFileSync(jarPath, destPath);
  console.log(`[setup] Installed ${path.basename(jarPath)} into ${modsDir}`);
  return destPath;
}

export async function provisionLoader(loader, { skipDownload = false, jarPath } = {}) {
  ensureDir(RUNTIME_DIR);
  ensureDir(SERVERS_DIR);

  const javaPath = await ensureJava25({ skipDownload });
  const viaProxyPath = await ensureViaProxy({ skipDownload });

  let launchInfo;
  if (loader === 'fabric') {
    launchInfo = await ensureFabric263({ skipDownload });
  } else if (loader === 'neoforge') {
    launchInfo = await ensureNeoForge263({ skipDownload, javaPath });
  } else if (loader === 'forge') {
    launchInfo = await ensureForge263({ skipDownload, javaPath });
  } else {
    throw new Error(`Unsupported loader: ${loader}`);
  }

  const installedJar = installModJar(loader, jarPath);
  return { javaPath, viaProxyPath, launchInfo, installedJar };
}
