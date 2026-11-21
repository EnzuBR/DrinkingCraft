import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import mineflayer from 'mineflayer';
import { Vec3 } from 'vec3';

const require = createRequire(import.meta.url);
const prismarineChatLoader = require('prismarine-chat');

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForCondition(fn, description, timeoutMs = 5000, intervalMs = 50) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fn();
      if (res) return res;
    } catch (err) {
      lastError = err;
    }
    await sleep(intervalMs);
  }
  const suffix = lastError ? ` (last error: ${lastError.message})` : '';
  throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${description}${suffix}`);
}

function normalizeSoundName(name) {
  if (!name) return '';
  return String(name).replace(/^minecraft:/, '');
}

function matchValue(actual, matcher) {
  if (typeof matcher === 'function') return Boolean(matcher(actual));
  if (matcher instanceof RegExp) return matcher.test(String(actual ?? ''));
  return String(actual ?? '') === String(matcher);
}

export function extractChatText(ChatMessage, raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractChatText(ChatMessage, parsed);
      } catch {
        return raw;
      }
    }
    return raw;
  }

  if (typeof raw === 'object') {
    if (raw.type === 'string' && typeof raw.value === 'string') {
      return raw.value;
    }
    try {
      const parsed = ChatMessage.fromNotch(raw);
      if (parsed && typeof parsed.toString === 'function') {
        return parsed.toString();
      }
    } catch {
      // fallback manual extraction below
    }
    if (raw.type === 'compound' && raw.value) {
      return extractNbtCompoundText(raw.value);
    }
    if (typeof raw.text === 'string') {
      const extra = Array.isArray(raw.extra) ? raw.extra.map((e) => extractChatText(ChatMessage, e)).join('') : '';
      return `${raw.text}${extra}`;
    }
  }

  return String(raw);
}

function extractNbtCompoundText(comp) {
  if (!comp || typeof comp !== 'object') return '';
  let out = '';
  if (comp.text?.value !== undefined) {
    out += String(comp.text.value);
  }
  if (comp.extra?.value?.value && Array.isArray(comp.extra.value.value)) {
    for (const item of comp.extra.value.value) {
      if (typeof item === 'string') out += item;
      else if (item && typeof item === 'object') out += extractNbtCompoundText(item);
    }
  }
  return out;
}

export class BotRecorder {
  constructor(bot) {
    this.bot = bot;
    this.ChatMessage = prismarineChatLoader(bot.registry);
    this.chats = [];
    this.titles = [];
    this.subtitles = [];
    this.titleTimes = [];
    this.sounds = [];
    this.lastSubtitle = null;
    this._attach();
  }

  _attach() {
    this.bot.on('messagestr', (message, position) => {
      this.chats.push({ text: message, position, ts: Date.now() });
    });

    this.bot._client.on('set_title_subtitle', (packet) => {
      const text = extractChatText(this.ChatMessage, packet?.text);
      const entry = { text, raw: packet?.text, ts: Date.now() };
      this.lastSubtitle = text;
      this.subtitles.push(entry);
    });

    this.bot._client.on('set_title_text', (packet) => {
      const text = extractChatText(this.ChatMessage, packet?.text);
      this.titles.push({
        text,
        subtitleAtTime: this.lastSubtitle,
        raw: packet?.text,
        ts: Date.now(),
      });
    });

    this.bot._client.on('set_title_time', (packet) => {
      this.titleTimes.push({
        fadeIn: packet?.fadeIn,
        stay: packet?.stay,
        fadeOut: packet?.fadeOut,
        ts: Date.now(),
      });
    });

    this.bot._client.on('sound_effect', (packet) => {
      let rawName = null;
      let soundId = null;

      if (packet?.sound) {
        if (packet.sound.data?.soundName) {
          rawName = packet.sound.data.soundName;
        } else if (packet.sound.soundId !== undefined) {
          soundId = packet.sound.soundId;
        }
      } else if (packet?.soundId !== undefined) {
        soundId = packet.soundId;
      }

      if (!rawName && soundId !== null && soundId !== undefined) {
        rawName = this.bot.registry?.sounds?.[soundId]?.name || `sound#${soundId}`;
      }

      this.sounds.push({
        name: normalizeSoundName(rawName),
        soundId,
        volume: packet?.volume,
        pitch: packet?.pitch,
        x: packet?.x != null ? packet.x / 8 : null,
        y: packet?.y != null ? packet.y / 8 : null,
        z: packet?.z != null ? packet.z / 8 : null,
        ts: Date.now(),
      });
    });

    this.bot._client.on('named_sound_effect', (packet) => {
      this.sounds.push({
        name: normalizeSoundName(packet?.soundName),
        soundId: null,
        volume: packet?.volume,
        pitch: packet?.pitch,
        x: packet?.x != null ? packet.x / 8 : null,
        y: packet?.y != null ? packet.y / 8 : null,
        z: packet?.z != null ? packet.z / 8 : null,
        ts: Date.now(),
      });
    });
  }

  clear({ resetLastSubtitle = false } = {}) {
    this.chats.length = 0;
    this.titles.length = 0;
    this.subtitles.length = 0;
    this.titleTimes.length = 0;
    this.sounds.length = 0;
    if (resetLastSubtitle) {
      this.lastSubtitle = null;
    }
  }

  async waitForChat(matcher, timeoutMs = 4500) {
    return waitForCondition(
      () => this.chats.find((c) => matchValue(c.text, matcher)),
      `chat matching ${matcher} on ${this.bot.username}`,
      timeoutMs,
    );
  }

  async waitForTitle(matcher, timeoutMs = 4500) {
    return waitForCondition(
      () => this.titles.find((t) => matchValue(t.text, matcher)),
      `title matching ${matcher} on ${this.bot.username}`,
      timeoutMs,
    );
  }

  async waitForSubtitle(matcher, timeoutMs = 4500) {
    return waitForCondition(
      () => this.subtitles.find((s) => matchValue(s.text, matcher)),
      `subtitle matching ${matcher} on ${this.bot.username}`,
      timeoutMs,
    );
  }

  async waitForSound(matcher, timeoutMs = 4500) {
    return waitForCondition(
      () => this.sounds.find((s) => matchValue(normalizeSoundName(s.name), matcher)),
      `sound matching ${matcher} on ${this.bot.username}`,
      timeoutMs,
    );
  }

  async expectNone({ chatMatcher = null, titleMatcher = null, subtitleMatcher = null, soundMatcher = null } = {}, waitMs = 1000) {
    await sleep(waitMs);
    if (chatMatcher) {
      const hit = this.chats.find((c) => matchValue(c.text, chatMatcher));
      assert.equal(hit, undefined, `Expected no chat matching ${chatMatcher} on ${this.bot.username}, but got: "${hit?.text}"`);
    }
    if (titleMatcher) {
      const hit = this.titles.find((t) => matchValue(t.text, titleMatcher));
      assert.equal(hit, undefined, `Expected no title matching ${titleMatcher} on ${this.bot.username}, but got: "${hit?.text}"`);
    }
    if (subtitleMatcher) {
      const hit = this.subtitles.find((s) => matchValue(s.text, subtitleMatcher));
      assert.equal(hit, undefined, `Expected no subtitle matching ${subtitleMatcher} on ${this.bot.username}, but got: "${hit?.text}"`);
    }
    if (soundMatcher) {
      const hit = this.sounds.find((s) => matchValue(normalizeSoundName(s.name), soundMatcher));
      assert.equal(hit, undefined, `Expected no sound matching ${soundMatcher} on ${this.bot.username}, but got: "${hit?.name}"`);
    }
  }
}

