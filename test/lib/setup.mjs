import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  REPO_ROOT,
  RUNTIME_DIR,
  DOWNLOADS_DIR,
  JRE_DIR,
  SERVER_DIR,
  PLUGINS_DIR,
  DATAPACK_DEST,
  PAPER_VERSION,
  PAPER_JAR_PATH,
  VERSIONS_CACHE_PATH,
  USER_AGENT,
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

  const cachedJre = findFileRecursive(JRE_DIR, exeName, 4);
  if (cachedJre) candidates.push(cachedJre);

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

export async function ensurePaper263({ skipDownload = false } = {}) {
  const cache = loadVersionsCache();
  if (fs.existsSync(PAPER_JAR_PATH) && fs.statSync(PAPER_JAR_PATH).size > 1_000_000) {
    if (skipDownload || cache.paper?.version === PAPER_VERSION) {
      console.log(`[setup] Using cached Paper ${PAPER_VERSION} (build ${cache.paper?.build ?? 'local'})`);
      return PAPER_JAR_PATH;
    }
  }

  if (skipDownload) {
    throw new Error(`Paper ${PAPER_VERSION} jar missing at ${PAPER_JAR_PATH} and --skip-download was specified.`);
  }

  console.log(`[setup] Querying PaperMC Fill v3 for Paper ${PAPER_VERSION}...`);
  const buildsUrl = `https://fill.papermc.io/v3/projects/paper/versions/${PAPER_VERSION}/builds`;
  const data = await fetchJson(buildsUrl);
  const builds = Array.isArray(data) ? data : data?.builds;
  if (!Array.isArray(builds) || builds.length === 0) {
    throw new Error(`No Paper builds found for Minecraft ${PAPER_VERSION}`);
  }

  const sorted = [...builds].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  const chosen = sorted.find((b) => b.channel === 'STABLE') || sorted[0];
  const dl = chosen?.downloads?.['server:default'];
  if (!dl?.url) {
    throw new Error(`No server:default download found in Paper build ${chosen?.id}`);
  }

  console.log(`[setup] Downloading Paper ${PAPER_VERSION} build ${chosen.id} (${chosen.channel})...`);
  await downloadFile(dl.url, PAPER_JAR_PATH, dl.checksums?.sha256 || null);

  cache.paper = {
    version: PAPER_VERSION,
    build: chosen.id,
    channel: chosen.channel,
    sha256: dl.checksums?.sha256 || null,
    downloadedAt: new Date().toISOString(),
  };
  saveVersionsCache(cache);
  return PAPER_JAR_PATH;
}

async function fetchHangarPaperPlugin(projectName) {
  const url = `https://hangar.papermc.io/api/v1/projects/ViaVersion/${projectName}/versions?limit=15&platform=PAPER`;
  const data = await fetchJson(url);
  const results = data?.result;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`No Hangar versions found for ${projectName}`);
  }

  const chosen =
    results.find((v) => v.channel?.name === 'Release' && v.platforms?.PAPER) ||
    results.find((v) => v.platforms?.PAPER);
  if (!chosen) {
    throw new Error(`No PAPER release found on Hangar for ${projectName}`);
  }

  const downloadUrl =
    chosen.platforms.PAPER.downloadUrl ||
    chosen.platforms.PAPER.externalUrl ||
    `https://hangar.papermc.io/api/v1/projects/ViaVersion/${projectName}/versions/${encodeURIComponent(chosen.name)}/PAPER/download`;
  const sha256 = chosen.fileInfo?.sha256Hash || null;
  return { version: chosen.name, downloadUrl, sha256, source: 'hangar' };
}

async function fetchModrinthPaperPlugin(slug) {
  const loaders = encodeURIComponent('["paper"]');
  const url = `https://api.modrinth.com/v2/project/${slug}/version?loaders=${loaders}`;
  const versions = await fetchJson(url);
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error(`No Modrinth versions found for ${slug}`);
  }
  const chosen = versions.find((v) => v.version_type === 'release') || versions[0];
  const file = chosen.files?.find((f) => f.primary) || chosen.files?.[0];
  if (!file?.url) {
    throw new Error(`No downloadable file on Modrinth for ${slug} ${chosen.version_number}`);
  }
  return {
    version: chosen.version_number,
    downloadUrl: file.url,
    sha256: file.hashes?.sha256 || null,
    source: 'modrinth',
  };
}

async function ensureSinglePlugin({ name, slug, cacheKey, destPath, skipDownload }) {
  const cache = loadVersionsCache();
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100_000) {
    if (skipDownload || cache[cacheKey]?.version) {
      console.log(`[setup] Using cached ${name} (${cache[cacheKey]?.version ?? 'local'})`);
      return destPath;
    }
  }

  if (skipDownload) {
    throw new Error(`Plugin ${name} missing at ${destPath} and --skip-download was specified.`);
  }

  let info;
  try {
    info = await fetchHangarPaperPlugin(name);
  } catch (hangarErr) {
    console.warn(`[setup] Hangar lookup failed for ${name} (${hangarErr.message}), trying Modrinth...`);
    info = await fetchModrinthPaperPlugin(slug);
  }

  console.log(`[setup] Downloading ${name} ${info.version} from ${info.source}...`);
  await downloadFile(info.downloadUrl, destPath, info.sha256);

  const updated = loadVersionsCache();
  updated[cacheKey] = {
    version: info.version,
    source: info.source,
    sha256: info.sha256,
    downloadedAt: new Date().toISOString(),
  };
  saveVersionsCache(updated);
  return destPath;
}

export async function ensureViaPlugins({ skipDownload = false } = {}) {
  ensureDir(PLUGINS_DIR);
  const viaVersionPath = await ensureSinglePlugin({
    name: 'ViaVersion',
    slug: 'viaversion',
    cacheKey: 'viaversion',
    destPath: path.join(PLUGINS_DIR, 'ViaVersion.jar'),
    skipDownload,
  });
  const viaBackwardsPath = await ensureSinglePlugin({
    name: 'ViaBackwards',
    slug: 'viabackwards',
    cacheKey: 'viabackwards',
    destPath: path.join(PLUGINS_DIR, 'ViaBackwards.jar'),
    skipDownload,
  });
  return { viaVersionPath, viaBackwardsPath };
}

export function syncDatapack() {
  const packMcmetaSrc = path.join(REPO_ROOT, 'pack.mcmeta');
  const dataSrc = path.join(REPO_ROOT, 'data');

  if (!fs.existsSync(packMcmetaSrc) || !fs.existsSync(dataSrc)) {
    throw new Error(`Datapack root incomplete at ${REPO_ROOT}`);
  }

  fs.rmSync(DATAPACK_DEST, { recursive: true, force: true });
  ensureDir(DATAPACK_DEST);
  fs.cpSync(packMcmetaSrc, path.join(DATAPACK_DEST, 'pack.mcmeta'));
  fs.cpSync(dataSrc, path.join(DATAPACK_DEST, 'data'), { recursive: true });
  console.log(`[setup] Synced datapack to ${DATAPACK_DEST}`);
}

export async function provisionEnvironment(opts = {}) {
  ensureDir(RUNTIME_DIR);
  ensureDir(SERVER_DIR);
  const javaPath = await ensureJava25(opts);
  const paperJar = await ensurePaper263(opts);
  const plugins = await ensureViaPlugins(opts);
  return { javaPath, paperJar, plugins };
}
