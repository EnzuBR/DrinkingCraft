import assert from 'node:assert/strict';
import {
  ARENA_POS,
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
  hasAdvancement,
  startFallFlying,
  waitForCondition,
  ensureBotsConnected,
  sleep,
} from '../lib/bot.mjs';

export function registerSuite06(suite, test) {
  suite('06 - Continuous & Repeatable Events (morte, sem_morrer, quebrou, crafting, totem, passivos)', () => {
    test('morte triggers Bébelo todo + anvil sound for @s and resets both mortes and sem_morrer', async (ctx) => {
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

      // Put BotAlpha sem_morrer near threshold to prove death resets it and prevents false sem_morrer trigger;
      // also set BotBeta sem_morrer to verify death isolation between players
      await server.cmd(`scoreboard players set ${BOT_ALPHA} sem_morrer 11985`);
      await server.cmd(`scoreboard players set ${BOT_BETA} sem_morrer 8500`);
      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd(`kill ${BOT_ALPHA}`);

      const title = await alpha.recorder.waitForTitle('Bébelo todo');
      assert.equal(title.subtitleAtTime, '', `morte should clear subtitle, got "${title.subtitleAtTime}"`);
      await alpha.recorder.waitForSound('block.anvil.place');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} murió y ahora tiene que terminarse su bebida.`));

      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} murió y ahora tiene que terminarse su bebida.`));
      await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /block\.anvil\.place/ }, 1500);

      await alpha.recorder.expectNone({ chatMatcher: /demasiado tiempo sin morir/ }, 200);

      const mortes = await getScore(server.rcon, BOT_ALPHA, 'mortes');
      assert.equal(mortes.hasScore, false, 'mortes score must be reset after morte_actions');

      const semMorrer = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      assert.ok(!semMorrer.hasScore || semMorrer.value < 200, `sem_morrer must reset on death, got ${semMorrer.value}`);

      const betaSemMorrer = await getScore(server.rcon, BOT_BETA, 'sem_morrer');
      assert.ok(betaSemMorrer.hasScore && betaSemMorrer.value >= 8500, `BotAlpha death must not reset BotBeta sem_morrer, got ${betaSemMorrer.value}`);

      // Simultaneous death of both players (kill @a) -> each gets Bébelo todo once and resets both scores
      await server.cmd(`scoreboard players set ${BOT_ALPHA} sem_morrer 11980`);
      await server.cmd(`scoreboard players set ${BOT_BETA} sem_morrer 11980`);
      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd('kill @a');

      await alpha.recorder.waitForTitle('Bébelo todo');
      await beta.recorder.waitForTitle('Bébelo todo');
      await alpha.recorder.waitForSound('block.anvil.place');
      await beta.recorder.waitForSound('block.anvil.place');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} murió y ahora tiene que terminarse su bebida.`));
      await alpha.recorder.waitForChat(new RegExp(`${BOT_BETA} murió y ahora tiene que terminarse su bebida.`));
      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} murió y ahora tiene que terminarse su bebida.`));
      await beta.recorder.waitForChat(new RegExp(`${BOT_BETA} murió y ahora tiene que terminarse su bebida.`));
      await sleep(350);

      assert.equal(alpha.recorder.titles.filter((t) => t.text === 'Bébelo todo').length, 1, 'Simultaneous kill @a: BotAlpha must fire once');
      assert.equal(beta.recorder.titles.filter((t) => t.text === 'Bébelo todo').length, 1, 'Simultaneous kill @a: BotBeta must fire once');
      await alpha.recorder.expectNone({ chatMatcher: /demasiado tiempo sin morir/ }, 100);
      await beta.recorder.expectNone({ chatMatcher: /demasiado tiempo sin morir/ }, 100);

      assert.equal((await getScore(server.rcon, BOT_ALPHA, 'mortes')).hasScore, false);
      assert.equal((await getScore(server.rcon, BOT_BETA, 'mortes')).hasScore, false);
      const aSem = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      const bSem = await getScore(server.rcon, BOT_BETA, 'sem_morrer');
      assert.ok(!aSem.hasScore || aSem.value < 200, `Simultaneous death must reset BotAlpha sem_morrer, got ${aSem.value}`);
      assert.ok(!bSem.hasScore || bSem.value < 200, `Simultaneous death must reset BotBeta sem_morrer, got ${bSem.value}`);
    });

    test('sem_morrer fires once at 12000 ticks, does not spam, tracks each player independently, and fires again after another 12000 ticks', async (ctx) => {
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

      const sprintTicks = async (ticks) => {
        await server.cmd(`tick sprint ${ticks}`);
        await waitForCondition(
          async () => {
            const out = await server.cmd('tick query');
            return !/sprint/i.test(out);
          },
          `tick sprint ${ticks} to finish`,
          30000,
          100,
        );
        await sleep(250);
      };

      const countTitles = (bot, text) => bot.recorder.titles.filter((t) => t.text === text).length;
      const countSounds = (bot, sound) => bot.recorder.sounds.filter((s) => s.name.includes(sound)).length;
      const countChats = (bot, regex) => bot.recorder.chats.filter((c) => regex.test(c.text)).length;

      const alphaChatRe = new RegExp(`${BOT_ALPHA} lleva demasiado tiempo sin morir`);
      const betaChatRe = new RegExp(`${BOT_BETA} lleva demasiado tiempo sin morir`);

      // Reset both players; BotAlpha counts naturally from 0, BotBeta starts offset at 6000
      await server.cmd(`scoreboard players reset ${BOT_ALPHA} sem_morrer`);
      await server.cmd(`scoreboard players set ${BOT_BETA} sem_morrer 6000`);
      alpha.recorder.clear();
      beta.recorder.clear();

      // Phase 1: Sprint 5800 ticks -> BotAlpha ~5800, BotBeta ~11800 -> NEITHER should fire
      await sprintTicks(5800);
      assert.equal(countTitles(alpha, 'Bebe'), 0, 'BotAlpha must not fire before 12000 ticks');
      assert.equal(countTitles(beta, 'Bebe'), 0, 'BotBeta must not fire before 12000 ticks');
      assert.equal(countChats(alpha, /demasiado tiempo sin morir/), 0, 'No sem_morrer chat before 12000 ticks');

      // Phase 2: Sprint 350 ticks -> BotBeta crosses 12000 (fires once), BotAlpha ~6150 (untouched)
      await sprintTicks(350);
      await sleep(500); // wait ~10 extra real ticks to verify no spam

      assert.equal(countTitles(beta, 'Bebe'), 1, 'BotBeta must fire Bebe exactly once at 12000 ticks');
      assert.equal(beta.recorder.titles[0].subtitleAtTime, '', 'sem_morrer must clear subtitle');
      assert.equal(countSounds(beta, 'entity.experience_orb.pickup'), 1, 'BotBeta must hear XP sound exactly once');
      assert.equal(countChats(alpha, betaChatRe), 1, 'Global chat for BotBeta must appear exactly once');
      assert.equal(countChats(beta, betaChatRe), 1, 'BotBeta chat must appear exactly once');

      assert.equal(countTitles(alpha, 'Bebe'), 0, 'BotAlpha must not fire when BotBeta hits 12000');
      assert.equal(countSounds(alpha, 'entity.experience_orb.pickup'), 0, 'BotAlpha must not hear XP sound when BotBeta fires');
      assert.equal(countChats(alpha, alphaChatRe), 0, 'BotAlpha must have no sem_morrer chat yet');

      const alphaMid = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      const betaAfter1 = await getScore(server.rcon, BOT_BETA, 'sem_morrer');
      assert.ok(alphaMid.hasScore && alphaMid.value >= 5900 && alphaMid.value < 7000, `BotAlpha counter must remain independent (~6150), got ${alphaMid.value}`);
      assert.ok(!betaAfter1.hasScore || betaAfter1.value < 600, `BotBeta counter must reset after firing, got ${betaAfter1.value}`);

      // Phase 3: Sprint 5600 ticks -> BotAlpha ~11750, BotBeta ~5750 -> NEITHER should fire
      alpha.recorder.clear();
      beta.recorder.clear();
      await sprintTicks(5600);
      assert.equal(countTitles(alpha, 'Bebe'), 0, 'BotAlpha must not fire prematurely (~11750 ticks)');
      assert.equal(countTitles(beta, 'Bebe'), 0, 'BotBeta must not fire prematurely (~5750 ticks)');

      // Phase 4: Sprint 450 ticks -> BotAlpha crosses its 1st real 12000 ticks from 0 -> fires ONCE, no spam
      await sprintTicks(450);
      await sleep(500);

      assert.equal(countTitles(alpha, 'Bebe'), 1, 'BotAlpha must fire Bebe exactly once at 12000 ticks (cycle 1)');
      assert.equal(alpha.recorder.titles[0].subtitleAtTime, '', 'sem_morrer (cycle 1) must clear subtitle');
      assert.equal(countSounds(alpha, 'entity.experience_orb.pickup'), 1, 'BotAlpha must hear XP sound exactly once (cycle 1)');
      assert.equal(countChats(alpha, alphaChatRe), 1, 'BotAlpha chat must appear exactly once (cycle 1)');
      assert.equal(countChats(beta, alphaChatRe), 1, 'BotBeta must see BotAlpha chat exactly once (cycle 1)');

      assert.equal(countTitles(beta, 'Bebe'), 0, 'BotBeta must not fire when BotAlpha hits 12000');
      assert.equal(countSounds(beta, 'entity.experience_orb.pickup'), 0, 'BotBeta must not hear XP sound when BotAlpha fires');

      const alphaAfter1 = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      const betaMid = await getScore(server.rcon, BOT_BETA, 'sem_morrer');
      assert.ok(!alphaAfter1.hasScore || alphaAfter1.value < 700, `BotAlpha counter must reset after cycle 1, got ${alphaAfter1.value}`);
      assert.ok(betaMid.hasScore && betaMid.value >= 5800 && betaMid.value < 7200, `BotBeta counter must remain independent (~6200), got ${betaMid.value}`);

      // Phase 5: Sprint 11000 ticks -> BotBeta crosses its 2nd 12000-tick cycle once; BotAlpha (~11300) still silent
      alpha.recorder.clear();
      beta.recorder.clear();
      await sprintTicks(11000);
      assert.equal(countTitles(beta, 'Bebe'), 1, 'BotBeta must fire exactly once on its 2nd 12000-tick cycle');
      assert.equal(countSounds(beta, 'entity.experience_orb.pickup'), 1, 'BotBeta must hear XP sound exactly once on cycle 2');
      assert.equal(countChats(alpha, betaChatRe), 1, 'BotBeta cycle 2 chat must appear exactly once');
      assert.equal(countTitles(alpha, 'Bebe'), 0, 'BotAlpha must NOT fire again before another full 12000 ticks pass');
      assert.equal(countChats(alpha, alphaChatRe), 0, 'BotAlpha must have no chat before another 12000 ticks pass');

      // Phase 6: Sprint 1000 ticks -> BotAlpha completes its 2nd real 12000-tick cycle -> fires ONCE, no spam
      alpha.recorder.clear();
      beta.recorder.clear();
      await sprintTicks(1000);
      await sleep(500);

      assert.equal(countTitles(alpha, 'Bebe'), 1, 'BotAlpha must fire Bebe exactly once after another 12000 ticks (cycle 2)');
      assert.equal(countSounds(alpha, 'entity.experience_orb.pickup'), 1, 'BotAlpha must hear XP sound exactly once (cycle 2)');
      assert.equal(countChats(alpha, alphaChatRe), 1, 'BotAlpha cycle 2 chat must appear exactly once');
      assert.equal(countTitles(beta, 'Bebe'), 0, 'BotBeta must remain silent during BotAlpha cycle 2');

      const alphaAfter2 = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      assert.ok(!alphaAfter2.hasScore || alphaAfter2.value < 1200, `BotAlpha counter must reset after cycle 2, got ${alphaAfter2.value}`);

      // Phase 7: Simultaneous 2-player trigger at the same tick -> both fire exactly once, no spam
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`scoreboard players set ${BOT_ALPHA} sem_morrer 11990`);
      await server.cmd(`scoreboard players set ${BOT_BETA} sem_morrer 11990`);

      await alpha.recorder.waitForTitle('Bebe', 6000);
      await beta.recorder.waitForTitle('Bebe', 6000);
      await sleep(500);

      assert.equal(countTitles(alpha, 'Bebe'), 1, 'Simultaneous: BotAlpha must fire exactly once');
      assert.equal(countTitles(beta, 'Bebe'), 1, 'Simultaneous: BotBeta must fire exactly once');
      assert.equal(countSounds(alpha, 'entity.experience_orb.pickup'), 1, 'Simultaneous: BotAlpha sound must play once');
      assert.equal(countSounds(beta, 'entity.experience_orb.pickup'), 1, 'Simultaneous: BotBeta sound must play once');
      assert.equal(countChats(alpha, alphaChatRe), 1, 'Simultaneous: BotAlpha chat once');
      assert.equal(countChats(alpha, betaChatRe), 1, 'Simultaneous: BotBeta chat once');

      const aFinal = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      const bFinal = await getScore(server.rcon, BOT_BETA, 'sem_morrer');
      assert.ok(!aFinal.hasScore || aFinal.value < 100, `alpha sem_morrer must reset, got ${aFinal.value}`);
      assert.ok(!bFinal.hasScore || bFinal.value < 100, `beta sem_morrer must reset, got ${bFinal.value}`);
    });

    test('quebrou ignores tool durability > 0, triggers repeatedly on break (pickaxe + shovel), and distinguishes Elytra > 1 vs <= 1', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      // Boundary 1: wooden_pickaxe at damage=57 (remaining 2 -> 1) MUST NOT trigger quebrou; next dig (1 -> 0) MUST trigger!
      alpha.recorder.clear();
      beta.recorder.clear();
      await equipHotbar0(server.rcon, alpha, 'minecraft:wooden_pickaxe[minecraft:damage=57]');
      await placeAndDig(server.rcon, alpha, DIG_BLOCK_POS, 'minecraft:stone');

      await alpha.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/, chatMatcher: /rompió una pieza de equipo/ }, 400);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'quebrou'), false, 'Tool dropping to durability 1 (not 0) must not trigger bebida:quebrou');

      // Same pickaxe now has 1 durability left -> next dig breaks it (1 -> 0)
      await placeAndDig(server.rcon, alpha, DIG_BLOCK_POS, 'minecraft:stone');
      const title1 = await alpha.recorder.waitForTitle('Bebe');
      assert.equal(title1.subtitleAtTime, '', 'quebrou (1) should have empty subtitle');
      await alpha.recorder.waitForSound('entity.experience_orb.pickup');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} rompió una pieza de equipo y ahora tiene que beber.`));
      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} rompió una pieza de equipo`));
      await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/ }, 300);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'quebrou'), false, 'bebida:quebrou must auto-revoke (#1)');

      // Boundary 2: Repeat break with another tool type (wooden_shovel[damage=58] breaking dirt)
      alpha.recorder.clear();
      beta.recorder.clear();
      await equipHotbar0(server.rcon, alpha, 'minecraft:wooden_shovel[minecraft:damage=58]');
      await placeAndDig(server.rcon, alpha, DIG_BLOCK_POS, 'minecraft:dirt');

      const title2 = await alpha.recorder.waitForTitle('Bebe');
      assert.equal(title2.subtitleAtTime, '', 'quebrou (2) should have empty subtitle');
      await alpha.recorder.waitForSound('entity.experience_orb.pickup');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} rompió una pieza de equipo y ahora tiene que beber.`));
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'quebrou'), false, 'bebida:quebrou must auto-revoke (#2)');

      // Boundary 3a: Elytra losing durability while still > 1 (damage=420 -> durability 12 -> 11) MUST NOT trigger
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`clear ${BOT_ALPHA}`);
      await server.cmd(`item replace entity ${BOT_ALPHA} armor.chest with minecraft:elytra[minecraft:damage=420]`);
      await server.cmd(`tp ${BOT_ALPHA} 10.5 180 10.5 0 15`);
      await sleep(250);
      startFallFlying(alpha);
      await waitForCondition(() => alpha.entity?.elytraFlying, 'BotAlpha gliding with durability-12 Elytra', 3000, 50);
      await sleep(1400); // > 1s of gliding drops Elytra durability by at least 1 (still >= 10)
      await server.cmd(`gamemode creative ${BOT_ALPHA}`);
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      await alpha.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/, chatMatcher: /rompió una pieza de equipo/ }, 400);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'quebrou'), false, 'Elytra durability > 1 must not trigger bebida:quebrou');

      // Boundary 3b: Elytra durability 2 -> 1 (max durability 432 -> damage 430 leaves 2; 1s of gliding drops to 1)
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`clear ${BOT_ALPHA}`);
      await server.cmd(`item replace entity ${BOT_ALPHA} armor.chest with minecraft:elytra[minecraft:damage=430]`);
      await server.cmd(`tp ${BOT_ALPHA} 10.5 180 10.5 0 15`);
      await sleep(250);

      // Send start_fall_flying ONCE (re-sending while already gliding toggles it off!)
      startFallFlying(alpha);

      let elytraTriggered = false;
      for (let step = 0; step < 30; step++) {
        if (alpha.recorder.titles.some((t) => t.text === 'Bebe')) {
          elytraTriggered = true;
          break;
        }
        await sleep(150);
        if (step === 4 && !alpha.entity?.elytraFlying) {
          startFallFlying(alpha);
        }
        if (alpha.entity?.position?.y < 120) {
          await server.cmd(`tp ${BOT_ALPHA} 10.5 180 10.5 0 15`);
          await sleep(200);
          startFallFlying(alpha);
        }
      }

      // Reset fall velocity/damage cleanly
      await server.cmd(`gamemode creative ${BOT_ALPHA}`);
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      assert.equal(elytraTriggered, true, 'Elytra reaching durability 1 must trigger bebida:quebrou');
      await alpha.recorder.waitForSound('entity.experience_orb.pickup');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} rompió una pieza de equipo`));
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'quebrou'), false, 'bebida:quebrou must auto-revoke after Elytra');
    });

    test('crafting triggers Toma un shot once for 1st player globally, then 33% Bebe (never both) for 2nd player', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await preparePlayer(server.rcon, beta, { ...ARENA_POS, gamemode: 'survival' });

      // Ensure clean crafting state
      await server.cmd('scoreboard players reset $global crafting');
      await server.cmd('advancement revoke @a only bebida:crafting');
      await server.cmd('clear @a minecraft:crafting_table');
      await sleep(150);

      // 1st player gets crafting_table -> must get ONLY crafting_actions (Toma un shot), NOT crafting_actions2
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`give ${BOT_ALPHA} minecraft:crafting_table`);

      const alphaTitle = await alpha.recorder.waitForTitle('Toma un shot');
      assert.equal(alphaTitle.subtitleAtTime, '', 'crafting_actions must have empty subtitle');
      await alpha.recorder.waitForSound('entity.wither.ambient');
      await alpha.recorder.waitForChat(/¿Qué eres, un speedrunner\?/);

      await beta.recorder.waitForChat(/¿Qué eres, un speedrunner\?/);
      await beta.recorder.expectNone(
        {
          titleMatcher: /.*/,
          soundMatcher: /entity\.(wither\.ambient|experience_orb\.pickup|player\.levelup)|block\.anvil\.place/,
        },
        300,
      );

      await alpha.recorder.expectNone({ titleMatcher: /^Bebe$/, chatMatcher: /mesa de crafteo defectuosa/ }, 900);
      assert.equal((await getScore(server.rcon, '$global', 'crafting')).value, 0, '$global crafting must be 0');
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'crafting'), true, 'bebida:crafting must remain granted on BotAlpha');

      // Giving BotAlpha a second crafting_table does NOT re-trigger (advancement not revoked)
      alpha.recorder.clear();
      await server.cmd(`give ${BOT_ALPHA} minecraft:crafting_table`);
      await alpha.recorder.expectNone({ titleMatcher: /.*/, chatMatcher: /<DrinkingCraft>/ }, 700);

      // 2nd player (BotBeta): first natural crafting_table grants advancement permanently (even if 33% RNG misses!)
      beta.recorder.clear();
      alpha.recorder.clear();
      await server.cmd(`give ${BOT_BETA} minecraft:crafting_table`);
      await sleep(250);
      assert.equal(beta.recorder.titles.find((t) => t.text === 'Toma un shot'), undefined, '2nd player must NEVER trigger crafting_actions (Toma un shot)');
      assert.equal(await hasAdvancement(server.rcon, BOT_BETA, 'crafting'), true, 'bebida:crafting must remain granted on BotBeta even if 33% RNG misses');

      let gotDrink = beta.recorder.titles.some((t) => t.text === 'Bebe');
      if (!gotDrink) {
        // Giving another crafting_table while advancement stays granted must NOT re-roll 33% RNG
        beta.recorder.clear();
        await server.cmd(`give ${BOT_BETA} minecraft:crafting_table`);
        await beta.recorder.expectNone({ titleMatcher: /.*/, chatMatcher: /<DrinkingCraft>/ }, 400);
      }

      // Retry until 33% crafting_actions2 hits (revoking explicitly for retry)
      for (let attempt = 0; attempt < 40 && !gotDrink; attempt++) {
        alpha.recorder.clear();
        beta.recorder.clear();
        await server.cmd(`clear ${BOT_BETA} minecraft:crafting_table`);
        await server.cmd(`advancement revoke ${BOT_BETA} only bebida:crafting`);
        await sleep(60);
        await server.cmd(`give ${BOT_BETA} minecraft:crafting_table`);
        await sleep(160);

        const shotHit = beta.recorder.titles.find((t) => t.text === 'Toma un shot');
        assert.equal(shotHit, undefined, '2nd player must NEVER trigger crafting_actions (Toma un shot)');

        if (beta.recorder.titles.some((t) => t.text === 'Bebe')) {
          gotDrink = true;
          break;
        }
      }

      assert.equal(gotDrink, true, '2nd player did not hit 33% crafting_actions2 within 40 attempts');
      const betaTitle = await beta.recorder.waitForTitle('Bebe');
      assert.equal(betaTitle.subtitleAtTime, '', 'crafting_actions2 must have empty subtitle');
      await beta.recorder.waitForSound('entity.experience_orb.pickup');
      await beta.recorder.waitForChat(new RegExp(`${BOT_BETA} consiguió una mesa de crafteo defectuosa`));

      await alpha.recorder.waitForChat(new RegExp(`${BOT_BETA} consiguió una mesa de crafteo defectuosa`));
      await alpha.recorder.expectNone(
        {
          titleMatcher: /.*/,
          soundMatcher: /entity\.(wither\.ambient|experience_orb\.pickup|player\.levelup)|block\.anvil\.place/,
        },
        250,
      );

      // Giving BotBeta another crafting_table while advancement stays granted does NOT re-trigger
      beta.recorder.clear();
      await server.cmd(`give ${BOT_BETA} minecraft:crafting_table`);
      await beta.recorder.expectNone({ titleMatcher: /.*/, chatMatcher: /<DrinkingCraft>/ }, 700);
    });

    test('totem triggers repeatedly in offhand and mainhand without triggering morte or resetting sem_morrer', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await server.cmd(`scoreboard players set ${BOT_ALPHA} sem_morrer 5000`);

      const equipCases = [
        { label: 'offhand', cmd: `item replace entity ${BOT_ALPHA} weapon.offhand with minecraft:totem_of_undying` },
        { label: 'mainhand', cmd: `item replace entity ${BOT_ALPHA} weapon.offhand with minecraft:air` },
      ];

      for (let i = 0; i < equipCases.length; i++) {
        const c = equipCases[i];
        alpha.recorder.clear();
        beta.recorder.clear();
        await server.cmd(c.cmd);
        if (c.label === 'mainhand') {
          await equipHotbar0(server.rcon, alpha, 'minecraft:totem_of_undying');
        } else {
          await sleep(100);
        }
        await server.cmd(`damage ${BOT_ALPHA} 100 minecraft:generic`);

        const title = await alpha.recorder.waitForTitle('Bebe');
        assert.equal(title.subtitleAtTime, '', `totem (${c.label}) must have empty subtitle`);
        await alpha.recorder.waitForSound('entity.experience_orb.pickup');
        await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} engañó a la muerte con un Tótem de la inmortalidad`));
        await alpha.recorder.expectNone({ titleMatcher: /Bébelo todo/, chatMatcher: /murió y ahora tiene que terminarse/ }, 200);

        await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} engañó a la muerte con un Tótem de la inmortalidad`));
        await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/ }, 250);

        assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'totem'), false, `bebida:totem must auto-revoke (${c.label})`);
        const sem = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
        assert.ok(sem.hasScore && sem.value >= 5000, `Totem save must NOT reset sem_morrer, got ${sem.value}`);
        await server.cmd(`effect give ${BOT_ALPHA} minecraft:instant_health 1 10 true`);
        await sleep(150);
      }
    });

    test('passivos ignores environmental/hostile kills, triggers across #bebida:passivos species, auto-revokes, and fires on 5% RNG', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_sword');
      await sleep(650);

      // Edge case 1: Environmental death of passive mob (no player killer) must NOT trigger
      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd('summon minecraft:pig 10.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["test_pig_env"]}');
      await server.cmd('damage @e[tag=test_pig_env,limit=1] 100 minecraft:generic');
      await alpha.recorder.expectNone({ chatMatcher: /<DrinkingCraft>/, titleMatcher: /.*/ }, 300);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'passivos'), false);

      // Edge case 2: Player killing hostile mobs (zombie x20) must NOT trigger passivos
      alpha.recorder.clear();
      for (let h = 0; h < 20; h++) {
        const tag = `test_hostile_${h}`;
        await server.cmd(`summon minecraft:zombie 10.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["${tag}"]}`);
        await server.cmd(`damage @e[tag=${tag},limit=1] 100 minecraft:player_attack by ${BOT_ALPHA}`);
      }
      await sleep(250);
      await server.cmd('kill @e[type=item]').catch(() => {});
      await alpha.recorder.expectNone({ chatMatcher: /mató a un animal indefenso/, titleMatcher: /^Bebe$/ }, 250);
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'passivos'), false);

      // Positive physical kills across multiple #bebida:passivos species (pig, sheep, armadillo)
      alpha.recorder.clear();
      beta.recorder.clear();
      const speciesList = ['pig', 'sheep', 'armadillo'];
      let hit = false;
      for (const species of speciesList) {
        const tag = `test_passive_${species}`;
        await server.cmd(`summon minecraft:${species} 10.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["${tag}"]}`);
        await server.cmd(`damage @e[tag=${tag},limit=1] 9.5 minecraft:generic`);
        const mob = await waitForCondition(
          () => alpha.nearestEntity((e) => e.name === species),
          `${species} visible to BotAlpha`,
          4000,
        );
        await alpha.lookAt(mob.position.offset(0, 0.5, 0), true);
        await alpha.attack(mob);
        await sleep(200);
        await server.cmd('kill @e[type=item]').catch(() => {});

        assert.equal(
          await hasAdvancement(server.rcon, BOT_ALPHA, 'passivos'),
          false,
          `bebida:passivos must auto-revoke immediately after killing ${species}`,
        );
        if (alpha.recorder.titles.some((t) => t.text === 'Bebe')) {
          hit = true;
          break;
        }
      }

      // If 5% RNG missed on the first physical kills, continue rolling bebida:passivos via advancement grant
      if (!hit) {
        for (let attempt = 0; attempt < 300; attempt++) {
          await server.cmd(`advancement grant ${BOT_ALPHA} only bebida:passivos`);
          await sleep(20);
          if (alpha.recorder.titles.some((t) => t.text === 'Bebe')) {
            hit = true;
            break;
          }
        }
      }

      assert.equal(hit, true, 'passivos did not trigger passivos_actions within RNG attempts');
      const title = await alpha.recorder.waitForTitle('Bebe');
      assert.equal(title.subtitleAtTime, '', 'passivos_actions must have empty subtitle');
      await alpha.recorder.waitForSound('entity.experience_orb.pickup');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} mató a un animal indefenso y ahora tiene que beber.`));
      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} mató a un animal indefenso`));
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'passivos'), false);
    });
  });
}
