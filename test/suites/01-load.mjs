import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
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

export function registerSuite01(suite, test) {
  suite('01 - Static Checks & Server Load (MC 26.3)', () => {
    test('pack.mcmeta targets format 121.0 and all JSON files are valid', () => {
      const mcmetaPath = path.join(REPO_ROOT, 'pack.mcmeta');
      const mcmeta = JSON.parse(fs.readFileSync(mcmetaPath, 'utf8'));
      assert.deepEqual(mcmeta.pack?.min_format, [121, 0], 'pack.min_format must be [121, 0]');
      assert.equal(mcmeta.pack?.max_format, 121, 'pack.max_format must be 121');

      const jsonFiles = walkFiles(path.join(REPO_ROOT, 'data'), '.json');
      assert.ok(jsonFiles.length > 0, 'Expected JSON files under data/');
      for (const file of jsonFiles) {
        assert.doesNotThrow(() => {
          JSON.parse(fs.readFileSync(file, 'utf8'));
        }, `Invalid JSON in ${path.relative(REPO_ROOT, file)}`);
      }
    });

    test('MC 26.3 schemas & mcfunction invariants (no "condition":, no raw lists, no @p, no playsound @a)', () => {
      const predFiles = walkFiles(path.join(REPO_ROOT, 'data', 'bebida', 'predicate'), '.json');
      const advFiles = walkFiles(path.join(REPO_ROOT, 'data', 'bebida', 'advancement'), '.json');

      for (const file of [...predFiles, ...advFiles]) {
        const raw = fs.readFileSync(file, 'utf8');
        assert.equal(/"condition"\s*:/.test(raw), false, `Forbidden "condition": in ${path.relative(REPO_ROOT, file)}`);
      }
      for (const file of advFiles) {
        const raw = fs.readFileSync(file, 'utf8');
        assert.equal(/"(player|entity)"\s*:\s*\[/.test(raw), false, `Forbidden raw list in player/entity in ${path.relative(REPO_ROOT, file)}`);
      }

      const mcfuncs = walkFiles(path.join(REPO_ROOT, 'data', 'bebida', 'function'), '.mcfunction');
      assert.ok(mcfuncs.length > 0, 'Expected .mcfunction files');
      for (const file of mcfuncs) {
        const raw = fs.readFileSync(file, 'utf8');
        assert.equal(/@p\b/.test(raw), false, `Forbidden @p selector in ${path.relative(REPO_ROOT, file)}`);
        assert.equal(/playsound .* player @a\b/.test(raw), false, `Forbidden non-repositioned playsound @a in ${path.relative(REPO_ROOT, file)}`);
      }
    });

    test('1:1 parity between .load.mcfunction, advancements, and uninstall.mcfunction', () => {
      const loadRaw = fs.readFileSync(path.join(REPO_ROOT, 'data', 'bebida', 'function', '.load.mcfunction'), 'utf8');
      const uninstallRaw = fs.readFileSync(path.join(REPO_ROOT, 'data', 'bebida', 'function', 'uninstall.mcfunction'), 'utf8');

      const loadObjs = [...loadRaw.matchAll(/^scoreboard objectives add (\S+)/gm)].map((m) => m[1]).sort();
      const uninstObjs = [...uninstallRaw.matchAll(/^scoreboard objectives remove (\S+)/gm)].map((m) => m[1]).sort();
      const expectedObjs = [...EXPECTED_OBJECTIVES].sort();

      assert.deepEqual(loadObjs, expectedObjs, '.load.mcfunction objectives mismatch expected list');
      assert.deepEqual(uninstObjs, loadObjs, 'uninstall.mcfunction objectives must match .load.mcfunction 1:1');

      const advFiles = walkFiles(path.join(REPO_ROOT, 'data', 'bebida', 'advancement'), '.json')
        .map((f) => path.basename(f, '.json'))
        .sort();
      const uninstAdvs = [...uninstallRaw.matchAll(/^advancement revoke @a only bebida:(\S+)/gm)].map((m) => m[1]).sort();
      const expectedAdvs = [...EXPECTED_ADVANCEMENTS].sort();

      assert.deepEqual(advFiles, expectedAdvs, 'Advancement files mismatch expected list');
      assert.deepEqual(uninstAdvs, advFiles, 'uninstall.mcfunction advancements must match advancement/*.json 1:1');
      assert.match(uninstallRaw, /^tag @a remove init\s*$/m, 'uninstall.mcfunction must remove init tag');
    });

    test('Paper 26.3 booted with zero datapack errors and DrinkingCraft enabled', async ({ server }) => {
      const errors = server.getDatapackErrors(0);
      assert.deepEqual(errors, [], `Datapack errors found in server log:\n${errors.join('\n')}`);

      const dpList = await server.cmd('datapack list enabled');
      assert.match(
        dpList,
        /There are \d+ data pack\(s\) enabled:.*\[file\/DrinkingCraft(?:\s*\([^)]*\))?\]/s,
        `DrinkingCraft not enabled in datapack list: ${dpList}`,
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
