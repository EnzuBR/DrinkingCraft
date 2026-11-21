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
  getScore,
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
      const sound = await botAlpha.recorder.waitForSound('entity.wither.ambient');
      assert.equal(sound.volume, 1, `Expected sound volume 1, got ${sound.volume}`);
      assert.equal(sound.pitch, 1, `Expected sound pitch 1, got ${sound.pitch}`);
      assert.ok(
        botAlpha.recorder.titleTimes.some((tt) => tt.fadeIn === 10 && tt.stay === 60 && tt.fadeOut === 20),
        'Expected first_join title times 10/60/20',
      );
      await botAlpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} has just joined for the first time`));

      await sleep(300);
      assert.equal(
        botAlpha.recorder.titles.filter((t) => t.text === 'Take a shot').length,
        1,
        'first_join must trigger only once on initial join',
      );

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

      // Also verify minecraft:reload and bebida:.load run cleanly and preserve existing scoreboard values
      await server.cmd(`scoreboard players set ${BOT_ALPHA} sem_morrer 4321`);
      bots.alpha.recorder.clear();
      bots.beta.recorder.clear();
      await server.cmd('minecraft:reload');
      await sleep(1500);

      const scoreAfterReload = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      assert.ok(
        scoreAfterReload.hasScore && scoreAfterReload.value >= 4321,
        `minecraft:reload must preserve existing scoreboard state (>= 4321), got ${scoreAfterReload.value}`,
      );

      await server.cmd('function bebida:.load');
      await sleep(300);
      const scoreAfterLoad = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      assert.ok(
        scoreAfterLoad.hasScore && scoreAfterLoad.value >= 4321,
        `bebida:.load must remain non-destructive to existing scores (>= 4321), got ${scoreAfterLoad.value}`,
      );
      await server.cmd(`scoreboard players reset ${BOT_ALPHA} sem_morrer`);

      const reloadErrors = server.getDatapackErrors(logCursor);
      assert.deepEqual(reloadErrors, [], `Datapack errors on enable/reload:\n${reloadErrors.join('\n')}`);
      await bots.beta.recorder.expectNone({ chatMatcher: /joined for the first time/, titleMatcher: /.*/ }, 300);
      await bots.alpha.recorder.expectNone({ chatMatcher: /joined for the first time/, titleMatcher: /.*/ }, 300);
    });

    test('Simultaneous multi-player first_join in the same tick clears sticky subtitle and fires once per player', async ({ server, bots }) => {
      const { alpha, beta } = bots;

      // Pre-set a sticky subtitle on BotAlpha before triggering first_join
      await server.cmd(`title ${BOT_ALPHA} subtitle {"text":"Sticky test"}`);
      await alpha.recorder.waitForSubtitle('Sticky test');
      assert.equal(alpha.recorder.lastSubtitle, 'Sticky test', 'Precondition: BotAlpha should hold sticky subtitle');

      await server.cmd('tick freeze');
      try {
        await server.cmd('tag @a remove init');
        alpha.recorder.clear({ resetLastSubtitle: false });
        beta.recorder.clear({ resetLastSubtitle: false });
      } finally {
        await server.cmd('tick unfreeze');
      }

      const alphaTitle = await alpha.recorder.waitForTitle('Take a shot');
      assert.equal(alphaTitle.subtitleAtTime, '', `first_join must clear sticky subtitle on ${BOT_ALPHA}, got "${alphaTitle.subtitleAtTime}"`);
      const betaTitle = await beta.recorder.waitForTitle('Take a shot');
      assert.equal(betaTitle.subtitleAtTime, '', `first_join must have empty subtitle on ${BOT_BETA}, got "${betaTitle.subtitleAtTime}"`);

      await alpha.recorder.waitForSound('entity.wither.ambient');
      await beta.recorder.waitForSound('entity.wither.ambient');

      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} has just joined for the first time`));
      await alpha.recorder.waitForChat(new RegExp(`${BOT_BETA} has just joined for the first time`));
      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} has just joined for the first time`));
      await beta.recorder.waitForChat(new RegExp(`${BOT_BETA} has just joined for the first time`));

      await sleep(500);
      assert.equal(alpha.recorder.titles.filter((t) => t.text === 'Take a shot').length, 1, `${BOT_ALPHA} must fire Take a shot once`);
      assert.equal(beta.recorder.titles.filter((t) => t.text === 'Take a shot').length, 1, `${BOT_BETA} must fire Take a shot once`);
      assert.equal(alpha.recorder.sounds.filter((s) => s.name.includes('entity.wither.ambient')).length, 1);
      assert.equal(beta.recorder.sounds.filter((s) => s.name.includes('entity.wither.ambient')).length, 1);

      assert.equal(await hasTag(server.rcon, BOT_ALPHA, 'init'), true, `${BOT_ALPHA} must regain init tag`);
      assert.equal(await hasTag(server.rcon, BOT_BETA, 'init'), true, `${BOT_BETA} must regain init tag`);
    });
  });
}
