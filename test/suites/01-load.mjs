import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
  EXPECTED_OBJECTIVES,
  EXPECTED_ADVANCEMENTS,
  EXPECTED_TICK_FUNCTIONS,
  EXPECTED_PREDICATES,
  EXPECTED_ACTION_SPECS,
  MINING_ORBITS,
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

    test('Entrypoint tags, .tick.mcfunction, advancements, predicates, and #bebida:passivos schema', () => {
      const fnRoot = path.join(REPO_ROOT, 'data', 'bebida', 'function');

      const loadTag = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'data', 'minecraft', 'tags', 'function', 'load.json'), 'utf8'),
      );
      assert.deepEqual(loadTag, { values: ['bebida:.load'] }, 'minecraft:load tag must point only to bebida:.load');

      const tickTag = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'data', 'minecraft', 'tags', 'function', 'tick.json'), 'utf8'),
      );
      assert.deepEqual(tickTag, { values: ['bebida:.tick'] }, 'minecraft:tick tag must point only to bebida:.tick');

      const tickRaw = fs.readFileSync(path.join(fnRoot, '.tick.mcfunction'), 'utf8');
      const tickCalls = [...tickRaw.matchAll(/^function bebida:(\S+)\s*$/gm)].map((m) => m[1]);
      assert.deepEqual(tickCalls, EXPECTED_TICK_FUNCTIONS, '.tick.mcfunction function call list mismatch');
      for (const fn of tickCalls) {
        assert.equal(fs.existsSync(path.join(fnRoot, `${fn}.mcfunction`)), true, `Missing tick target bebida:${fn}`);
      }

      // Advancements audit
      const advDir = path.join(REPO_ROOT, 'data', 'bebida', 'advancement');
      for (const advName of EXPECTED_ADVANCEMENTS) {
        const adv = JSON.parse(fs.readFileSync(path.join(advDir, `${advName}.json`), 'utf8'));
        assert.equal(adv.display, undefined, `${advName}.json must be hidden (no display)`);
        assert.equal(adv.parent, undefined, `${advName}.json must have no parent`);
        assert.equal(adv.sends_telemetry_event, false, `${advName}.json must set sends_telemetry_event=false`);
        assert.equal(adv.rewards?.function, `bebida:${advName}`, `${advName}.json reward function mismatch`);
        assert.equal(fs.existsSync(path.join(fnRoot, `${advName}.mcfunction`)), true, `Missing reward function bebida:${advName}`);

        const criteriaKeys = Object.keys(adv.criteria || {}).sort();
        const reqKeys = [...new Set((adv.requirements || []).flat())].sort();
        assert.ok(criteriaKeys.length > 0, `${advName}.json must define criteria`);
        assert.deepEqual(reqKeys, criteriaKeys, `${advName}.json requirements must match criteria 1:1`);
      }

      // Predicates audit
      const predDir = path.join(REPO_ROOT, 'data', 'bebida', 'predicate');
      const actualPredNames = walkFiles(predDir, '.json').map((f) => path.basename(f, '.json')).sort();
      assert.deepEqual(actualPredNames, Object.keys(EXPECTED_PREDICATES).sort(), 'Predicate file list mismatch');

      for (const [predName, expected] of Object.entries(EXPECTED_PREDICATES)) {
        const pred = JSON.parse(fs.readFileSync(path.join(predDir, `${predName}.json`), 'utf8'));
        assert.equal(pred.type, expected.type, `${predName}.json type mismatch`);
        if (expected.chance !== undefined) {
          assert.equal(pred.chance, expected.chance, `${predName}.json chance mismatch`);
        }
        if (predName === 'silk_touch') {
          const ench = pred.predicate?.['minecraft:equipment']?.mainhand?.predicates?.['minecraft:enchantments'];
          assert.ok(Array.isArray(ench) && ench.some((e) => e.enchantments === 'minecraft:silk_touch'), 'silk_touch.json must check mainhand minecraft:silk_touch');
        }
      }

      // Entity type tag audit (#bebida:passivos)
      const passivosTag = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'data', 'bebida', 'tags', 'entity_type', 'passivos.json'), 'utf8'),
      );
      assert.ok(Array.isArray(passivosTag.values) && passivosTag.values.length >= 35, 'passivos.json values should not be empty');
      for (const mobId of ['minecraft:happy_ghast', 'minecraft:copper_golem', 'minecraft:nautilus', 'minecraft:sulfur_cube']) {
        const entry = passivosTag.values.find((v) => typeof v === 'object' && v.id === mobId);
        assert.ok(entry && entry.required === false, `Optional 26.3 mob ${mobId} must have required: false in passivos.json`);
      }
    });

    test('All 28 *_actions*.mcfunction & controllers conform to Design System, $global locks, and anti-sticky-subtitle rules', () => {
      const fnRoot = path.join(REPO_ROOT, 'data', 'bebida', 'function');
      const actualActionFiles = walkFiles(fnRoot, '.mcfunction')
        .map((f) => path.basename(f, '.mcfunction'))
        .filter((name) => /_actions\d*$/.test(name))
        .sort();
      const expectedActionNames = EXPECTED_ACTION_SPECS.map((s) => s.name).sort();
      assert.deepEqual(actualActionFiles, expectedActionNames, 'Action .mcfunction file list mismatch');

      for (const spec of EXPECTED_ACTION_SPECS) {
        const raw = fs.readFileSync(path.join(fnRoot, `${spec.name}.mcfunction`), 'utf8');
        const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

        const timesCmd = `title ${spec.target} times 10t 60t 20t`;
        const timesIdx = lines.indexOf(timesCmd);
        assert.ok(timesIdx !== -1, `${spec.name}: missing "${timesCmd}"`);

        const titlePrefix = `title ${spec.target} title `;
        const titleIdx = lines.findIndex((l) => l.startsWith(titlePrefix));
        assert.ok(titleIdx !== -1, `${spec.name}: missing "${titlePrefix}..."`);
        assert.ok(timesIdx < titleIdx, `${spec.name}: title times must appear before title`);

        const titlePayload = JSON.parse(lines[titleIdx].slice(titlePrefix.length));
        assert.deepEqual(titlePayload, { text: spec.title, color: 'gold', bold: true }, `${spec.name}: title JSON mismatch`);

        if (spec.scope === 'everyone_except') {
          const subAllIdx = lines.findIndex((l) => l.startsWith('title @a subtitle [{"text":"Menos "'));
          const subSelfIdx = lines.indexOf('title @s subtitle {"text":"Menos tú","color":"white","bold":false}');
          assert.ok(subAllIdx !== -1, `${spec.name}: missing @a "Menos <selector>" subtitle`);
          assert.ok(subSelfIdx !== -1, `${spec.name}: missing @s "Menos tú" subtitle`);
          assert.ok(subAllIdx < subSelfIdx && subSelfIdx < titleIdx, `${spec.name}: "Menos tú" order must be @a subtitle -> @s subtitle -> @a title`);
        } else if (spec.subtitle === '') {
          const emptySubCmd = `title ${spec.target} subtitle {"text":""}`;
          const subIdx = lines.indexOf(emptySubCmd);
          assert.ok(subIdx !== -1 && subIdx < titleIdx, `${spec.name}: must clear sticky subtitle with "${emptySubCmd}" before title`);
        } else {
          const subCmd = `title ${spec.target} subtitle {"text":"${spec.subtitle}","color":"white","bold":false}`;
          const subIdx = lines.indexOf(subCmd);
          assert.ok(subIdx !== -1 && subIdx < titleIdx, `${spec.name}: missing expected subtitle "${subCmd}" before title`);
        }

        const expectedSoundCmd =
          spec.target === '@a'
            ? `execute as @a at @s run playsound minecraft:${spec.sound} player @s ~ ~ ~ 1 1`
            : `playsound minecraft:${spec.sound} player @s ~ ~ ~ 1 1`;
        assert.ok(lines.includes(expectedSoundCmd), `${spec.name}: expected sound command "${expectedSoundCmd}"`);

        const tellrawLine = lines.find((l) => l.startsWith('tellraw @a '));
        assert.ok(tellrawLine, `${spec.name}: missing tellraw @a`);
        const chatArr = JSON.parse(tellrawLine.slice('tellraw @a '.length));
        assert.ok(Array.isArray(chatArr) && chatArr.length >= 2, `${spec.name}: tellraw must be a non-empty JSON array`);
        assert.deepEqual(chatArr[0], { text: '<DrinkingCraft> ', color: 'gold', bold: true }, `${spec.name}: tellraw prefix mismatch`);
        for (let i = 1; i < chatArr.length; i++) {
          assert.equal(chatArr[i].color, spec.chatColor, `${spec.name}: tellraw part[${i}] color mismatch`);
          assert.equal(chatArr[i].bold, false, `${spec.name}: tellraw part[${i}] must have bold=false`);
        }

        // Verify $global lock parity
        const globalSets = [...raw.matchAll(/^scoreboard players set \$global (\S+) 0\s*$/gm)].map((m) => m[1]);
        if (spec.globalObj) {
          assert.deepEqual(globalSets, [spec.globalObj], `${spec.name}: must set $global ${spec.globalObj} = 0 (and nothing else)`);
        } else {
          assert.deepEqual(globalSets, [], `${spec.name}: must not set any $global score`);
        }

        // Verify score resets & init tag
        for (const obj of spec.resetsScores) {
          assert.ok(lines.includes(`scoreboard players reset @s ${obj}`), `${spec.name}: must reset @s ${obj}`);
        }
        if (spec.addsTag) {
          assert.ok(lines.includes(`tag @s add ${spec.addsTag}`), `${spec.name}: must add tag ${spec.addsTag}`);
        }

        // Verify controller wiring
        const controllerRaw = fs.readFileSync(path.join(fnRoot, spec.controller), 'utf8');
        assert.ok(
          controllerRaw.includes(`function bebida:${spec.name}`),
          `Controller ${spec.controller} must invoke function bebida:${spec.name}`,
        );
        if (spec.globalObj) {
          assert.ok(
            controllerRaw.includes(`unless score $global ${spec.globalObj} = $global ${spec.globalObj}`),
            `Controller ${spec.controller} must guard with "unless score $global ${spec.globalObj} = $global ${spec.globalObj}"`,
          );
        }
      }

      // Crafting branch order invariant
      const craftingRaw = fs.readFileSync(path.join(fnRoot, 'crafting.mcfunction'), 'utf8');
      const ifIdx = craftingRaw.indexOf('if score $global crafting = $global crafting');
      const unlessIdx = craftingRaw.indexOf('unless score $global crafting = $global crafting');
      assert.ok(ifIdx !== -1 && unlessIdx !== -1 && ifIdx < unlessIdx, 'crafting.mcfunction must run if-score (crafting_actions2) strictly before unless-score (crafting_actions)');

      // Repeatable advancement self-revocation on first non-comment line
      for (const advName of ['passivos', 'totem', 'quebrou']) {
        const raw = fs.readFileSync(path.join(fnRoot, `${advName}.mcfunction`), 'utf8');
        const firstLine = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
        assert.equal(
          firstLine,
          `advancement revoke @s only bebida:${advName}`,
          `${advName}.mcfunction must revoke bebida:${advName} on its first command line`,
        );
      }

      // Mining helpers must reset all variant scores and check silk_touch when configured
      for (const orbit of MINING_ORBITS) {
        const helperRaw = fs.readFileSync(path.join(fnRoot, 'internal', `${orbit.fnName}_check.mcfunction`), 'utf8');
        if (orbit.checksSilkTouch) {
          assert.ok(helperRaw.includes('unless predicate bebida:silk_touch'), `${orbit.fnName}_check must guard with unless predicate bebida:silk_touch`);
        } else {
          assert.equal(helperRaw.includes('silk_touch'), false, `${orbit.fnName}_check must remain exempt from silk_touch`);
        }
        assert.ok(helperRaw.includes(`if predicate bebida:${orbit.fnName}_rng`), `${orbit.fnName}_check must check bebida:${orbit.fnName}_rng`);
        for (const variant of orbit.variants) {
          assert.ok(
            helperRaw.includes(`scoreboard players reset @s ${variant.obj}`),
            `${orbit.fnName}_check must reset @s ${variant.obj}`,
          );
        }
      }
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

    test('All 9 predicates and #bebida:passivos tag are registered and evaluable on Paper 26.3', async ({ server }) => {
      for (const predName of Object.keys(EXPECTED_PREDICATES)) {
        const res = await server.cmd(`execute if predicate bebida:${predName}`);
        assert.match(res, /Test passed|Test failed/i, `Predicate bebida:${predName} failed to resolve on server: ${res}`);
      }
      const tagRes = await server.cmd('execute if entity @e[type=#bebida:passivos,limit=1]');
      assert.match(tagRes, /Test passed|Test failed/i, `Entity type tag #bebida:passivos failed to resolve on server: ${tagRes}`);
    });
  });
}
