import assert from 'node:assert/strict';
import {
  ARENA_POS,
  DISTANT_POS,
  DIG_BLOCK_POS,
  BOT_ALPHA,
  BOT_BETA,
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
      const { server, locale } = ctx;
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

      for (const orbit of locale.miningOrbits) {
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

    test('Silk Touch blocks all 5 ore triggers while still resetting scores (and obsidian is exempt)', async ({ server, bots, locale }) => {
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
      for (const orbit of locale.miningOrbits.filter((o) => o.checksSilkTouch)) {
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
      const obsOrbit = locale.miningOrbits.find((o) => o.fnName === 'obsidian');
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
        const t = await alpha.recorder.waitForTitle(obsOrbit.title);
        assert.equal(t.subtitleAtTime, '', 'obsidian should send empty subtitle');
        await alpha.recorder.waitForSound('entity.experience_orb.pickup');
        await alpha.recorder.waitForChat(locale.chat.obsidian);
        await beta.recorder.waitForChat(locale.chat.obsidian);
        await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/ }, 200);
        assert.equal((await getScore(server.rcon, BOT_ALPHA, variant.obj)).hasScore, false);
      }
    });

    test('Without Silk Touch, all 5 guarded ores and their deep/nether variants trigger expected @s/@a actions and reset', async ({ server, bots, locale }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { ...DISTANT_POS, gamemode: 'survival' });
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_pickaxe[minecraft:enchantments={"minecraft:efficiency":5}]');

      const silkCheck = await server.cmd(`execute as ${BOT_ALPHA} if predicate bebida:silk_touch`);
      assert.equal(/Test passed/i.test(silkCheck), false, `silk_touch predicate should fail without Silk Touch, got: ${silkCheck}`);

      for (const orbit of locale.miningOrbits.filter((o) => o.checksSilkTouch)) {
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
            assert.equal(
              alphaTitle.subtitleAtTime,
              locale.subtitles.exceptYou,
              `${variant.obj}: @s expected "${locale.subtitles.exceptYou}", got "${alphaTitle.subtitleAtTime}"`,
            );
            const betaTitle = await beta.recorder.waitForTitle(orbit.title);
            const expectedBetaSub = locale.subtitles.exceptPlayer(BOT_ALPHA);
            assert.equal(
              betaTitle.subtitleAtTime,
              expectedBetaSub,
              `${variant.obj}: @a expected "${expectedBetaSub}", got "${betaTitle.subtitleAtTime}"`,
            );
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
  });
}
