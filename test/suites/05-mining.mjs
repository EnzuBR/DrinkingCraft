import assert from 'node:assert/strict';
import {
  ARENA_POS,
  DISTANT_POS,
  DIG_BLOCK_POS,
  BOT_ALPHA,
  BOT_BETA,
  MINING_ORBITS,
  EXPECTED_MINING_OBJECTIVES,
  SERVER_HOST,
  MC_PORT,
  BOT_VERSION,
} from '../lib/config.mjs';
import {
  preparePlayer,
  equipHotbar0,
  placeAndDig,
  getScore,
  ensureBotsConnected,
  sleep,
} from '../lib/bot.mjs';

export function registerSuite05(suite, test) {
  suite('05 - Mining (13 Block Variants, Scoreboard Reset, Silk Touch & RNG)', () => {
    test('Real physical mining of all 13 ore/obsidian variants increments minecraft.mined and resets scoreboards', async (ctx) => {
      const { server } = ctx;
      const { alpha, beta } = await ensureBotsConnected(ctx, {
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
        alphaName: BOT_ALPHA,
        betaName: BOT_BETA,
      });
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { ...DISTANT_POS, gamemode: 'survival' });

      await equipHotbar0(server.rcon, alpha, 'minecraft:netherite_pickaxe[minecraft:enchantments={"minecraft:efficiency":5}]');
      await server.cmd(`effect give ${BOT_ALPHA} minecraft:haste 600 2 true`);

      for (const orbit of MINING_ORBITS) {
        for (const variant of orbit.variants) {
          await placeAndDig(server.rcon, alpha, DIG_BLOCK_POS, variant.block);
          const sc = await getScore(server.rcon, BOT_ALPHA, variant.obj);
          assert.equal(
            sc.hasScore,
            false,
            `Scoreboard "${variant.obj}" must be reset after digging ${variant.block}, got ${sc.value}`,
          );
        }
      }
    });

    test('Silk Touch blocks all 5 ore triggers while still resetting scores (and obsidian is exempt)', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:silk_touch":1,"minecraft:efficiency":5}]');
      await server.cmd(`effect give ${BOT_ALPHA} minecraft:haste 600 2 true`);

      const silkCheck = await server.cmd(`execute as ${BOT_ALPHA} if predicate bebida:silk_touch`);
      assert.match(silkCheck, /Test passed/i, `silk_touch predicate should pass with Silk Touch pickaxe, got: ${silkCheck}`);

      // Physical diamond_ore dig with Silk Touch
      alpha.recorder.clear();
      beta.recorder.clear();
      await placeAndDig(server.rcon, alpha, DIG_BLOCK_POS, 'minecraft:diamond_ore');
      assert.equal((await getScore(server.rcon, BOT_ALPHA, 'diamante')).hasScore, false, 'diamante score should reset even with Silk Touch');

      // 40 deterministic ticks per guarded ore with Silk Touch -> zero actions allowed
      alpha.recorder.clear();
      beta.recorder.clear();
      for (const orbit of MINING_ORBITS.filter((o) => o.checksSilkTouch)) {
        for (let i = 0; i < 40; i++) {
          const obj = orbit.variants[i % orbit.variants.length].obj;
          await server.cmd(`scoreboard players set ${BOT_ALPHA} ${obj} 1`);
          await server.cmd(`function bebida:${orbit.fnName}`);
        }
        for (const v of orbit.variants) {
          assert.equal((await getScore(server.rcon, BOT_ALPHA, v.obj)).hasScore, false, `${v.obj} must reset under Silk Touch`);
        }
      }

      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/, soundMatcher: /entity\./ }, 500);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 200);

      // Obsidian MUST still trigger even with Silk Touch equipped
      const obsOrbit = MINING_ORBITS.find((o) => o.fnName === 'obsidian');
      for (const variant of obsOrbit.variants) {
        alpha.recorder.clear();
        beta.recorder.clear();

        let hit = false;
        for (let attempt = 0; attempt < 300; attempt++) {
          await server.cmd(`scoreboard players set ${BOT_ALPHA} ${variant.obj} 1`);
          await server.cmd('function bebida:obsidian');
          await sleep(20);
          if (alpha.recorder.titles.length > 0) {
            hit = true;
            break;
          }
        }
        assert.equal(hit, true, `Obsidian (${variant.obj}) failed to trigger within 300 tries while holding Silk Touch`);
        const t = await alpha.recorder.waitForTitle('Beba');
        assert.equal(t.subtitleAtTime, '', 'obsidian should send empty subtitle');
        await alpha.recorder.waitForSound('entity.experience_orb.pickup');
        await alpha.recorder.waitForChat(/quebrou um obsidian meio mal/);
        await beta.recorder.waitForChat(/quebrou um obsidian meio mal/);
        await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/ }, 200);
        assert.equal((await getScore(server.rcon, BOT_ALPHA, variant.obj)).hasScore, false);
      }
    });

    test('Without Silk Touch, all 5 guarded ores and their deep/nether variants trigger expected @s/@a actions and reset', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { ...DISTANT_POS, gamemode: 'survival' });
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:efficiency":5}]');

      const silkCheck = await server.cmd(`execute as ${BOT_ALPHA} if predicate bebida:silk_touch`);
      assert.equal(/Test passed/i.test(silkCheck), false, `silk_touch predicate should fail without Silk Touch, got: ${silkCheck}`);

      for (const orbit of MINING_ORBITS.filter((o) => o.checksSilkTouch)) {
        for (const variant of orbit.variants) {
          alpha.recorder.clear();
          beta.recorder.clear();

          let hit = false;
          for (let attempt = 0; attempt < 400; attempt++) {
            await server.cmd(`scoreboard players set ${BOT_ALPHA} ${variant.obj} 1`);
            await server.cmd(`function bebida:${orbit.fnName}`);
            await sleep(20);
            if (alpha.recorder.titles.length > 0) {
              hit = true;
              break;
            }
          }
          assert.equal(hit, true, `Ore ${orbit.fnName} (${variant.obj}) did not trigger within 400 RNG attempts`);

          const alphaTitle = await alpha.recorder.waitForTitle(orbit.title);
          if (orbit.scope === 'everyone_except') {
            assert.equal(alphaTitle.subtitleAtTime, 'Menos você', `${variant.obj}: @s expected "Menos você", got "${alphaTitle.subtitleAtTime}"`);
            const betaTitle = await beta.recorder.waitForTitle(orbit.title);
            assert.equal(betaTitle.subtitleAtTime, `Menos ${BOT_ALPHA}`, `${variant.obj}: @a expected "Menos ${BOT_ALPHA}", got "${betaTitle.subtitleAtTime}"`);
            await alpha.recorder.waitForSound(orbit.sound);
            await beta.recorder.waitForSound(orbit.sound);
          } else {
            assert.equal(alphaTitle.subtitleAtTime, orbit.subtitle, `${variant.obj}: expected subtitle "${orbit.subtitle}", got "${alphaTitle.subtitleAtTime}"`);
            await alpha.recorder.waitForSound(orbit.sound);
            await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/ }, 200);
          }

          await alpha.recorder.waitForChat(new RegExp(orbit.chatContains));
          await beta.recorder.waitForChat(new RegExp(orbit.chatContains));

          const after = await getScore(server.rcon, BOT_ALPHA, variant.obj);
          assert.equal(after.hasScore, false, `Scoreboard ${variant.obj} must be reset after trigger`);
        }
      }
    });

    test('Non-target blocks do NOT increment or trigger any mining objective', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { ...DISTANT_POS, gamemode: 'survival' });
      await equipHotbar0(server.rcon, alpha, 'minecraft:netherite_pickaxe[minecraft:enchantments={"minecraft:efficiency":5}]');
      await server.cmd(`effect give ${BOT_ALPHA} minecraft:haste 600 2 true`);

      alpha.recorder.clear();
      beta.recorder.clear();

      const nonTargets = [
        'minecraft:stone',
        'minecraft:netherrack',
        'minecraft:copper_ore',
        'minecraft:lapis_ore',
        'minecraft:redstone_ore',
        'minecraft:diamond_block',
      ];
      for (const block of nonTargets) {
        await placeAndDig(server.rcon, alpha, DIG_BLOCK_POS, block);
      }

      for (const obj of EXPECTED_MINING_OBJECTIVES) {
        const sc = await getScore(server.rcon, BOT_ALPHA, obj);
        assert.equal(sc.hasScore, false, `Mining non-target blocks must leave ${obj} unset, got ${sc.value}`);
      }
      await alpha.recorder.expectNone(
        {
          chatMatcher: /<DrinkingCraft>/,
          titleMatcher: /.*/,
          soundMatcher: /entity\.(wither\.ambient|experience_orb\.pickup|player\.levelup)|block\.anvil\.place/,
        },
        350,
      );
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 150);
    });

    test('Multi-variant simultaneous score atomic reset & cross-ore independence', async ({ server, bots }) => {
      const { alpha } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      for (const orbit of MINING_ORBITS) {
        for (let i = 0; i < orbit.variants.length; i++) {
          await server.cmd(`scoreboard players set ${BOT_ALPHA} ${orbit.variants[i].obj} ${i + 2}`);
        }
        await server.cmd(`function bebida:${orbit.fnName}`);
        for (const variant of orbit.variants) {
          const after = await getScore(server.rcon, BOT_ALPHA, variant.obj);
          assert.equal(after.hasScore, false, `${orbit.fnName} must atomically reset ${variant.obj} when multiple variants are set`);
        }
      }

      // Cross-ore independence: diamante must not reset carvao
      await server.cmd(`scoreboard players set ${BOT_ALPHA} diamante 1`);
      await server.cmd(`scoreboard players set ${BOT_ALPHA} carvao 5`);
      await server.cmd('function bebida:diamante');
      assert.equal((await getScore(server.rcon, BOT_ALPHA, 'diamante')).hasScore, false, 'diamante must reset');
      assert.equal((await getScore(server.rcon, BOT_ALPHA, 'carvao')).value, 5, 'diamante must NOT reset unrelated carvao score');
      await server.cmd(`scoreboard players reset ${BOT_ALPHA} carvao`);
    });

    test('bebida:silk_touch predicate evaluates mainhand strictly across slots and enchantments', async ({ server, bots }) => {
      const { alpha } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      const checkSilk = async () => {
        const out = await server.cmd(`execute as ${BOT_ALPHA} if predicate bebida:silk_touch`);
        return /Test passed/i.test(out);
      };

      // 1. Empty mainhand -> false
      assert.equal(await checkSilk(), false, 'Empty mainhand must fail silk_touch predicate');

      // 2. Unenchanted diamond pickaxe in mainhand -> false
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_pickaxe');
      assert.equal(await checkSilk(), false, 'Unenchanted pickaxe must fail silk_touch predicate');

      // 3. Fortune III + Efficiency V + Unbreaking III in mainhand -> false
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:fortune":3,"minecraft:efficiency":5,"minecraft:unbreaking":3}]');
      assert.equal(await checkSilk(), false, 'Fortune pickaxe must fail silk_touch predicate');

      // 4. Silk Touch in offhand while holding Fortune in mainhand -> false
      await server.cmd(`item replace entity ${BOT_ALPHA} weapon.offhand with minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:silk_touch":1}]`);
      await sleep(100);
      assert.equal(await checkSilk(), false, 'Silk Touch in offhand must NOT satisfy mainhand predicate');

      // 5. Silk Touch in hotbar.1 while hotbar.0 (normal pickaxe) is selected -> false
      await server.cmd(`item replace entity ${BOT_ALPHA} weapon.offhand with minecraft:air`);
      await server.cmd(`item replace entity ${BOT_ALPHA} hotbar.1 with minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:silk_touch":1}]`);
      await sleep(100);
      assert.equal(await checkSilk(), false, 'Silk Touch in unselected hotbar.1 must NOT satisfy mainhand predicate');

      // 6. Silk Touch diamond pickaxe in mainhand -> true
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:silk_touch":1}]');
      assert.equal(await checkSilk(), true, 'Silk Touch diamond pickaxe in mainhand must pass');

      // 7. Silk Touch + Efficiency + Unbreaking netherite pickaxe in mainhand -> true
      await equipHotbar0(server.rcon, alpha, 'minecraft:netherite_pickaxe[minecraft:enchantments={"minecraft:silk_touch":1,"minecraft:efficiency":5,"minecraft:unbreaking":3}]');
      assert.equal(await checkSilk(), true, 'Silk Touch netherite pickaxe with multiple enchants in mainhand must pass');
    });

    test('Per-player Silk Touch evaluation when two players mine in the same tick', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { ...DISTANT_POS, gamemode: 'survival' });

      // BotAlpha holds Silk Touch; BotBeta holds normal Efficiency pickaxe
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:silk_touch":1}]');
      await equipHotbar0(server.rcon, beta, 'minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:efficiency":5}]');

      alpha.recorder.clear();
      beta.recorder.clear();

      let triggered = false;
      for (let attempt = 0; attempt < 200; attempt++) {
        await server.cmd(`scoreboard players set ${BOT_ALPHA} diamante 1`);
        await server.cmd(`scoreboard players set ${BOT_BETA} diamante 1`);
        await server.cmd('function bebida:diamante');
        await sleep(20);

        assert.equal((await getScore(server.rcon, BOT_ALPHA, 'diamante')).hasScore, false, 'BotAlpha diamante must reset');
        assert.equal((await getScore(server.rcon, BOT_BETA, 'diamante')).hasScore, false, 'BotBeta diamante must reset');

        if (beta.recorder.titles.length > 0 || alpha.recorder.titles.length > 0) {
          triggered = true;
          break;
        }
      }

      assert.equal(triggered, true, 'BotBeta (no Silk Touch) must trigger diamante within 200 attempts');
      const betaTitle = await beta.recorder.waitForTitle('Todos bebem');
      assert.equal(betaTitle.subtitleAtTime, 'Menos você', `BotBeta (no Silk Touch) must be the trigger player, got "${betaTitle.subtitleAtTime}"`);
      const alphaTitle = await alpha.recorder.waitForTitle('Todos bebem');
      assert.equal(alphaTitle.subtitleAtTime, `Menos ${BOT_BETA}`, `BotAlpha (Silk Touch) must never trigger and must see "Menos ${BOT_BETA}", got "${alphaTitle.subtitleAtTime}"`);
      await alpha.recorder.waitForChat(new RegExp(`${BOT_BETA} encontrou um belo diamante`));
    });
  });
}
