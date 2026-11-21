import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEST_DIR = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(TEST_DIR, '..');
export const RELEASES_DIR = path.join(REPO_ROOT, 'releases');
export const SHARED_TEST_JRE_DIR = path.join(REPO_ROOT, 'test', '.runtime', 'jre25');

export const RUNTIME_DIR = path.join(TEST_DIR, '.runtime');
export const DOWNLOADS_DIR = path.join(RUNTIME_DIR, 'downloads');
export const JRE_DIR = path.join(RUNTIME_DIR, 'jre25');
export const JAR_INSPECT_DIR = path.join(RUNTIME_DIR, 'jar-inspect');
export const VIAPROXY_DIR = path.join(RUNTIME_DIR, 'viaproxy');
export const VIAPROXY_JAR_PATH = path.join(VIAPROXY_DIR, 'ViaProxy.jar');
export const SERVERS_DIR = path.join(TEST_DIR, 'servers');
export const VERSIONS_CACHE_PATH = path.join(RUNTIME_DIR, 'versions.json');

export const MC_VERSION = '26.3';
export const SUPPORTED_LOADERS = ['fabric', 'neoforge', 'forge'];

export const SERVER_HOST = '127.0.0.1';
export const BACKEND_PORT = Number.parseInt(process.env.MC_BACKEND_PORT || '25570', 10);
export const MC_PORT = Number.parseInt(process.env.MC_PORT || '25571', 10);
export const RCON_PORT = Number.parseInt(process.env.MC_RCON_PORT || '25580', 10);
export const RCON_PASSWORD = process.env.MC_RCON_PASSWORD || 'drinkingcraft_mod_test_rcon';
export const BOT_VERSION = process.env.MC_BOT_VERSION || '26.1';

export const USER_AGENT = 'DrinkingCraft-ModTestHarness/1.0.0 (https://github.com/EnzuBR/DrinkingCraft)';

export const BOT_ALPHA = 'BotAlpha';
export const BOT_BETA = 'BotBeta';

export const ARENA_POS = { x: 10.5, y: 100, z: 10.5 };
export const DISTANT_POS = { x: 150.5, y: 100, z: 0.5 };
export const DIG_BLOCK_POS = { x: 10, y: 101, z: 12 };
export const BOT_LOOK_BLOCK_POS = { x: 10.5, y: 100, z: 10.5 };

export function getLoaderPaths(loader) {
  const serverDir = path.join(SERVERS_DIR, loader);
  const worldDir = path.join(serverDir, 'world');
  return {
    serverDir,
    modsDir: path.join(serverDir, 'mods'),
    worldDir,
    datapacksDir: path.join(worldDir, 'datapacks'),
  };
}

export const EXPECTED_GLOBAL_OBJECTIVES = [
  'full_dima',
  'full_netherite',
  'debris',
  'nether',
  'ender_dragon',
  'end',
  'stronghold',
  'crafting',
  'cogu',
  'return',
  'fortaleza',
  'trade',
  'trial',
  'warden',
  'elytra_first',
];

export const EXPECTED_MINING_OBJECTIVES = [
  'diamante',
  'diamante_deep',
  'obsidian',
  'obsidian_cry',
  'ferro',
  'ferro_deep',
  'carvao',
  'carvao_deep',
  'ouro',
  'ouro_deep',
  'ouro_nether',
  'esmeralda',
  'esmeralda_deep',
];

export const EXPECTED_CONTINUOUS_OBJECTIVES = [
  'mortes',
  'sem_morrer',
];

export const EXPECTED_OBJECTIVES = [
  ...EXPECTED_GLOBAL_OBJECTIVES,
  ...EXPECTED_MINING_OBJECTIVES,
  ...EXPECTED_CONTINUOUS_OBJECTIVES,
];

export const EXPECTED_ADVANCEMENTS = [
  'cogu',
  'crafting',
  'debris',
  'elytra',
  'end',
  'ender_dragon',
  'fortaleza',
  'full_dima',
  'full_netherite',
  'nether',
  'passivos',
  'quebrou',
  'return',
  'stronghold',
  'totem',
  'trade',
  'trial',
  'warden',
];

