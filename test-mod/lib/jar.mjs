import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { JAR_INSPECT_DIR } from './config.mjs';

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function parseJsonSafe(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractTomlField(raw, field) {
  if (!raw) return null;
  const match = raw.match(new RegExp(`\\b${field}\\s*=\\s*['"]([^'"]+)['"]`));
  return match ? match[1] : null;
}

export function extractJar(jarPath, destDir = JAR_INSPECT_DIR) {
  if (!fs.existsSync(jarPath)) {
    throw new Error(`JAR file does not exist: ${jarPath}`);
  }

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  try {
    execFileSync('tar', ['-xf', jarPath, '-C', destDir], { stdio: 'pipe' });
  } catch (tarErr) {
    if (process.platform === 'win32') {
      const escapedJar = jarPath.replace(/'/g, "''");
      const escapedDest = destDir.replace(/'/g, "''");
      const psCmd =
        "Add-Type -AssemblyName System.IO.Compression.FileSystem; " +
        `[System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedJar}', '${escapedDest}')`;
      execFileSync('powershell', ['-NoProfile', '-Command', psCmd], { stdio: 'pipe' });
    } else {
      throw tarErr;
    }
  }

  return destDir;
}

export function inspectModJar(jarPath, destDir = JAR_INSPECT_DIR) {
  const inspectDir = extractJar(jarPath, destDir);

  const firstJoinPath = path.join(inspectDir, 'data', 'bebida', 'function', 'first_join_actions.mcfunction');
  const firstJoinText = readTextIfExists(firstJoinPath);
  if (!firstJoinText) {
    throw new Error(`Missing data/bebida/function/first_join_actions.mcfunction inside ${path.basename(jarPath)}`);
  }

  let lang = null;
  if (firstJoinText.includes('Take a shot')) {
    lang = 'en';
  } else if (firstJoinText.includes('Dê um shot')) {
    lang = 'pt';
  } else {
    throw new Error(
      `Could not detect language from first_join_actions.mcfunction in ${path.basename(jarPath)}. Pass --lang en|pt explicitly.`,
    );
  }

  const fabricModRaw = readTextIfExists(path.join(inspectDir, 'fabric.mod.json'));
  const quiltModRaw = readTextIfExists(path.join(inspectDir, 'quilt.mod.json'));
  const forgeTomlRaw = readTextIfExists(path.join(inspectDir, 'META-INF', 'mods.toml'));
  const neoforgeTomlRaw = readTextIfExists(path.join(inspectDir, 'META-INF', 'neoforge.mods.toml'));

  const fabricMod = parseJsonSafe(fabricModRaw);
  const quiltMod = parseJsonSafe(quiltModRaw);

  const modId =
    fabricMod?.id ||
    quiltMod?.quilt_loader?.id ||
    extractTomlField(neoforgeTomlRaw, 'modId') ||
    extractTomlField(forgeTomlRaw, 'modId') ||
    path.basename(jarPath, '.jar');

  const modVersion =
    fabricMod?.version ||
    quiltMod?.quilt_loader?.version ||
    extractTomlField(neoforgeTomlRaw, 'version') ||
    extractTomlField(forgeTomlRaw, 'version') ||
    'unknown';

  return {
    jarPath,
    jarName: path.basename(jarPath),
    inspectDir,
    lang,
    modId,
    modVersion,
    metadata: {
      fabricModRaw,
      fabricMod,
      quiltModRaw,
      quiltMod,
      forgeTomlRaw,
      neoforgeTomlRaw,
    },
  };
}
