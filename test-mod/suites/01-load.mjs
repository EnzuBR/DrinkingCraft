import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXPECTED_OBJECTIVES,
  EXPECTED_ADVANCEMENTS,
} from '../lib/config.mjs';

function walkFiles(dir, extFilter) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, extFilter));
    } else if (!extFilter || entry.name.endsWith(extFilter)) {
      results.push(full);
    }
  }
  return results;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function registerSuite01(suite, test) {
  suite('01 - Mod JAR Checks & Modded Server Load (MC 26.3)', () => {
    test('Modrinth mod metadata (Fabric/Quilt/Forge/NeoForge) is valid inside JAR', ({ jarInfo }) => {
      const { inspectDir, metadata } = jarInfo;

      assert.ok(metadata.fabricModRaw, 'Missing fabric.mod.json inside JAR');
      assert.ok(metadata.fabricMod, 'Invalid JSON in fabric.mod.json');
      assert.ok(metadata.fabricMod.id, 'fabric.mod.json missing "id"');
      assert.ok(metadata.fabricMod.version, 'fabric.mod.json missing "version"');
      assert.ok(metadata.fabricMod.depends && typeof metadata.fabricMod.depends === 'object', 'fabric.mod.json missing "depends"');

      assert.ok(metadata.quiltModRaw, 'Missing quilt.mod.json inside JAR');
      assert.ok(metadata.quiltMod, 'Invalid JSON in quilt.mod.json');

      assert.ok(metadata.forgeTomlRaw, 'Missing META-INF/mods.toml inside JAR');
      assert.match(metadata.forgeTomlRaw, /\bmodId\s*=/, 'META-INF/mods.toml missing modId');
      assert.match(metadata.forgeTomlRaw, /\bmodLoader\s*=/, 'META-INF/mods.toml missing modLoader');

      assert.ok(metadata.neoforgeTomlRaw, 'Missing META-INF/neoforge.mods.toml inside JAR');
      assert.match(metadata.neoforgeTomlRaw, /\bmodId\s*=/, 'META-INF/neoforge.mods.toml missing modId');
      assert.match(metadata.neoforgeTomlRaw, /\bmodLoader\s*=/, 'META-INF/neoforge.mods.toml missing modLoader');

      assert.ok(fs.existsSync(path.join(inspectDir, 'data', 'minecraft', 'tags', 'function', 'load.json')));
      assert.ok(fs.existsSync(path.join(inspectDir, 'data', 'minecraft', 'tags', 'function', 'tick.json')));
    });

    test('pack.mcmeta targets format 121.0 and all JSON files inside JAR are valid', ({ jarInfo }) => {
      const { inspectDir } = jarInfo;
      const mcmetaPath = path.join(inspectDir, 'pack.mcmeta');
      const mcmeta = JSON.parse(fs.readFileSync(mcmetaPath, 'utf8'));
      assert.deepEqual(mcmeta.pack?.min_format, [121, 0], 'pack.min_format must be [121, 0]');
      assert.equal(mcmeta.pack?.max_format, 121, 'pack.max_format must be 121');

      const jsonFiles = walkFiles(path.join(inspectDir, 'data'), '.json');
      assert.ok(jsonFiles.length > 0, 'Expected JSON files under data/ inside JAR');
      for (const file of jsonFiles) {
        assert.doesNotThrow(() => {
          JSON.parse(fs.readFileSync(file, 'utf8'));
        }, `Invalid JSON in ${path.relative(inspectDir, file)}`);
      }
    });

    test('MC 26.3 schemas & mcfunction invariants inside JAR (no "condition":, no raw lists, no @p, no playsound @a)', ({ jarInfo }) => {
      const { inspectDir } = jarInfo;
      const predFiles = walkFiles(path.join(inspectDir, 'data', 'bebida', 'predicate'), '.json');
      const advFiles = walkFiles(path.join(inspectDir, 'data', 'bebida', 'advancement'), '.json');

      for (const file of [...predFiles, ...advFiles]) {
        const raw = fs.readFileSync(file, 'utf8');
        assert.equal(/"condition"\s*:/.test(raw), false, `Forbidden "condition": in ${path.relative(inspectDir, file)}`);
      }
      for (const file of advFiles) {
        const raw = fs.readFileSync(file, 'utf8');
        assert.equal(/"(player|entity)"\s*:\s*\[/.test(raw), false, `Forbidden raw list in player/entity in ${path.relative(inspectDir, file)}`);
      }

      const mcfuncs = walkFiles(path.join(inspectDir, 'data', 'bebida', 'function'), '.mcfunction');
      assert.ok(mcfuncs.length > 0, 'Expected .mcfunction files inside JAR');
      for (const file of mcfuncs) {
        const raw = fs.readFileSync(file, 'utf8');
        assert.equal(/@p\b/.test(raw), false, `Forbidden @p selector in ${path.relative(inspectDir, file)}`);
        assert.equal(/playsound .* player @a\b/.test(raw), false, `Forbidden non-repositioned playsound @a in ${path.relative(inspectDir, file)}`);
      }
    });

    test('1:1 parity inside JAR between .load.mcfunction, advancements, and uninstall.mcfunction', ({ jarInfo }) => {
      const { inspectDir } = jarInfo;
      const loadRaw = fs.readFileSync(path.join(inspectDir, 'data', 'bebida', 'function', '.load.mcfunction'), 'utf8');
      const uninstallRaw = fs.readFileSync(path.join(inspectDir, 'data', 'bebida', 'function', 'uninstall.mcfunction'), 'utf8');

      const loadObjs = [...loadRaw.matchAll(/^scoreboard objectives add (\S+)/gm)].map((m) => m[1]).sort();
      const uninstObjs = [...uninstallRaw.matchAll(/^scoreboard objectives remove (\S+)/gm)].map((m) => m[1]).sort();
      const expectedObjs = [...EXPECTED_OBJECTIVES].sort();

      assert.deepEqual(loadObjs, expectedObjs, '.load.mcfunction objectives mismatch expected list');
      assert.deepEqual(uninstObjs, loadObjs, 'uninstall.mcfunction objectives must match .load.mcfunction 1:1');

      const advFiles = walkFiles(path.join(inspectDir, 'data', 'bebida', 'advancement'), '.json')
        .map((f) => path.basename(f, '.json'))
        .sort();
      const uninstAdvs = [...uninstallRaw.matchAll(/^advancement revoke @a only bebida:(\S+)/gm)].map((m) => m[1]).sort();
      const expectedAdvs = [...EXPECTED_ADVANCEMENTS].sort();

      assert.deepEqual(advFiles, expectedAdvs, 'Advancement files mismatch expected list');
      assert.deepEqual(uninstAdvs, advFiles, 'uninstall.mcfunction advancements must match advancement/*.json 1:1');
      assert.match(uninstallRaw, /^tag @a remove init\s*$/m, 'uninstall.mcfunction must remove init tag');
    });

    test('Modded server booted from mods/ with zero datapack/mod errors and empty world/datapacks', async ({ server, loader, jarInfo }) => {
      const dpDir = server.paths.datapacksDir;
      if (fs.existsSync(dpDir)) {
        const entries = fs.readdirSync(dpDir);
        assert.deepEqual(entries, [], `Expected empty world/datapacks (mod-only load), found: ${entries.join(', ')}`);
      }

      const errors = server.getDatapackErrors(0);
      assert.deepEqual(errors, [], `Mod/datapack errors found in ${loader} log:\n${errors.join('\n')}`);

      const dpList = await server.cmd('datapack list enabled');
      assert.equal(/file\/DrinkingCraft/i.test(dpList), false, `Did not expect file/DrinkingCraft in datapack list: ${dpList}`);

      const modIdEsc = escapeRegExp(jarInfo.modId);
      const packPattern =
        loader === 'fabric'
          ? new RegExp(`\\[(?:fabric|(?:mod[:/])?${modIdEsc})(?:\\s*\\([^)]*\\))?\\]`, 'i')
          : loader === 'neoforge'
            ? new RegExp(`\\[(?:mod_data|(?:mod[:/])?${modIdEsc})(?:\\s*\\([^)]*\\))?\\]`, 'i')
            : new RegExp(`\\[(?:mod[:/])?${modIdEsc}(?:\\s*\\([^)]*\\))?\\]`, 'i');
      assert.match(dpList, packPattern, `Expected mod datapack (${loader} / ${jarInfo.modId}) enabled in: ${dpList}`);
      assert.equal(
        server.getLogText().includes(jarInfo.modId),
        true,
        `Expected ${loader} boot logs to reference loaded mod ID "${jarInfo.modId}"`,
      );
    });

    test('All 30 expected scoreboard objectives are registered on server', async ({ server }) => {
      const listOut = await server.cmd('scoreboard objectives list');
      assert.match(listOut, /There are 30 objective\(s\):/, `Expected 30 objectives, got: ${listOut}`);
      for (const obj of EXPECTED_OBJECTIVES) {
        const res = await server.cmd(`scoreboard players get __probe__ ${obj}`);
        assert.match(res, /none is set|has -?\d+/i, `Objective "${obj}" is not registered on server: ${res}`);
      }
    });
  });
}