export async function connectBot({ username, host, port, version, timeoutMs = 20_000 }) {
  return new Promise((resolve, reject) => {
    const bot = mineflayer.createBot({
      host,
      port,
      username,
      version,
      auth: 'offline',
      hideErrors: false,
      checkTimeoutInterval: 30_000,
    });

    const origWrite = bot._client.write.bind(bot._client);
    bot._client.write = (name, params) => {
      const res = origWrite(name, params);
      if (bot._client.state === 'play' && /^(position|position_look|look|flying)$/.test(name)) {
        origWrite('tick_end', {});
      }
      return res;
    };

    const recorder = new BotRecorder(bot);
    bot.recorder = recorder;

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          bot.end('spawn timeout');
        } catch {
          // ignore
        }
        reject(new Error(`Bot ${username} did not spawn within ${timeoutMs}ms`));
      }
    }, timeoutMs);

    const onError = (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Bot ${username} connection error: ${err?.message || err}`));
      }
    };

    const onKicked = (reason) => {
      const msg = typeof reason === 'string' ? reason : JSON.stringify(reason);
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Bot ${username} was kicked before spawn: ${msg}`));
      } else {
        console.warn(`[bot:${username}] Kicked: ${msg}`);
      }
    };

    bot.once('error', onError);
    bot.once('kicked', onKicked);
    bot.once('spawn', async () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      bot.removeListener('error', onError);

      // Wrap digTime for 26.x slot components where item.enchants may be an object instead of an array
      const getSafeEnchants = (item) => {
        if (!item) return [];
        if (Array.isArray(item.enchants)) return item.enchants;
        const list =
          item.enchants?.enchantments ??
          item.componentMap?.get('enchantments')?.data?.enchantments;
        if (Array.isArray(list)) {
          return list.map((e) => ({
            name:
              typeof e.id === 'number'
                ? bot.registry?.enchantments?.[e.id]?.name || ''
                : String(e.id || '').replace(/^minecraft:/, ''),
            lvl: e.level ?? e.lvl ?? 1,
          }));
        }
        return [];
      };
      bot.digTime = (block) => {
        const held = bot.heldItem;
        const head = bot.inventory?.slots?.[bot.getEquipmentDestSlot('head')];
        const enchantments = [...getSafeEnchants(held), ...getSafeEnchants(head)];
        const type = held ? held.type : null;
        const creative = bot.game.gameMode === 'creative';
        const inWater = ['water', 'flowing_water'].includes(bot._getBlockAtEyeLevel()?.name);
        const computed = block.digTime(type, creative, inWater, !bot.entity.onGround, enchantments, bot.entity.effects);

        // 26.1 minecraft-data omits netherite/diamond pickaxe multipliers for incorrect_for_wooden_tool blocks (e.g. obsidian)
        if (!creative && held && /^(netherite|diamond)_pickaxe$/.test(held.name) && block.hardness > 0 && computed >= 10000) {
          let speed = held.name === 'netherite_pickaxe' ? 9 : 8;
          const eff = enchantments.find((e) => e.name === 'efficiency')?.lvl || 0;
          if (eff > 0) speed += eff * eff + 1;
          const hasteDesc = bot.registry?.effectsByName?.Haste || bot.registry?.effectsByName?.haste;
          const hasteLevel = hasteDesc && bot.entity.effects?.[hasteDesc.id] ? bot.entity.effects[hasteDesc.id].amplifier + 1 : 0;
          if (hasteLevel > 0) speed *= 1 + 0.2 * hasteLevel;
          if (!bot.entity.onGround) speed /= 5;
          const ticks = Math.ceil((block.hardness * 30) / speed) + 4;
          return ticks * 50;
        }
        return computed;
      };

      // Small grace wait so join tick + initial packets flush
      await sleep(150);
      resolve(bot);
    });
  });
}

