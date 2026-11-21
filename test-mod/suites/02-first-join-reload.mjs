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
  waitForCondition,
  sleep,
} from '../lib/bot.mjs';

export function registerSuite02(suite, test) {
  suite('02 - first_join, Reconnect & Reload init Protection', () => {
    test('First player join triggers first_join shot and adds init tag', async (ctx) => {
      const { locale } = ctx;
      const botAlpha = await connectBot({
        username: BOT_ALPHA,
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
      });
      ctx.bots.alpha = botAlpha;

      const title = await botAlpha.recorder.waitForTitle(locale.titles.takeAShot);
      assert.equal(title.subtitleAtTime ?? '', '', `Expected empty subtitle on first_join, got "${title.subtitleAtTime}"`);
      await botAlpha.recorder.waitForSound('entity.wither.ambient');
      await botAlpha.recorder.waitForChat(locale.chat.firstJoin(BOT_ALPHA));

      const tagged = await hasTag(ctx.server.rcon, BOT_ALPHA, 'init');
      assert.equal(tagged, true, `${BOT_ALPHA} should have init tag after first_join`);
    });

    test('Reconnecting player with init tag does NOT re-trigger first_join', async (ctx) => {
      const { locale } = ctx;
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
          titleMatcher: locale.titles.takeAShot,
          soundMatcher: /entity\.wither\.ambient/,
          chatMatcher: locale.chat.firstJoinAny,
        },
        1500,
      );
    });

    test('Second player first join notifies only @s with title/sound while @a sees chat only', async (ctx) => {
      const { locale } = ctx;
      ctx.bots.alpha.recorder.clear();

      const botBeta = await connectBot({
        username: BOT_BETA,
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
      });
      ctx.bots.beta = botBeta;

      const betaTitle = await botBeta.recorder.waitForTitle(locale.titles.takeAShot);
      assert.equal(betaTitle.subtitleAtTime ?? '', '', 'BotBeta first_join should have empty subtitle');
      await botBeta.recorder.waitForSound('entity.wither.ambient');
      await botBeta.recorder.waitForChat(locale.chat.firstJoin(BOT_BETA));

      assert.equal(await hasTag(ctx.server.rcon, BOT_BETA, 'init'), true, `${BOT_BETA} should have init tag`);

      await ctx.bots.alpha.recorder.waitForChat(locale.chat.firstJoin(BOT_BETA));
      await ctx.bots.alpha.recorder.expectNone(
        {
          titleMatcher: locale.titles.takeAShot,
          soundMatcher: /entity\.wither\.ambient/,
        },
        1000,
      );
    });

    test('Online players without init receive init on vanilla reload without firing first_join', async (ctx) => {
      const { server, bots, locale } = ctx;
      let logCursor = server.getLogCursor();

      await server.cmd('tick freeze');
      try {
        await server.cmd(`tag ${BOT_BETA} remove init`);
        assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), false, 'Precondition: init tag should be removed');

        bots.alpha.recorder.clear();
        bots.beta.recorder.clear();
        logCursor = server.getLogCursor();

        await server.cmd('reload');
        await waitForCondition(
          () => server.getLogsSince(logCursor).some((line) => /Loaded \d+ advancements/i.test(line)),
          'vanilla reload to finish loading advancements/datapacks',
          8000,
        );
      } finally {
        await server.cmd('tick unfreeze');
      }

      await waitForCondition(
        async () => await hasTag(server.rcon, BOT_BETA, 'init'),
        '.load.mcfunction adds init tag on first tick after vanilla reload',
        4000,
      );

      await sleep(1000);

      await bots.beta.recorder.expectNone(
        {
          titleMatcher: locale.titles.takeAShot,
          soundMatcher: /entity\.wither\.ambient/,
          chatMatcher: locale.chat.firstJoinAny,
        },
        400,
      );
      await bots.alpha.recorder.expectNone(
        {
          chatMatcher: locale.chat.firstJoinAny,
        },
        200,
      );

      const firstReloadErrors = server.getDatapackErrors(logCursor);
      assert.deepEqual(firstReloadErrors, [], `Datapack errors on frozen reload:\n${firstReloadErrors.join('\n')}`);

      // Also verify a normal unfrozen reload runs cleanly with both bots online
      bots.alpha.recorder.clear();
      bots.beta.recorder.clear();
      const secondCursor = server.getLogCursor();
      await server.cmd('reload');
      await waitForCondition(
        () => server.getLogsSince(secondCursor).some((line) => /Loaded \d+ advancements/i.test(line)),
        'second vanilla reload to finish loading advancements/datapacks',
        8000,
      );
      await sleep(500);

      const secondReloadErrors = server.getDatapackErrors(secondCursor);
      assert.deepEqual(secondReloadErrors, [], `Datapack errors on unfrozen reload:\n${secondReloadErrors.join('\n')}`);
      await bots.beta.recorder.expectNone({ chatMatcher: locale.chat.firstJoinAny, titleMatcher: /.*/ }, 300);
      await bots.alpha.recorder.expectNone({ chatMatcher: locale.chat.firstJoinAny, titleMatcher: /.*/ }, 300);
    });
  });
}
