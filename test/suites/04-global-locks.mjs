import assert from 'node:assert/strict';
import {
  ARENA_POS,
  BOT_ALPHA,
  BOT_BETA,
  GLOBAL_MILESTONES,
  SERVER_HOST,
  MC_PORT,
  BOT_VERSION,
} from '../lib/config.mjs';
import {
  preparePlayer,
  getScore,
  waitForCondition,
  ensureBotsConnected,
  sleep,
} from '../lib/bot.mjs';

async function assertMilestoneTriggered(milestone, bots, server) {
  const { alpha, beta } = bots;

  const alphaTitle = await alpha.recorder.waitForTitle(milestone.title);
  if (milestone.scope === 'everyone_except') {
    assert.equal(alphaTitle.subtitleAtTime, 'Except you', `${milestone.name}: @s expected "Except you", got "${alphaTitle.subtitleAtTime}"`);
    const betaTitle = await beta.recorder.waitForTitle(milestone.title);
    assert.equal(betaTitle.subtitleAtTime, `Except ${BOT_ALPHA}`, `${milestone.name}: @a expected "Except ${BOT_ALPHA}", got "${betaTitle.subtitleAtTime}"`);
    await alpha.recorder.waitForSound(milestone.sound);
    await beta.recorder.waitForSound(milestone.sound);
  } else if (milestone.scope === 'everyone') {
    assert.equal(alphaTitle.subtitleAtTime, '', `${milestone.name}: @s expected empty subtitle, got "${alphaTitle.subtitleAtTime}"`);
    const betaTitle = await beta.recorder.waitForTitle(milestone.title);
    assert.equal(betaTitle.subtitleAtTime, '', `${milestone.name}: @a expected empty subtitle, got "${betaTitle.subtitleAtTime}"`);
    assert.ok(beta.recorder.subtitles.some((s) => s.text === ''), `${milestone.name}: @a must receive explicit empty subtitle packet`);
    await alpha.recorder.waitForSound(milestone.sound);
    await beta.recorder.waitForSound(milestone.sound);
  } else if (milestone.scope === 'self_only') {
    assert.equal(alphaTitle.subtitleAtTime, milestone.subtitle, `${milestone.name}: @s expected "${milestone.subtitle}", got "${alphaTitle.subtitleAtTime}"`);
    await alpha.recorder.waitForSound(milestone.sound);
    await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: new RegExp(milestone.sound.replace(/\./g, '\\.')) }, 400);
  }

  await alpha.recorder.waitForChat(new RegExp(milestone.chatContains));
  await beta.recorder.waitForChat(new RegExp(milestone.chatContains));

  const lockScore = await getScore(server.rcon, '$global', milestone.globalObj);
  assert.equal(lockScore.hasScore, true, `${milestone.name}: $global ${milestone.globalObj} must be set`);
  assert.equal(lockScore.value, 0, `${milestone.name}: $global ${milestone.globalObj} must equal 0`);
}