export async function disconnectBot(bot) {
  if (!bot) return;
  try {
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      bot.once('end', finish);
      try {
        bot.quit();
      } catch {
        try {
          bot.end();
        } catch {
          finish();
        }
      }
      setTimeout(finish, 1500);
    });
  } catch {
    // ignore
  }
}

export async function preparePlayer(rcon, bot, { x, y, z, gamemode = 'survival', yaw = 0, pitch = 0 }) {
  const user = bot.username;
  await rcon.send(`gamemode ${gamemode} ${user}`);
  await rcon.send(`clear ${user}`);
  await rcon.send(`effect clear ${user}`);
  await rcon.send(`tp ${user} ${x} ${y} ${z} ${yaw} ${pitch}`);
  await waitForCondition(() => {
    if (!bot.entity?.position) return false;
    const dx = Math.abs(bot.entity.position.x - x);
    const dy = Math.abs(bot.entity.position.y - y);
    const dz = Math.abs(bot.entity.position.z - z);
    return dx < 1.5 && dy < 1.5 && dz < 1.5;
  }, `${user} teleport to (${x}, ${y}, ${z})`, 5000);
  await sleep(150);
}

export async function equipHotbar0(rcon, bot, itemSpec) {
  const user = bot.username;
  const expectedItemName = itemSpec.split('[')[0].replace(/^minecraft:/, '');
  await rcon.send(`item replace entity ${user} hotbar.0 with ${itemSpec}`);
  bot.setQuickBarSlot(0);
  await waitForCondition(() => {
    const held = bot.heldItem;
    return held && held.name === expectedItemName;
  }, `${user} holding ${expectedItemName}`, 4000);
  await sleep(100);
}

