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

      const alphaTitle = await alpha.recorder.waitForTitle('Todos beben');
      assert.equal(alphaTitle.subtitleAtTime, 'Menos tú', `@s should see "Menos tú", got "${alphaTitle.subtitleAtTime}"`);
      await alpha.recorder.waitForSound('entity.player.levelup');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} fue el primero en conseguir armadura completa de diamante.*menos ${BOT_ALPHA}\\.`));

      const betaTitle = await beta.recorder.waitForTitle('Todos beben');
      assert.equal(betaTitle.subtitleAtTime, `Menos ${BOT_ALPHA}`, `@a should see "Menos ${BOT_ALPHA}", got "${betaTitle.subtitleAtTime}"`);
      await beta.recorder.waitForSound('entity.player.levelup');
      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} fue el primero en conseguir armadura completa de diamante.*menos ${BOT_ALPHA}\\.`));
    });

    test('@s-only milestone isolates title/subtitle/sound from @a while broadcasting chat', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      alpha.recorder.clear();
      beta.recorder.clear();

      // Trigger real inventory_changed advancement bebida:debris for BotAlpha
      await server.cmd(`give ${BOT_ALPHA} minecraft:ancient_debris`);

      const alphaTitle = await alpha.recorder.waitForTitle('Elige a alguien');
      assert.equal(alphaTitle.subtitleAtTime, 'Para tomar un shot', `Expected "Para tomar un shot", got "${alphaTitle.subtitleAtTime}"`);
      await alpha.recorder.waitForSound('entity.wither.ambient');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} encontró el primer Ancient Debris`));

      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} encontró el primer Ancient Debris`));
      await beta.recorder.expectNone(
        {
          titleMatcher: /.*/,
          subtitleMatcher: /.*/,
          soundMatcher: /entity\.wither\.ambient/,
        },
        1000,
      );
    });

    test('Sticky subtitle prevention clears previous subtitle explicitly on subsequent @s title', async ({ server, bots }) => {
      const { alpha } = bots;
      // BotAlpha's previous subtitle was "Para tomar un shot"; trigger death (no subtitle) without touching any $global lock
      assert.equal(alpha.recorder.lastSubtitle, 'Para tomar un shot', 'Precondition: last subtitle should be "Para tomar un shot"');

      alpha.recorder.clear();
      await server.cmd(`kill ${BOT_ALPHA}`);

      const title = await alpha.recorder.waitForTitle('Bébelo todo');
      assert.equal(title.subtitleAtTime, '', `Expected empty subtitle after explicit reset, got "${title.subtitleAtTime}"`);
      const clearedPacket = alpha.recorder.subtitles.find((s) => s.text === '');
      assert.ok(clearedPacket, 'Expected explicit set_title_subtitle("") packet before title');
      await sleep(300);
    });
  });
}
