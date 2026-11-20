import assert from 'node:assert/strict';
import {
  SERVER_HOST,
  MC_PORT,
  BOT_VERSION,
  BOT_ALPHA,
  BOT_BETA,
} from '../lib/config.mjs';
import {
  connectBot,
  disconnectBot,
  hasTag,
  sleep,
} from '../lib/bot.mjs';

export function registerSuite02(suite, test) {
  suite('02 - first_join, Reconnect & Reload init Protection', () => {
    test('First player join triggers first_join shot and adds init tag', async (ctx) => {
      const botAlpha = await connectBot({
        username: BOT_ALPHA,
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
      });
      ctx.bots.alpha = botAlpha;

      const title = await botAlpha.recorder.waitForTitle('Take a shot');
      assert.equal(title.subtitleAtTime ?? '', '', `Expected empty subtitle on first_join, got "${title.subtitleAtTime}"`);
      await botAlpha.recorder.waitForSound('entity.wither.ambient');
      await botAlpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} has just joined for the first time`));

      const tagged = await hasTag(ctx.server.rcon, BOT_ALPHA, 'init');
      assert.equal(tagged, true, `${BOT_ALPHA} should have init tag after first_join`);
    });

    test('Reconnecting player with init tag does NOT re-trigger first_join', async (ctx) => {
      await disconnectBot(ctx.bots.alpha);
      await sleep(300);

      const botAlpha = await connectBot({
        username: BOT_ALPHA,
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
      });
      ctx.bots.alpha = botAlpha;

      await botAlpha.recorder.expectNone(
        {
          titleMatcher: /Take a shot/,
          soundMatcher: /entity\.wither\.ambient/,
          chatMatcher: /joined for the first time/,
        },
        1500,
      );
    });

    test('Second player first join notifies only @s with title/sound while @a sees chat only', async (ctx) => {
      ctx.bots.alpha.recorder.clear();

      const botBeta = await connectBot({
        username: BOT_BETA,
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
      });
      ctx.bots.beta = botBeta;

      const betaTitle = await botBeta.recorder.waitForTitle('Take a shot');
      assert.equal(betaTitle.subtitleAtTime ?? '', '', 'BotBeta first_join should have empty subtitle');
      await botBeta.recorder.waitForSound('entity.wither.ambient');
      await botBeta.recorder.waitForChat(new RegExp(`${BOT_BETA} has just joined for the first time`));

      assert.equal(await hasTag(ctx.server.rcon, BOT_BETA, 'init'), true, `${BOT_BETA} should have init tag`);

      await ctx.bots.alpha.recorder.waitForChat(new RegExp(`${BOT_BETA} has just joined for the first time`));
      await ctx.bots.alpha.recorder.expectNone(
        {
          titleMatcher: /Take a shot/,
          soundMatcher: /entity\.wither\.ambient/,
        },
        1000,
      );
    });

    test('Online players without init receive init on datapack enable/reload without firing first_join', async (ctx) => {
      const { server, bots } = ctx;
      await server.cmd('datapack disable "file/DrinkingCraft"');
      await server.cmd(`tag ${BOT_BETA} remove init`);
      assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), false, 'Precondition: init tag should be removed');

      bots.alpha.recorder.clear();
      bots.beta.recorder.clear();

      const logCursor = server.getLogCursor();
      await server.cmd('datapack enable "file/DrinkingCraft"');
      await sleep(1500);

      assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), true, '.load.mcfunction must add init to already-online players');
      await bots.beta.recorder.expectNone(
        {
          titleMatcher: /Take a shot/,
          soundMatcher: /entity\.wither\.ambient/,
          chatMatcher: /joined for the first time/,
        },
        500,
      );
      await bots.alpha.recorder.expectNone(
        {
          chatMatcher: /joined for the first time/,
        },
        200,
      );

      // Also verify minecraft:reload runs cleanly with both bots online
      bots.alpha.recorder.clear();
      bots.beta.recorder.clear();
      await server.cmd('minecraft:reload');
      await sleep(1500);

      const reloadErrors = server.getDatapackErrors(logCursor);
      assert.deepEqual(reloadErrors, [], `Datapack errors on enable/reload:\n${reloadErrors.join('\n')}`);
      await bots.beta.recorder.expectNone({ chatMatcher: /joined for the first time/, titleMatcher: /.*/ }, 300);
      await bots.alpha.recorder.expectNone({ chatMatcher: /joined for the first time/, titleMatcher: /.*/ }, 300);
    });
  });
}
