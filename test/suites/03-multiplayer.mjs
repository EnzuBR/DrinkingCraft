import assert from 'node:assert/strict';
import {
  ARENA_POS,
  DISTANT_POS,
  BOT_ALPHA,
  BOT_BETA,
  SERVER_HOST,
  MC_PORT,
  BOT_VERSION,
} from '../lib/config.mjs';
import {
  preparePlayer,
  ensureBotsConnected,
  sleep,
} from '../lib/bot.mjs';

export function registerSuite03(suite, test) {
  suite('03 - Multiplayer (@s vs @a, Subtitles, Sticky Subtitle & Distant Sound)', () => {
    test('Group "Except you" event shows distinct subtitles to @s vs @a and plays sound at 140+ blocks', async (ctx) => {
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

      alpha.recorder.clear();
      beta.recorder.clear();

      // Trigger real inventory_changed advancement bebida:full_dima for BotAlpha
      await server.cmd(`give ${BOT_ALPHA} minecraft:diamond_helmet`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:diamond_chestplate`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:diamond_leggings`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:diamond_boots`);

      const alphaTitle = await alpha.recorder.waitForTitle('Everyone drinks');
      assert.equal(alphaTitle.subtitleAtTime, 'Except you', `@s should see "Except you", got "${alphaTitle.subtitleAtTime}"`);
      assert.ok(
        alpha.recorder.titleTimes.some((tt) => tt.fadeIn === 10 && tt.stay === 60 && tt.fadeOut === 20),
        'Expected @s title times 10/60/20',
      );
      await alpha.recorder.waitForSound('entity.player.levelup');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} was the first to get Full Diamond armor.*except ${BOT_ALPHA}!`));

      const betaTitle = await beta.recorder.waitForTitle('Everyone drinks');
      assert.equal(betaTitle.subtitleAtTime, `Except ${BOT_ALPHA}`, `@a should see "Except ${BOT_ALPHA}", got "${betaTitle.subtitleAtTime}"`);
      assert.ok(
        beta.recorder.titleTimes.some((tt) => tt.fadeIn === 10 && tt.stay === 60 && tt.fadeOut === 20),
        'Expected @a title times 10/60/20',
      );
      const betaSound = await beta.recorder.waitForSound('entity.player.levelup');
      assert.ok(
        betaSound.x !== null && Math.abs(betaSound.x - DISTANT_POS.x) < 2 && Math.abs(betaSound.z - DISTANT_POS.z) < 2,
        `Distant @a sound must be repositioned to BotBeta (${DISTANT_POS.x}, ${DISTANT_POS.z}), got (${betaSound.x}, ${betaSound.z})`,
      );
      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} was the first to get Full Diamond armor.*except ${BOT_ALPHA}!`));
    });

    test('@s-only milestone isolates title/subtitle/sound from nearby @a (<1 block) while broadcasting chat', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      // Place BotBeta on the exact same block as BotAlpha to prove @s sound/title isolation even at point-blank range
      await preparePlayer(server.rcon, beta, { ...ARENA_POS, gamemode: 'survival' });
      alpha.recorder.clear();
      beta.recorder.clear();

      // Trigger real inventory_changed advancement bebida:debris for BotAlpha
      await server.cmd(`give ${BOT_ALPHA} minecraft:ancient_debris`);

      const alphaTitle = await alpha.recorder.waitForTitle('Choose someone');
      assert.equal(alphaTitle.subtitleAtTime, 'To take a shot', `Expected "To take a shot", got "${alphaTitle.subtitleAtTime}"`);
      await alpha.recorder.waitForSound('entity.wither.ambient');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} found the first Ancient Debris`));

      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} found the first Ancient Debris`));
      await beta.recorder.expectNone(
        {
          titleMatcher: /.*/,
          subtitleMatcher: /.*/,
          soundMatcher: /entity\.wither\.ambient/,
        },
        1000,
      );

      await preparePlayer(server.rcon, beta, { ...DISTANT_POS, gamemode: 'survival' });
    });

    test('Sticky subtitle prevention clears previous subtitle explicitly on subsequent @s title', async ({ server, bots }) => {
      const { alpha } = bots;
      // BotAlpha's previous subtitle was "To take a shot"; trigger death (no subtitle) without touching any $global lock
      assert.equal(alpha.recorder.lastSubtitle, 'To take a shot', 'Precondition: last subtitle should be "To take a shot"');

      alpha.recorder.clear();
      await server.cmd(`kill ${BOT_ALPHA}`);

      const title = await alpha.recorder.waitForTitle('Drink it all');
      assert.equal(title.subtitleAtTime, '', `Expected empty subtitle after explicit reset, got "${title.subtitleAtTime}"`);
      const clearedPacket = alpha.recorder.subtitles.find((s) => s.text === '');
      assert.ok(clearedPacket, 'Expected explicit set_title_subtitle("") packet before title');
      await sleep(300);
    });

    test('Role reversal (BotBeta as @s, BotAlpha as @a at 140+ blocks) shows "Except you" to BotBeta and "Except BotBeta" to BotAlpha', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { ...DISTANT_POS, gamemode: 'survival' });

      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd(`execute as ${BOT_BETA} at @s run function bebida:diamante_actions`);

      const betaTitle = await beta.recorder.waitForTitle('Everyone drinks');
      assert.equal(betaTitle.subtitleAtTime, 'Except you', `Trigger @s (${BOT_BETA}) should see "Except you", got "${betaTitle.subtitleAtTime}"`);
      await beta.recorder.waitForSound('entity.player.levelup');

      const alphaTitle = await alpha.recorder.waitForTitle('Everyone drinks');
      assert.equal(alphaTitle.subtitleAtTime, `Except ${BOT_BETA}`, `@a (${BOT_ALPHA}) should see "Except ${BOT_BETA}", got "${alphaTitle.subtitleAtTime}"`);
      const alphaSound = await alpha.recorder.waitForSound('entity.player.levelup');
      assert.ok(
        alphaSound.x !== null && Math.abs(alphaSound.x - ARENA_POS.x) < 2 && Math.abs(alphaSound.z - ARENA_POS.z) < 2,
        `Distant @a sound must be repositioned to BotAlpha (${ARENA_POS.x}, ${ARENA_POS.z}), got (${alphaSound.x}, ${alphaSound.z})`,
      );

      const chatRe = new RegExp(`${BOT_BETA} has mined an outstanding diamond.*except ${BOT_BETA}!`);
      await alpha.recorder.waitForChat(chatRe);
      await beta.recorder.waitForChat(chatRe);
    });

    test('Complete sticky subtitle transition matrix ("To drink" -> @s empty, and "Except <player>" -> @a empty)', async ({ server, bots }) => {
      const { alpha, beta } = bots;

      // Case 1: "To drink" (ouro_actions) -> empty subtitle (obsidian_actions) on @s
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`execute as ${BOT_ALPHA} at @s run function bebida:ouro_actions`);
      const ouroTitle = await alpha.recorder.waitForTitle('Choose someone');
      assert.equal(ouroTitle.subtitleAtTime, 'To drink');

      alpha.recorder.clear({ resetLastSubtitle: false });
      await server.cmd(`execute as ${BOT_ALPHA} at @s run function bebida:obsidian_actions`);
      const obsAlphaTitle = await alpha.recorder.waitForTitle('Drink');
      assert.equal(obsAlphaTitle.subtitleAtTime, '', 'obsidian_actions must clear prior "To drink" sticky subtitle');
      assert.ok(alpha.recorder.subtitles.some((s) => s.text === ''), 'Expected explicit empty subtitle packet after "To drink"');

      // Case 2: "Except BotAlpha" (diamante_actions) -> empty subtitle (obsidian_actions) on previous @a recipient
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`execute as ${BOT_ALPHA} at @s run function bebida:diamante_actions`);
      const betaExcept = await beta.recorder.waitForTitle('Everyone drinks');
      assert.equal(betaExcept.subtitleAtTime, `Except ${BOT_ALPHA}`);

      beta.recorder.clear({ resetLastSubtitle: false });
      await server.cmd(`execute as ${BOT_BETA} at @s run function bebida:obsidian_actions`);
      const obsBetaTitle = await beta.recorder.waitForTitle('Drink');
      assert.equal(obsBetaTitle.subtitleAtTime, '', `obsidian_actions must clear prior "Except ${BOT_ALPHA}" sticky subtitle on @a`);
      assert.ok(beta.recorder.subtitles.some((s) => s.text === ''), 'Expected explicit empty subtitle packet after "Except <player>"');
    });
  });
}
