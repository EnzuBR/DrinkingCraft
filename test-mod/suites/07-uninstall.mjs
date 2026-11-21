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
  hasTag,
  hasAdvancement,
  ensureBotsConnected,
} from '../lib/bot.mjs';

export function registerSuite07(suite, test) {
  suite('07 - bebida:uninstall Full Cleanup', () => {
    test('bebida:uninstall removes all 30 objectives, all 18 advancements, and init tags without traces', async (ctx) => {
      const { server } = ctx;
      await ensureBotsConnected(ctx, {
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
        alphaName: BOT_ALPHA,
        betaName: BOT_BETA,
      });

      const beforeObjs = await server.cmd('scoreboard objectives list');
      assert.match(beforeObjs, /There are 30 objective\(s\):/, `Precondition: expected 30 objectives before uninstall, got: ${beforeObjs}`);
      assert.equal(await hasTag(server.rcon, BOT_ALPHA, 'init'), true, 'Precondition: BotAlpha has init tag');
      assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), true, 'Precondition: BotBeta has init tag');

      // Freeze ticks so .tick doesn't re-fire first_join before assertions (mod stays loaded in mods/)
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
      } finally {
        await server.cmd('tick unfreeze');
      }
    });
  });
}