export const LOCALES = {
  en: {
    lang: 'en',
    titles: {
      takeAShot: 'Take a shot',
      drink: 'Drink',
      drinkItAll: 'Drink it all',
      everyoneDrinks: 'Everyone drinks',
      everyoneShot: 'Everyone takes a shot',
      chooseSomeone: 'Choose someone',
    },
    subtitles: {
      toDrink: 'To drink',
      toTakeAShot: 'To take a shot',
      exceptYou: 'Except you',
      exceptPlayer: (player) => `Except ${player}`,
    },
    chat: {
      firstJoin: (player) => new RegExp(`${player} has just joined for the first time`),
      firstJoinAny: /joined for the first time/,
      fullDima: (player) => new RegExp(`${player} was the first to get Full Diamond armor.*except ${player}!`),
      debris: (player) => new RegExp(`${player} found the first Ancient Debris`),
      obsidian: /broke an obsidian a bit poorly/,
      morte: (player) => new RegExp(`${player} died and now has to finish their drink!`),
      semMorrer: (player) => new RegExp(`${player} has gone too long without dying`),
      semMorrerAny: /too long without dying/,
      quebrou: (player) => new RegExp(`${player} broke a piece of equipment and must now drink!`),
      quebrouAny: /broke a piece of equipment/,
      crafting1: /What are you, a speedrunner\?/,
      crafting2: (player) => new RegExp(`${player} has gotten a bad crafting table`),
      crafting2Any: /bad crafting table/,
      totem: (player) => new RegExp(`${player} cheated death with a Totem of Undying`),
      passivos: (player) => new RegExp(`${player} killed a defenseless animal and must now drink!`),
      passivosAny: /killed a defenseless animal/,
    },
    globalMilestones: [
      {
        name: 'full_dima',
        adv: 'full_dima',
        globalObj: 'full_dima',
        scope: 'everyone_except',
        title: 'Everyone drinks',
        sound: 'entity.player.levelup',
        chatContains: 'first to get Full Diamond armor',
      },
      {
        name: 'debris',
        adv: 'debris',
        globalObj: 'debris',
        scope: 'self_only',
        title: 'Choose someone',
        subtitle: 'To take a shot',
        sound: 'entity.wither.ambient',
        chatContains: 'found the first Ancient Debris',
      },
      {
        name: 'elytra',
        adv: 'elytra',
        globalObj: 'elytra_first',
        scope: 'self_only',
        title: 'Choose someone',
        subtitle: 'To take a shot',
        sound: 'entity.wither.ambient',
        chatContains: 'got the first Elytra',
      },
      {
        name: 'full_netherite',
        adv: 'full_netherite',
        globalObj: 'full_netherite',
        scope: 'everyone_except',
        title: 'Everyone takes a shot',
        sound: 'entity.wither.ambient',
        chatContains: 'first to get Full Netherite armor',
      },
      {
        name: 'nether',
        adv: 'nether',
        globalObj: 'nether',
        scope: 'everyone',
        title: 'Everyone drinks',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'ventured into the Nether',
      },
      {
        name: 'end',
        adv: 'end',
        globalObj: 'end',
        scope: 'everyone',
        title: 'Everyone takes a shot',
        subtitle: '',
        sound: 'entity.wither.ambient',
        chatContains: "We've reached the End",
      },
      {
        name: 'warden',
        adv: 'warden',
        globalObj: 'warden',
        scope: 'everyone_except',
        title: 'Everyone takes a shot',
        sound: 'entity.wither.ambient',
        chatContains: 'brave enough to slay the Warden',
      },
      {
        name: 'cogu',
        adv: 'cogu',
        globalObj: 'cogu',
        scope: 'everyone_except',
        title: 'Everyone drinks',
        sound: 'entity.player.levelup',
        chatContains: 'first to find the mushroom biome',
      },
      {
        name: 'fortaleza',
        adv: 'fortaleza',
        globalObj: 'fortaleza',
        scope: 'everyone',
        title: 'Everyone drinks',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'found the first Nether Fortress',
      },
      {
        name: 'stronghold',
        adv: 'stronghold',
        globalObj: 'stronghold',
        scope: 'everyone',
        title: 'Everyone drinks',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'found the Stronghold',
      },
      {
        name: 'trial',
        adv: 'trial',
        globalObj: 'trial',
        scope: 'everyone',
        title: 'Everyone drinks',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'discovered the Trial Chambers',
      },
      {
        name: 'trade',
        adv: 'trade',
        globalObj: 'trade',
        scope: 'everyone',
        title: 'Everyone drinks',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'made the first trade with a villager',
      },
      {
        name: 'ender_dragon',
        adv: 'ender_dragon',
        globalObj: 'ender_dragon',
        scope: 'everyone',
        title: 'Everyone takes a shot',
        subtitle: '',
        sound: 'entity.wither.ambient',
        chatContains: 'killed the Ender Dragon',
      },
      {
        name: 'return',
        adv: 'return',
        globalObj: 'return',
        scope: 'self_only',
        title: 'Choose someone',
        subtitle: 'To take a shot',
        sound: 'entity.wither.ambient',
        chatContains: 'kill a Ghast by deflecting its fireball',
      },
    ],
    miningOrbits: [
      {
        fnName: 'diamante',
        checksSilkTouch: true,
        chance: 0.25,
        scope: 'everyone_except',
        title: 'Everyone drinks',
        sound: 'entity.player.levelup',
        chatContains: 'has mined an outstanding diamond',
        variants: [
          { obj: 'diamante', block: 'minecraft:diamond_ore' },
          { obj: 'diamante_deep', block: 'minecraft:deepslate_diamond_ore' },
        ],
      },
      {
        fnName: 'ouro',
        checksSilkTouch: true,
        chance: 0.075,
        scope: 'self_only',
        title: 'Choose someone',
        subtitle: 'To drink',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'has mined a 24K gold ore',
        variants: [
          { obj: 'ouro', block: 'minecraft:gold_ore' },
          { obj: 'ouro_deep', block: 'minecraft:deepslate_gold_ore' },
          { obj: 'ouro_nether', block: 'minecraft:nether_gold_ore' },
        ],
      },
      {
        fnName: 'esmeralda',
        checksSilkTouch: true,
        chance: 0.075,
        scope: 'self_only',
        title: 'Choose someone',
        subtitle: 'To drink',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'has mined a very shiny emerald',
        variants: [
          { obj: 'esmeralda', block: 'minecraft:emerald_ore' },
          { obj: 'esmeralda_deep', block: 'minecraft:deepslate_emerald_ore' },
        ],
      },
      {
        fnName: 'ferro',
        checksSilkTouch: true,
        chance: 0.04,
        scope: 'self_only',
        title: 'Choose someone',
        subtitle: 'To drink',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'has mined a lucky iron',
        variants: [
          { obj: 'ferro', block: 'minecraft:iron_ore' },
          { obj: 'ferro_deep', block: 'minecraft:deepslate_iron_ore' },
        ],
      },
      {
        fnName: 'carvao',
        checksSilkTouch: true,
        chance: 0.03,
        scope: 'self_only',
        title: 'Choose someone',
        subtitle: 'To drink',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'has perfectly mined a coal ore',
        variants: [
          { obj: 'carvao', block: 'minecraft:coal_ore' },
          { obj: 'carvao_deep', block: 'minecraft:deepslate_coal_ore' },
        ],
      },
      {
        fnName: 'obsidian',
        checksSilkTouch: false,
        chance: 0.05,
        scope: 'self_only',
        title: 'Drink',
        subtitle: '',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'broke an obsidian a bit poorly',
        variants: [
          { obj: 'obsidian', block: 'minecraft:obsidian' },
          { obj: 'obsidian_cry', block: 'minecraft:crying_obsidian' },
        ],
      },
    ],
  },
  pt: {
    lang: 'pt',
    titles: {
      takeAShot: 'Dê um shot',
      drink: 'Beba',
      drinkItAll: 'Beba tudo',
      everyoneDrinks: 'Todos bebem',
      everyoneShot: 'Todos dão um shot',
      chooseSomeone: 'Escolha alguém',
    },
    subtitles: {
      toDrink: 'Para beber',
      toTakeAShot: 'Para dar um shot',
      exceptYou: 'Menos você',
      exceptPlayer: (player) => `Menos ${player}`,
    },
    chat: {
      firstJoin: (player) => new RegExp(`${player} acabou de entrar pela primeira vez`),
      firstJoinAny: /entrar pela primeira vez/,
      fullDima: (player) => new RegExp(`${player} foi o primeiro a conseguir Full Dima.*menos ${player}!`),
      debris: (player) => new RegExp(`${player} encontrou o primeiro Ancient Debris`),
      obsidian: /quebrou um obsidian meio mal/,
      morte: (player) => new RegExp(`${player} morreu e agora tem que acabar sua bebida!`),
      semMorrer: (player) => new RegExp(`${player} ficou muito tempo sem morrer`),
      semMorrerAny: /muito tempo sem morrer/,
      quebrou: (player) => new RegExp(`${player} quebrou um equipamento e agora deve beber!`),
      quebrouAny: /quebrou um equipamento/,
      crafting1: /Tá achando que é speedrun\?/,
      crafting2: (player) => new RegExp(`${player} conseguiu uma crafting table falsificada`),
      crafting2Any: /crafting table falsificada/,
      totem: (player) => new RegExp(`${player} enganou a morte com um Totem da Imortalidade`),
      passivos: (player) => new RegExp(`${player} matou um animal indefeso e agora deve beber!`),
      passivosAny: /matou um animal indefeso/,
    },
    globalMilestones: [
      {
        name: 'full_dima',
        adv: 'full_dima',
        globalObj: 'full_dima',
        scope: 'everyone_except',
        title: 'Todos bebem',
        sound: 'entity.player.levelup',
        chatContains: 'primeiro a conseguir Full Dima',
      },
      {
        name: 'debris',
        adv: 'debris',
        globalObj: 'debris',
        scope: 'self_only',
        title: 'Escolha alguém',
        subtitle: 'Para dar um shot',
        sound: 'entity.wither.ambient',
        chatContains: 'encontrou o primeiro Ancient Debris',
      },
      {
        name: 'elytra',
        adv: 'elytra',
        globalObj: 'elytra_first',
        scope: 'self_only',
        title: 'Escolha alguém',
        subtitle: 'Para dar um shot',
        sound: 'entity.wither.ambient',
        chatContains: 'conseguiu a primeira Elytra',
      },
      {
        name: 'full_netherite',
        adv: 'full_netherite',
        globalObj: 'full_netherite',
        scope: 'everyone_except',
        title: 'Todos dão um shot',
        sound: 'entity.wither.ambient',
        chatContains: 'primeiro a conseguir Full Netherite',
      },
      {
        name: 'nether',
        adv: 'nether',
        globalObj: 'nether',
        scope: 'everyone',
        title: 'Todos bebem',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'desbravou o Nether',
      },
      {
        name: 'end',
        adv: 'end',
        globalObj: 'end',
        scope: 'everyone',
        title: 'Todos dão um shot',
        subtitle: '',
        sound: 'entity.wither.ambient',
        chatContains: 'Chegamos no End',
      },
      {
        name: 'warden',
        adv: 'warden',
        globalObj: 'warden',
        scope: 'everyone_except',
        title: 'Todos dão um shot',
        sound: 'entity.wither.ambient',
        chatContains: 'coragem para matar o Warden',
      },
      {
        name: 'cogu',
        adv: 'cogu',
        globalObj: 'cogu',
        scope: 'everyone_except',
        title: 'Todos bebem',
        sound: 'entity.player.levelup',
        chatContains: 'achar o bioma de cogumelos',
      },
      {
        name: 'fortaleza',
        adv: 'fortaleza',
        globalObj: 'fortaleza',
        scope: 'everyone',
        title: 'Todos bebem',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'primeira Fortaleza do Nether',
      },
      {
        name: 'stronghold',
        adv: 'stronghold',
        globalObj: 'stronghold',
        scope: 'everyone',
        title: 'Todos bebem',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'encontrou a Stronghold',
      },
      {
        name: 'trial',
        adv: 'trial',
        globalObj: 'trial',
        scope: 'everyone',
        title: 'Todos bebem',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'descobriu a Trial Chambers',
      },
      {
        name: 'trade',
        adv: 'trade',
        globalObj: 'trade',
        scope: 'everyone',
        title: 'Todos bebem',
        subtitle: '',
        sound: 'entity.player.levelup',
        chatContains: 'primeira troca com um villager',
      },
      {
        name: 'ender_dragon',
        adv: 'ender_dragon',
        globalObj: 'ender_dragon',
        scope: 'everyone',
        title: 'Todos dão um shot',
        subtitle: '',
        sound: 'entity.wither.ambient',
        chatContains: 'matou o Ender Dragon',
      },
      {
        name: 'return',
        adv: 'return',
        globalObj: 'return',
        scope: 'self_only',
        title: 'Escolha alguém',
        subtitle: 'Para dar um shot',
        sound: 'entity.wither.ambient',
        chatContains: 'matar um Ghast rebatendo sua bola de fogo',
      },
    ],
    miningOrbits: [
      {
        fnName: 'diamante',
        checksSilkTouch: true,
        chance: 0.25,
        scope: 'everyone_except',
        title: 'Todos bebem',
        sound: 'entity.player.levelup',
        chatContains: 'encontrou um belo diamante',
        variants: [
          { obj: 'diamante', block: 'minecraft:diamond_ore' },
          { obj: 'diamante_deep', block: 'minecraft:deepslate_diamond_ore' },
        ],
      },
      {
        fnName: 'ouro',
        checksSilkTouch: true,
        chance: 0.075,
        scope: 'self_only',
        title: 'Escolha alguém',
        subtitle: 'Para beber',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'quebrou um ouro de 24K',
        variants: [
          { obj: 'ouro', block: 'minecraft:gold_ore' },
          { obj: 'ouro_deep', block: 'minecraft:deepslate_gold_ore' },
          { obj: 'ouro_nether', block: 'minecraft:nether_gold_ore' },
        ],
      },
      {
        fnName: 'esmeralda',
        checksSilkTouch: true,
        chance: 0.075,
        scope: 'self_only',
        title: 'Escolha alguém',
        subtitle: 'Para beber',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'quebrou uma esmeralda muito brilhante',
        variants: [
          { obj: 'esmeralda', block: 'minecraft:emerald_ore' },
          { obj: 'esmeralda_deep', block: 'minecraft:deepslate_emerald_ore' },
        ],
      },
      {
        fnName: 'ferro',
        checksSilkTouch: true,
        chance: 0.04,
        scope: 'self_only',
        title: 'Escolha alguém',
        subtitle: 'Para beber',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'quebrou um ferro da sorte',
        variants: [
          { obj: 'ferro', block: 'minecraft:iron_ore' },
          { obj: 'ferro_deep', block: 'minecraft:deepslate_iron_ore' },
        ],
      },
      {
        fnName: 'carvao',
        checksSilkTouch: true,
        chance: 0.03,
        scope: 'self_only',
        title: 'Escolha alguém',
        subtitle: 'Para beber',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'quebrou um carvão de forma exemplar',
        variants: [
          { obj: 'carvao', block: 'minecraft:coal_ore' },
          { obj: 'carvao_deep', block: 'minecraft:deepslate_coal_ore' },
        ],
      },
      {
        fnName: 'obsidian',
        checksSilkTouch: false,
        chance: 0.05,
        scope: 'self_only',
        title: 'Beba',
        subtitle: '',
        sound: 'entity.experience_orb.pickup',
        chatContains: 'quebrou um obsidian meio mal',
        variants: [
          { obj: 'obsidian', block: 'minecraft:obsidian' },
          { obj: 'obsidian_cry', block: 'minecraft:crying_obsidian' },
        ],
      },
    ],
  },
};