export function registerSuite04(suite, test) {
  suite('04 - Global Locks ($global First-Time Milestones)', () => {
    test('Already-triggered full_dima and debris stay locked when second player obtains items', async (ctx) => {
      const { server } = ctx;
      const { alpha, beta } = await ensureBotsConnected(ctx, {
        host: SERVER_HOST,
        port: MC_PORT,
        version: BOT_VERSION,
        alphaName: BOT_ALPHA,
        betaName: BOT_BETA,
      });
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { ...ARENA_POS, gamemode: 'survival' });

      assert.equal((await getScore(server.rcon, '$global', 'full_dima')).value, 0);
      assert.equal((await getScore(server.rcon, '$global', 'debris')).value, 0);

      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd(`give ${BOT_BETA} minecraft:diamond_helmet`);
      await server.cmd(`give ${BOT_BETA} minecraft:diamond_chestplate`);
      await server.cmd(`give ${BOT_BETA} minecraft:diamond_leggings`);
      await server.cmd(`give ${BOT_BETA} minecraft:diamond_boots`);
      await server.cmd(`give ${BOT_BETA} minecraft:ancient_debris`);

      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 1200);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 400);
    });

    test('elytra triggers elytra_first lock (no name collision) and ignores second player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'elytra');

      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`give ${BOT_ALPHA} minecraft:elytra`);
      await assertMilestoneTriggered(milestone, bots, server);

      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`give ${BOT_BETA} minecraft:elytra`);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 900);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);
    });

    test('full_netherite triggers for first player and ignores second player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'full_netherite');

      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_helmet`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_chestplate`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_leggings`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_boots`);
      await assertMilestoneTriggered(milestone, bots, server);

      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`give ${BOT_BETA} minecraft:netherite_helmet`);
      await server.cmd(`give ${BOT_BETA} minecraft:netherite_chestplate`);
      await server.cmd(`give ${BOT_BETA} minecraft:netherite_leggings`);
      await server.cmd(`give ${BOT_BETA} minecraft:netherite_boots`);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 900);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);
    });

    test('nether dimension change triggers once, clears sticky subtitle on @a, and ignores second player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'nether');

      // Note: BotBeta still had "Except BotAlpha" from full_netherite above, so this also verifies sticky subtitle clearing on @a!
      await server.cmd('execute in minecraft:the_nether run forceload add -4 -4 4 4');
      await server.cmd('execute in minecraft:the_nether run fill -3 63 -3 3 63 3 minecraft:stone');
      await server.cmd('execute in minecraft:the_nether run fill -3 64 -3 3 67 3 minecraft:air');

      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd(`execute in minecraft:the_nether run tp ${BOT_ALPHA} 0.5 64 0.5`);
      await assertMilestoneTriggered(milestone, bots, server);

      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`execute in minecraft:the_nether run tp ${BOT_BETA} 0.5 64 0.5`);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 900);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);

      await server.cmd(`execute in minecraft:overworld run tp ${BOT_ALPHA} ${ARENA_POS.x} ${ARENA_POS.y} ${ARENA_POS.z}`);
      await server.cmd(`execute in minecraft:overworld run tp ${BOT_BETA} ${ARENA_POS.x} ${ARENA_POS.y} ${ARENA_POS.z}`);
      await sleep(400);
      await server.cmd('execute in minecraft:the_nether run forceload remove -4 -4 4 4');
    });

    test('end dimension change triggers once and ignores second player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'end');

      await server.cmd('execute in minecraft:the_end run forceload add 96 -4 104 4');
      await server.cmd('execute in minecraft:the_end run fill 97 49 -3 103 49 3 minecraft:stone');
      await server.cmd('execute in minecraft:the_end run fill 97 50 -3 103 53 3 minecraft:air');

      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd(`execute in minecraft:the_end run tp ${BOT_ALPHA} 100.5 50 0.5`);
      await assertMilestoneTriggered(milestone, bots, server);

      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`execute in minecraft:the_end run tp ${BOT_BETA} 100.5 50 0.5`);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 900);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);

      await server.cmd(`execute in minecraft:overworld run tp ${BOT_ALPHA} ${ARENA_POS.x} ${ARENA_POS.y} ${ARENA_POS.z}`);
      await server.cmd(`execute in minecraft:overworld run tp ${BOT_BETA} ${ARENA_POS.x} ${ARENA_POS.y} ${ARENA_POS.z}`);
      await sleep(400);
      await server.cmd('execute in minecraft:the_end run forceload remove 96 -4 104 4');
    });

    test('warden kill (player_killed_entity) triggers once and ignores second player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'warden');

      await preparePlayer(server.rcon, alpha, { x: 10.5, y: 100, z: 10.5, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { x: 14.5, y: 100, z: 10.5, gamemode: 'survival' });
      await server.cmd(`item replace entity ${BOT_ALPHA} hotbar.0 with minecraft:diamond_sword`);
      await server.cmd(`item replace entity ${BOT_BETA} hotbar.0 with minecraft:diamond_sword`);
      alpha.setQuickBarSlot(0);
      beta.setQuickBarSlot(0);
      await sleep(750);

      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd('summon minecraft:warden 10.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["test_warden"]}');
      await server.cmd('damage @e[tag=test_warden,limit=1] 499 minecraft:generic');

      const warden1 = await waitForCondition(
        () => alpha.nearestEntity((e) => e.name === 'warden'),
        'Warden visible to BotAlpha',
        4000,
      );
      await alpha.lookAt(warden1.position.offset(0, 1.2, 0), true);
      await sleep(100);
      for (let s = 0; s < 3; s++) {
        if (!alpha.entities[warden1.id]?.isValid) break;
        await alpha.attack(warden1);
        await sleep(250);
      }

      await assertMilestoneTriggered(milestone, bots, server);

      // Second player kills another warden -> must NOT trigger
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:warden 14.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["test_warden2"]}');
      await server.cmd('damage @e[tag=test_warden2,limit=1] 499 minecraft:generic');

      const warden2 = await waitForCondition(
        () => beta.nearestEntity((e) => e.name === 'warden'),
        'Second Warden visible to BotBeta',
        4000,
      );
      await beta.lookAt(warden2.position.offset(0, 1.2, 0), true);
      await sleep(100);
      for (let s = 0; s < 3; s++) {
        if (!beta.entities[warden2.id]?.isValid) break;
        await beta.attack(warden2);
        await sleep(250);
      }

      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 900);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);
      await server.cmd('kill @e[type=item]').catch(() => {});
    });

    test('Remaining 7 global milestones (cogu, fortaleza, stronghold, trial, trade, ender_dragon, return) lock individually', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const remainingNames = ['cogu', 'fortaleza', 'stronghold', 'trial', 'trade', 'ender_dragon', 'return'];

      for (const name of remainingNames) {
        const milestone = GLOBAL_MILESTONES.find((m) => m.name === name);
        assert.ok(milestone, `Missing config for ${name}`);

        alpha.recorder.clear();
        beta.recorder.clear();

        await server.cmd(`advancement grant ${BOT_ALPHA} only bebida:${milestone.adv}`);
        await assertMilestoneTriggered(milestone, bots, server);

        alpha.recorder.clear();
        beta.recorder.clear();
        await server.cmd(`advancement grant ${BOT_BETA} only bebida:${milestone.adv}`);
        await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 450);
        await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 150);
      }
    });
  });
}
