import assert from 'node:assert/strict';
import {
  BOT_ALPHA,
  BOT_BETA,
  EXPECTED_OBJECTIVES,
  EXPECTED_ADVANCEMENTS,
  SERVER_HOST,
  MC_PORT,
  BOT_VERSION,
} from '../lib/config.mjs';
import {
  getScore,
  hasTag,
  hasAdvancement,
  ensureBotsConnected,
  sleep,
} from '../lib/bot.mjs';

export function registerSuite07(suite, test) {
  suite('07 - bebida:uninstall Full Cleanup & Clean Reinstall', () => {
    test('bebida:uninstall removes all 30 objectives, all 18 advancements, and init tags while preserving unrelated player tags', async (ctx) => {
      const { server } = ctx;
      await ensureBotsConnected(ctx, {
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
        alphaName: BOT_ALPHA,
        betaName: BOT_BETA,
      });
      // Precondition: objectives and init tags exist; also seed an unrelated admin tag and advancements
      const beforeObjs = await server.cmd('scoreboard objectives list');
      assert.match(beforeObjs, /There are 30 objective\(s\):/, `Precondition: expected 30 objectives before uninstall, got: ${beforeObjs}`);
      assert.equal(await hasTag(server.rcon, BOT_ALPHA, 'init'), true, 'Precondition: BotAlpha has init tag');
      assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), true, 'Precondition: BotBeta has init tag');

      await server.cmd(`tag ${BOT_ALPHA} add custom_admin_tag`);
      await server.cmd(`advancement grant ${BOT_ALPHA} only bebida:full_dima`);
      await server.cmd(`advancement grant ${BOT_ALPHA} only bebida:debris`);
      await server.cmd(`advancement grant ${BOT_ALPHA} only bebida:crafting`);

      // Freeze tick so .tick doesn't immediately re-fire first_join before disabling the datapack
      await server.cmd('tick freeze');
      try {
        await server.cmd('function bebida:uninstall');

        const afterObjs = await server.cmd('scoreboard objectives list');
        assert.match(afterObjs, /There are no objectives|no objectives/i, `Expected zero objectives after uninstall, got: ${afterObjs}`);
        for (const obj of EXPECTED_OBJECTIVES) {
          const probe = await server.cmd(`scoreboard players get __probe__ ${obj}`);
          assert.match(probe, /Unknown scoreboard objective/i, `Objective "${obj}" still exists after uninstall: ${probe}`);
        }

        assert.equal(await hasTag(server.rcon, BOT_ALPHA, 'init'), false, `${BOT_ALPHA} still has init tag after uninstall`);
        assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), false, `${BOT_BETA} still has init tag after uninstall`);
        assert.equal(await hasTag(server.rcon, BOT_ALPHA, 'custom_admin_tag'), true, 'bebida:uninstall must NOT remove unrelated player tags');

        for (const adv of EXPECTED_ADVANCEMENTS) {
          assert.equal(
            await hasAdvancement(server.rcon, BOT_ALPHA, adv),
            false,
            `${BOT_ALPHA} still has advancement bebida:${adv} after uninstall`,
          );
          assert.equal(
            await hasAdvancement(server.rcon, BOT_BETA, adv),
            false,
            `${BOT_BETA} still has advancement bebida:${adv} after uninstall`,
          );
        }

        await server.cmd('datapack disable "file/DrinkingCraft"');
      } finally {
        await server.cmd('tick unfreeze');
        await server.cmd(`tag ${BOT_ALPHA} remove custom_admin_tag`);
      }

      await sleep(500);
      const finalObjs = await server.cmd('scoreboard objectives list');
      assert.match(finalObjs, /There are no objectives|no objectives/i, `Expected zero leftover objectives, got: ${finalObjs}`);
      assert.equal(await hasTag(server.rcon, BOT_ALPHA, 'init'), false);
      assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), false);
    });

    test('Re-enabling datapack after bebida:uninstall starts a clean session with all global locks reset', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await server.cmd(`clear ${BOT_ALPHA}`);
      await server.cmd(`clear ${BOT_BETA}`);
      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd('datapack enable "file/DrinkingCraft"');
      await sleep(600);

      const objs = await server.cmd('scoreboard objectives list');
      assert.match(objs, /There are 30 objective\(s\):/, `Expected 30 objectives recreated after re-enable, got: ${objs}`);
      assert.equal(await hasTag(server.rcon, BOT_ALPHA, 'init'), true, `${BOT_ALPHA} must receive init tag silently on re-enable`);
      assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), true, `${BOT_BETA} must receive init tag silently on re-enable`);

      await alpha.recorder.expectNone({ titleMatcher: /Take a shot/, chatMatcher: /joined for the first time/ }, 250);
      await beta.recorder.expectNone({ titleMatcher: /Take a shot/, chatMatcher: /joined for the first time/ }, 250);

      // Verify $global debris lock was wiped and BotBeta can now trigger it as the new 1st player
      assert.equal((await getScore(server.rcon, '$global', 'debris')).hasScore, false, '$global debris must be unset in clean session');

      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`give ${BOT_BETA} minecraft:ancient_debris`);

      const betaTitle = await beta.recorder.waitForTitle('Choose someone');
      assert.equal(betaTitle.subtitleAtTime, 'To take a shot');
      await beta.recorder.waitForSound('entity.wither.ambient');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_BETA} found the first Ancient Debris`));
      assert.equal((await getScore(server.rcon, '$global', 'debris')).value, 0, '$global debris must lock to 0 in fresh session');

      // Final clean uninstall + disable
      await server.cmd('tick freeze');
      try {
        await server.cmd('function bebida:uninstall');
        await server.cmd('datapack disable "file/DrinkingCraft"');
      } finally {
        await server.cmd('tick unfreeze');
      }

      await sleep(500);
      const finalObjs = await server.cmd('scoreboard objectives list');
      assert.match(finalObjs, /There are no objectives|no objectives/i, `Expected zero leftover objectives after final uninstall, got: ${finalObjs}`);
      assert.equal(await hasTag(server.rcon, BOT_ALPHA, 'init'), false);
      assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), false);
      for (const adv of EXPECTED_ADVANCEMENTS) {
        assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, adv), false);
        assert.equal(await hasAdvancement(server.rcon, BOT_BETA, adv), false);
      }
    });
  });
}
