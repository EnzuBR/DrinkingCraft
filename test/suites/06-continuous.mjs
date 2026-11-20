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
    test('morte triggers Drink it all + anvil sound for @s and resets both mortes and sem_morrer', async (ctx) => {
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

      // Put sem_morrer near threshold to prove death resets it and prevents false sem_morrer trigger
      await server.cmd(`scoreboard players set ${BOT_ALPHA} sem_morrer 11985`);
      alpha.recorder.clear();
      beta.recorder.clear();

      await server.cmd(`kill ${BOT_ALPHA}`);

      const title = await alpha.recorder.waitForTitle('Bébelo todo');
      assert.equal(title.subtitleAtTime, '', `morte should clear subtitle, got "${title.subtitleAtTime}"`);
      await alpha.recorder.waitForSound('block.anvil.place');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} murió y ahora tiene que terminarse su bebida\\.`));

      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} murió y ahora tiene que terminarse su bebida\\.`));
      await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /block\.anvil\.place/ }, 1500);

      await alpha.recorder.expectNone({ chatMatcher: /demasiado tiempo sin morir/ }, 200);

      const mortes = await getScore(server.rcon, BOT_ALPHA, 'mortes');
      assert.equal(mortes.hasScore, false, 'mortes score must be reset after morte_actions');

      const semMorrer = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      assert.ok(!semMorrer.hasScore || semMorrer.value < 200, `sem_morrer must reset on death, got ${semMorrer.value}`);
    });

    test('sem_morrer triggers at >= 12000 ticks and resets counter', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      alpha.recorder.clear();
      beta.recorder.clear();
      await server.cmd(`scoreboard players set ${BOT_ALPHA} sem_morrer 11990`);

      const title = await alpha.recorder.waitForTitle('Bebe', 6000);
      assert.equal(title.subtitleAtTime, '', 'sem_morrer should have empty subtitle');
      await alpha.recorder.waitForSound('entity.experience_orb.pickup');
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} lleva demasiado tiempo sin morir`));

      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} lleva demasiado tiempo sin morir`));
      await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/ }, 400);

      const semMorrer = await getScore(server.rcon, BOT_ALPHA, 'sem_morrer');
      assert.ok(!semMorrer.hasScore || semMorrer.value < 100, `sem_morrer must reset after trigger, got ${semMorrer.value}`);
    });

    test('quebrou triggers repeatedly on tool break and also triggers on Elytra (durability <= 1)', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      // 1st and 2nd broken wooden pickaxe (max durability 59 -> damage 58 leaves 1 use)
      for (let i = 1; i <= 2; i++) {
        alpha.recorder.clear();
        beta.recorder.clear();
        await equipHotbar0(server.rcon, alpha, 'minecraft:wooden_pickaxe[minecraft:damage=58]');
        await placeAndDig(server.rcon, alpha, DIG_BLOCK_POS, 'minecraft:stone');

        const title = await alpha.recorder.waitForTitle('Bebe');
        assert.equal(title.subtitleAtTime, '', `quebrou (${i}) should have empty subtitle`);
        await alpha.recorder.waitForSound('entity.experience_orb.pickup');
        await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} rompió una pieza de equipo y ahora tiene que beber\\.`));

        await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} rompió una pieza de equipo`));
        await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/ }, 300);

        assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'quebrou'), false, `bebida:quebrou must auto-revoke (#${i})`);
      }

      // Elytra durability 2 -> 1 (max durability 432 -> damage 430 leaves 2; 1s of gliding drops to 1)
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

      await alpha.recorder.expectNone({ titleMatcher: /^Bebe$/, chatMatcher: /mesa de crafteo defectuosa/ }, 900);
      assert.equal((await getScore(server.rcon, '$global', 'crafting')).value, 0, '$global crafting must be 0');

      // Giving BotAlpha a second crafting_table does NOT re-trigger (advancement not revoked)
      alpha.recorder.clear();
      await server.cmd(`give ${BOT_ALPHA} minecraft:crafting_table`);
      await alpha.recorder.expectNone({ titleMatcher: /.*/, chatMatcher: /<DrinkingCraft>/ }, 700);

      // 2nd player (BotBeta): can NEVER get Toma un shot, and has 33% chance to get Bebe
      let gotDrink = false;
      for (let attempt = 0; attempt < 40; attempt++) {
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

      // Giving BotBeta another crafting_table while advancement stays granted does NOT re-trigger
      beta.recorder.clear();
      await server.cmd(`give ${BOT_BETA} minecraft:crafting_table`);
      await beta.recorder.expectNone({ titleMatcher: /.*/, chatMatcher: /<DrinkingCraft>/ }, 700);
    });

    test('totem triggers repeatedly on Totem of Undying activation and auto-revokes', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });

      for (let i = 1; i <= 2; i++) {
        alpha.recorder.clear();
        beta.recorder.clear();
        await server.cmd(`item replace entity ${BOT_ALPHA} weapon.offhand with minecraft:totem_of_undying`);
        await sleep(100);
        await server.cmd(`damage ${BOT_ALPHA} 100 minecraft:generic`);

        const title = await alpha.recorder.waitForTitle('Bebe');
        assert.equal(title.subtitleAtTime, '', `totem (#${i}) must have empty subtitle`);
        await alpha.recorder.waitForSound('entity.experience_orb.pickup');
        await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} engañó a la muerte con un Tótem de la inmortalidad`));

        await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} engañó a la muerte con un Tótem de la inmortalidad`));
        await beta.recorder.expectNone({ titleMatcher: /.*/, soundMatcher: /entity\.experience_orb\.pickup/ }, 250);

        assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'totem'), false, `bebida:totem must auto-revoke (#${i})`);
        await server.cmd(`effect give ${BOT_ALPHA} minecraft:instant_health 1 10 true`);
        await sleep(150);
      }
    });

    test('passivos triggers via #bebida:passivos on passive mob kill, auto-revokes, and fires passivos_actions on 5% RNG', async ({ server, bots }) => {
      const { alpha, beta } = bots;
      await preparePlayer(server.rcon, alpha, { ...ARENA_POS, gamemode: 'survival' });
      await equipHotbar0(server.rcon, alpha, 'minecraft:diamond_sword');
      await sleep(650);

      alpha.recorder.clear();
      beta.recorder.clear();

      // Kill up to 3 real pigs first to prove physical kill triggers & revokes bebida:passivos
      let hit = false;
      for (let k = 0; k < 3; k++) {
        await server.cmd('summon minecraft:pig 10.5 100 12.0 {NoAI:1b,Silent:1b,Tags:["test_pig"]}');
        await server.cmd('damage @e[tag=test_pig,limit=1] 9.5 minecraft:generic');
        const pig = await waitForCondition(
          () => alpha.nearestEntity((e) => e.name === 'pig'),
          'Pig visible to BotAlpha',
          4000,
        );
        await alpha.lookAt(pig.position.offset(0, 0.5, 0), true);
        await alpha.attack(pig);
        await sleep(200);
        await server.cmd('kill @e[type=item]').catch(() => {});

        assert.equal(
          await hasAdvancement(server.rcon, BOT_ALPHA, 'passivos'),
          false,
          'bebida:passivos must auto-revoke immediately after passive kill',
        );
        if (alpha.recorder.titles.some((t) => t.text === 'Bebe')) {
          hit = true;
          break;
        }
      }

      // If 5% RNG missed on the first 3 real kills, continue rolling bebida:passivos via advancement grant
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
      await alpha.recorder.waitForChat(new RegExp(`${BOT_ALPHA} mató a un animal indefenso y ahora tiene que beber\\.`));
      await beta.recorder.waitForChat(new RegExp(`${BOT_ALPHA} mató a un animal indefenso`));
      assert.equal(await hasAdvancement(server.rcon, BOT_ALPHA, 'passivos'), false);
    });
  });
}
