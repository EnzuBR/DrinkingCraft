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
  hasAdvancement,
  sprintTicks,
  waitForCondition,
  ensureBotsConnected,
  sleep,
} from '../lib/bot.mjs';

async function assertMilestoneTriggered(milestone, bots, server, timeoutMs = 4500) {
  const { alpha, beta } = bots;

  const alphaTitle = await alpha.recorder.waitForTitle(milestone.title, timeoutMs);
  if (milestone.scope === 'everyone_except') {
    assert.equal(alphaTitle.subtitleAtTime, 'Menos tú', `${milestone.name}: @s expected "Menos tú", got "${alphaTitle.subtitleAtTime}"`);
    const betaTitle = await beta.recorder.waitForTitle(milestone.title, timeoutMs);
    assert.equal(betaTitle.subtitleAtTime, `Menos ${BOT_ALPHA}`, `${milestone.name}: @a expected "Menos ${BOT_ALPHA}", got "${betaTitle.subtitleAtTime}"`);
    await alpha.recorder.waitForSound(milestone.sound, timeoutMs);
    await beta.recorder.waitForSound(milestone.sound, timeoutMs);
  } else if (milestone.scope === 'everyone') {
    assert.equal(alphaTitle.subtitleAtTime, '', `${milestone.name}: @s expected empty subtitle, got "${alphaTitle.subtitleAtTime}"`);
    const betaTitle = await beta.recorder.waitForTitle(milestone.title, timeoutMs);
    assert.equal(betaTitle.subtitleAtTime, '', `${milestone.name}: @a expected empty subtitle, got "${betaTitle.subtitleAtTime}"`);
    assert.ok(beta.recorder.subtitles.some((s) => s.text === ''), `${milestone.name}: @a must receive explicit empty subtitle packet`);
    await alpha.recorder.waitForSound(milestone.sound, timeoutMs);
    await beta.recorder.waitForSound(milestone.sound, timeoutMs);
  } else if (milestone.scope === 'self_only') {
    assert.equal(alphaTitle.subtitleAtTime, milestone.subtitle, `${milestone.name}: @s expected "${milestone.subtitle}", got "${alphaTitle.subtitleAtTime}"`);
    await alpha.recorder.waitForSound(milestone.sound, timeoutMs);
    await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: new RegExp(milestone.sound.replace(/\./g, '\\.')) }, 400);
  }

  await alpha.recorder.waitForChat(new RegExp(milestone.chatContains), timeoutMs);
  await beta.recorder.waitForChat(new RegExp(milestone.chatContains), timeoutMs);

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

      // Partial/mixed diamond set must NOT grant full_dima advancement to BotBeta
      await server.cmd(`give ${BOT_BETA} minecraft:diamond_helmet`);
      await server.cmd(`give ${BOT_BETA} minecraft:diamond_chestplate`);
      await server.cmd(`give ${BOT_BETA} minecraft:diamond_leggings`);
      await server.cmd(`give ${BOT_BETA} minecraft:iron_boots`);
      await sleep(200);
      assert.equal(await hasAdvancement(server.rcon, BOT_BETA, 'full_dima'), false, 'Partial/mixed armor must not grant bebida:full_dima');

      // Completing full diamond + ancient debris on 2nd player must stay blocked by $global locks
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

    test('full_netherite rejects partial/mixed sets, triggers once on all 4 pieces, and ignores second player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'full_netherite');
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      alpha.recorder.clear();
      beta.recorder.clear();

      // 3 netherite pieces + diamond boots -> must NOT trigger
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_helmet`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_chestplate`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_leggings`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:diamond_boots`);
      await sleep(200);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'full_netherite'), false, '3 netherite + diamond boots must not trigger full_netherite');
      assert.equal((await getScore(server.rcon, '$global', 'full_netherite')).hasScore, false);

      // Swap helmet for boots (still only 3 netherite pieces at a time) -> must NOT trigger
      await server.cmd(`clear ${BOT_ALPHA} minecraft:netherite_helmet`);
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_boots`);
      await sleep(200);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'full_netherite'), false, 'Holding 3 netherite pieces sequentially without all 4 at once must not trigger');
      assert.equal((await getScore(server.rcon, '$global', 'full_netherite')).hasScore, false);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);

      // Complete all 4 pieces simultaneously -> triggers!
      await server.cmd(`give ${BOT_ALPHA} minecraft:netherite_helmet`);
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

    test('nether dimension change ignores overworld tp, triggers once on Nether entry, clears sticky subtitle on @a, and ignores second player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'nether');

      // Same-dimension teleport within overworld must NOT trigger nether or end
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`execute in minecraft:overworld run tp ${BOT_ALPHA} 20.5 100 10.5`);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);
      assert.equal((await getScore(server.rcon, '$global', 'nether')).hasScore, false);
      assert.equal((await getScore(server.rcon, '$global', 'end')).hasScore, false);

      // Note: BotBeta still had "Menos BotAlpha" from full_netherite above, so this also verifies sticky subtitle clearing on @a!
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

      // Returning to overworld must NOT trigger any dimension event
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`execute in minecraft:overworld run tp ${BOT_ALPHA} ${ARENA_POS.x} ${ARENA_POS.y} ${ARENA_POS.z}`);
      await server.cmd(`execute in minecraft:overworld run tp ${BOT_BETA} ${ARENA_POS.x} ${ARENA_POS.y} ${ARENA_POS.z}`);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 400);
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

    test('warden kill ignores non-player death and other mobs, triggers once on real kill, and ignores second player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'warden');

      await preparePlayer(server.rcon, alpha, { x: 10.5, y: 100, z: 10.5, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { x: 14.5, y: 100, z: 10.5, gamemode: 'survival' });
      await server.cmd(`item replace entity ${BOT_ALPHA} hotbar.0 with minecraft:diamond_sword`);
      await server.cmd(`item replace entity ${BOT_BETA} hotbar.0 with minecraft:diamond_sword`);
      alpha.setQuickBarSlot(0);
      beta.setQuickBarSlot(0);
      await sleep(750);

      // Edge case A: Warden killed by environment (no player killer) must NOT trigger
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:warden 10.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["test_warden_env"]}');
      await server.cmd('damage @e[tag=test_warden_env,limit=1] 1000 minecraft:generic');
      await sleep(300);
      await server.cmd('tp @e[tag=test_warden_env] 0 -200 0').catch(() => {});
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'warden'), false, 'Environmental warden death must not grant bebida:warden');
      assert.equal((await getScore(server.rcon, '$global', 'warden')).hasScore, false);

      // Edge case B: Killing a non-Warden hostile mob (zombie) must NOT trigger warden
      await server.cmd('summon minecraft:zombie 10.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["test_zombie"]}');
      await server.cmd(`damage @e[tag=test_zombie,limit=1] 100 minecraft:player_attack by ${BOT_ALPHA}`);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);
      await server.cmd('tp @e[tag=test_zombie] 0 -200 0').catch(() => {});
      assert.equal((await getScore(server.rcon, '$global', 'warden')).hasScore, false);

      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd('summon minecraft:warden 10.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["test_warden"]}');
      await server.cmd('damage @e[tag=test_warden,limit=1] 499 minecraft:generic');
      // Wait for the 10-tick (500ms) hurt invulnerability frames from damage 499 to expire
      await sleep(600);

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
        await sleep(300);
      }

      await assertMilestoneTriggered(milestone, bots, server);

      // Second player kills another warden -> advancement triggers, but $global warden=0 must block actions
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:warden 14.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["test_warden2"]}');
      await server.cmd('damage @e[tag=test_warden2,limit=1] 499 minecraft:generic');
      await sleep(600);

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
        await sleep(300);
      }

      assert.equal(await hasAdvancement(server.rcon, BOT_BETA, 'warden'), true, 'BotBeta must have genuinely killed the second Warden');
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 900);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);
      await server.cmd('kill @e[type=item]').catch(() => {});
    });

    test('return milestone validates Ghast killing_blow (#minecraft:is_projectile + fireball direct_entity) and locks 2nd player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const milestone = GLOBAL_MILESTONES.find((m) => m.name === 'return');
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { x: 14.5, y: 100, z: 10.5, gamemode: 'survival' });

      // Edge case A: Ghast killed by melee player_attack -> must NOT trigger return (nor passivos)
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:ghast 10.5 101 15.0 {NoAI:1b,Silent:1b,Tags:["test_ghast_melee"]}');
      await server.cmd(`damage @e[tag=test_ghast_melee,limit=1] 100 minecraft:player_attack by ${BOT_ALPHA}`);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 350);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'return'), false, 'Melee Ghast kill must not trigger bebida:return');
      assert.equal((await getScore(server.rcon, '$global', 'return')).hasScore, false);

      // Edge case B: Ghast killed by arrow projectile (direct_entity != fireball) -> must NOT trigger return
      alpha.recorder.clear();
      await server.cmd('summon minecraft:ghast 10.5 101 15.0 {NoAI:1b,Silent:1b,Tags:["test_ghast_arrow"]}');
      await server.cmd('summon minecraft:arrow 10.5 105 15.0 {NoGravity:1b,Tags:["test_arrow"]}');
      await server.cmd(`damage @e[tag=test_ghast_arrow,limit=1] 100 minecraft:arrow by @e[tag=test_arrow,limit=1] from ${BOT_ALPHA}`);
      await server.cmd('kill @e[tag=test_arrow]').catch(() => {});
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 350);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'return'), false, 'Arrow Ghast kill must not trigger bebida:return');
      assert.equal((await getScore(server.rcon, '$global', 'return')).hasScore, false);

      // Edge case C: Ghast killed by deflected fireball (#minecraft:is_projectile + minecraft:fireball direct_entity) -> triggers!
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:ghast 10.5 101 15.0 {NoAI:1b,Silent:1b,Tags:["test_ghast_fb"]}');
      await server.cmd('summon minecraft:fireball 10.5 105 15.0 {ExplosionPower:0b,Tags:["test_fb"]}');
      await server.cmd(`damage @e[tag=test_ghast_fb,limit=1] 100 minecraft:fireball by @e[tag=test_fb,limit=1] from ${BOT_ALPHA}`);
      await server.cmd('kill @e[tag=test_fb]').catch(() => {});
      await assertMilestoneTriggered(milestone, bots, server);

      // Edge case D: Second player deflect-kills a Ghast -> ignored because $global return = 0
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:ghast 14.5 101 15.0 {NoAI:1b,Silent:1b,Tags:["test_ghast_fb2"]}');
      await server.cmd('summon minecraft:fireball 14.5 105 15.0 {ExplosionPower:0b,Tags:["test_fb2"]}');
      await server.cmd(`damage @e[tag=test_ghast_fb2,limit=1] 100 minecraft:fireball by @e[tag=test_fb2,limit=1] from ${BOT_BETA}`);
      await server.cmd('kill @e[tag=test_fb2]').catch(() => {});
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 600);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 200);
      await server.cmd('kill @e[type=item]').catch(() => {});
    });

    test('cogu biome entry (/fillbiome) and ender_dragon real kill trigger once and lock 2nd player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const cogu = GLOBAL_MILESTONES.find((m) => m.name === 'cogu');
      const dragon = GLOBAL_MILESTONES.find((m) => m.name === 'ender_dragon');

      // Real cogu biome trigger via fillbiome around BotAlpha while BotBeta is outside
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { x: 24.5, y: 100, z: 24.5, gamemode: 'survival' });
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('fillbiome 8 98 8 13 104 13 minecraft:mushroom_fields');
      await assertMilestoneTriggered(cogu, bots, server, 6000);

      // Moving BotBeta into mushroom_fields must NOT re-trigger
      alpha.recorder.clear();
      beta.recorder.clear();
      await preparePlayer(server.rcon, beta, { ...ARENA_POS, gamemode: 'survival' });
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 1200);
      await server.cmd('fillbiome 8 98 8 13 104 13 minecraft:plains');

      // Real ender_dragon kill by BotAlpha (sprint 220 ticks to complete 10s death animation quickly)
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:ender_dragon 10.5 115 16.0 {Silent:1b,Tags:["test_dragon1"]}');
      await server.cmd(`damage @e[tag=test_dragon1,limit=1] 1000 minecraft:player_attack by ${BOT_ALPHA}`);
      await sprintTicks(server, 220);
      await assertMilestoneTriggered(dragon, bots, server);
      await server.cmd('kill @e[type=experience_orb]').catch(() => {});

      // Second player kills a dragon -> ignored
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:ender_dragon 10.5 115 16.0 {Silent:1b,Tags:["test_dragon2"]}');
      await server.cmd(`damage @e[tag=test_dragon2,limit=1] 1000 minecraft:player_attack by ${BOT_BETA}`);
      await sprintTicks(server, 220);
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 450);
      await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 150);
      await server.cmd('kill @e[type=experience_orb]').catch(() => {});
    });

    test('Remaining 4 milestones (fortaleza, stronghold, trial, trade) isolate $global locks and handle simultaneous same-tick execution', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      const remainingNames = ['fortaleza', 'stronghold', 'trial', 'trade'];

      for (let idx = 0; idx < remainingNames.length; idx++) {
        const name = remainingNames[idx];
        const milestone = GLOBAL_MILESTONES.find((m) => m.name === name);
        assert.ok(milestone, `Missing config for ${name}`);

        // Cross-lock isolation: all subsequent untriggered locks must still be unset
        for (const laterName of remainingNames.slice(idx)) {
          const laterMilestone = GLOBAL_MILESTONES.find((m) => m.name === laterName);
          assert.equal(
            (await getScore(server.rcon, '$global', laterMilestone.globalObj)).hasScore,
            false,
            `Lock $global ${laterMilestone.globalObj} must remain unset before ${laterName} triggers`,
          );
        }

        alpha.recorder.clear();
        beta.recorder.clear();

        if (name === 'trial') {
          // Simultaneous same-tick invocation across both online players -> must fire ONCE total, not twice!
          await server.cmd('execute as @a at @s run function bebida:trial');
          await assertMilestoneTriggered(milestone, bots, server);
          await sleep(300);
          assert.equal(alpha.recorder.titles.filter((t) => t.text === milestone.title).length, 1, 'Simultaneous trial call must fire title once on BotAlpha');
          assert.equal(beta.recorder.titles.filter((t) => t.text === milestone.title).length, 1, 'Simultaneous trial call must fire title once on BotBeta');
          assert.equal(alpha.recorder.chats.filter((c) => c.text.includes(milestone.chatContains)).length, 1, 'Simultaneous trial call must broadcast chat once');
        } else {
          await server.cmd(`advancement grant ${BOT_ALPHA} only bebida:${milestone.adv}`);
          await assertMilestoneTriggered(milestone, bots, server);

          alpha.recorder.clear();
          beta.recorder.clear();
          await server.cmd(`advancement grant ${BOT_BETA} only bebida:${milestone.adv}`);
          await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 450);
          await beta.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 150);
        }
      }
    });
  });
}