function parseLoaderList(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'all') return [...SUPPORTED_LOADERS];
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (!SUPPORTED_LOADERS.includes(part)) {
      throw new Error(`Unsupported loader "${part}". Expected one of: ${SUPPORTED_LOADERS.join(', ')}, or "all".`);
    }
  }
  return [...new Set(parts)];
}

export function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    jar: null,
    loaders: [...SUPPORTED_LOADERS],
    lang: 'auto',
    only: null,
    keepWorld: false,
    skipDownload: false,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--keep-world') {
      opts.keepWorld = true;
    } else if (arg === '--skip-download') {
      opts.skipDownload = true;
    } else if (arg === '--verbose' || arg === '-v') {
      opts.verbose = true;
    } else if (arg === '--only' && i + 1 < argv.length) {
      opts.only = argv[++i];
    } else if (arg.startsWith('--only=')) {
      opts.only = arg.slice('--only='.length);
    } else if (arg === '--jar' && i + 1 < argv.length) {
      opts.jar = argv[++i];
    } else if (arg.startsWith('--jar=')) {
      opts.jar = arg.slice('--jar='.length);
    } else if (arg === '--loader' && i + 1 < argv.length) {
      opts.loaders = parseLoaderList(argv[++i]);
    } else if (arg.startsWith('--loader=')) {
      opts.loaders = parseLoaderList(arg.slice('--loader='.length));
    } else if (arg === '--lang' && i + 1 < argv.length) {
      opts.lang = argv[++i].toLowerCase();
    } else if (arg.startsWith('--lang=')) {
      opts.lang = arg.slice('--lang='.length).toLowerCase();
    }
  }

  if (!['auto', 'en', 'pt'].includes(opts.lang)) {
    throw new Error(`Unsupported --lang "${opts.lang}". Expected auto, en, or pt.`);
  }
  return opts;
}

export function resolveTargetJar(jarArg = null) {
  if (jarArg) {
    const candidates = path.isAbsolute(jarArg)
      ? [jarArg]
      : [path.resolve(REPO_ROOT, jarArg), path.resolve(TEST_DIR, jarArg), path.resolve(process.cwd(), jarArg)];
    const found = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!found) {
      throw new Error(`Specified mod JAR not found: ${jarArg}`);
    }
    return found;
  }

  if (!fs.existsSync(RELEASES_DIR)) {
    throw new Error(`Releases directory not found: ${RELEASES_DIR}`);
  }
  const jars = fs
    .readdirSync(RELEASES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.jar'))
    .map((e) => {
      const fullPath = path.join(RELEASES_DIR, e.name);
      return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (jars.length === 0) {
    throw new Error(`No .jar file found in ${RELEASES_DIR}. Pass --jar <path>.`);
  }
  return jars[0].fullPath;
}