export async function placeAndDig(rcon, bot, pos, blockId) {
  const shortName = blockId.replace(/^minecraft:/, '');
  const vec = new Vec3(pos.x, pos.y, pos.z);
  await rcon.send(`setblock ${pos.x} ${pos.y} ${pos.z} ${blockId}`);
  const block = await waitForCondition(() => {
    const b = bot.blockAt(vec);
    return b && b.name === shortName ? b : null;
  }, `block ${shortName} at (${pos.x}, ${pos.y}, ${pos.z})`, 5000);

  await bot.lookAt(vec.offset(0.5, 0.5, 0.5), true);
  await sleep(60);
  await bot.dig(block, true);
  // Wait for server to process mined stat + .tick reset and clear item drops
  await sleep(200);
  await rcon.send('kill @e[type=item]').catch(() => {});
}

export async function getScore(rcon, target, objective) {
  const raw = await rcon.send(`scoreboard players get ${target} ${objective}`);
  if (/none is set|Can't get value/i.test(raw)) {
    return { hasScore: false, value: null, raw };
  }
  const match = raw.match(/has (-?\d+)\b/);
  if (match) {
    return { hasScore: true, value: Number.parseInt(match[1], 10), raw };
  }
  throw new Error(`Unexpected scoreboard output for ${target} ${objective}: "${raw}"`);
}

export async function hasTag(rcon, username, tag) {
  const raw = await rcon.send(`tag ${username} list`);
  if (/has no tags/i.test(raw)) return false;
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return false;
  const tags = raw
    .slice(colonIdx + 1)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return tags.includes(tag);
}

export async function hasAdvancement(rcon, username, advName) {
  const raw = await rcon.send(`execute if entity @a[name=${username},advancements={bebida:${advName}=true}]`);
  if (/Test passed/i.test(raw)) return true;
  if (raw.trim() === '' || /Test failed/i.test(raw)) return false;
  throw new Error(`Unexpected advancement check output for ${username} ${advName}: "${raw}"`);
}

export function startFallFlying(bot) {
  bot._client.write('entity_action', {
    entityId: bot.entity.id,
    actionId: 'start_fall_flying',
    jumpBoost: 0,
  });
}

export function clearRconFeedback(output) {
  return String(output || '').trim();
}

export async function ensureBotsConnected(ctx, { host, port, version, alphaName, betaName }) {
  if (!ctx.bots.alpha) {
    ctx.bots.alpha = await connectBot({ username: alphaName, host, port, version });
    await sleep(300);
    ctx.bots.alpha.recorder.clear({ resetLastSubtitle: true });
  }
  if (!ctx.bots.beta) {
    ctx.bots.beta = await connectBot({ username: betaName, host, port, version });
    await sleep(300);
    ctx.bots.beta.recorder.clear({ resetLastSubtitle: true });
  }
  return ctx.bots;
}
