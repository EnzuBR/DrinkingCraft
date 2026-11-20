import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEST_DIR = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(TEST_DIR, '..');
export const RUNTIME_DIR = path.join(TEST_DIR, '.runtime');
export const DOWNLOADS_DIR = path.join(RUNTIME_DIR, 'downloads');
export const JRE_DIR = path.join(RUNTIME_DIR, 'jre25');
export const SERVER_DIR = path.join(TEST_DIR, 'server');
export const PLUGINS_DIR = path.join(SERVER_DIR, 'plugins');
export const WORLD_DIR = path.join(SERVER_DIR, 'world');
export const DATAPACK_DEST = path.join(WORLD_DIR, 'datapacks', 'DrinkingCraft');

export const PAPER_VERSION = '26.3';
export const PAPER_JAR_PATH = path.join(SERVER_DIR, `paper-${PAPER_VERSION}.jar`);
export const VERSIONS_CACHE_PATH = path.join(SERVER_DIR, '.versions.json');

export const SERVER_HOST = '127.0.0.1';
export const MC_PORT = Number.parseInt(process.env.MC_PORT || '25569', 10);
export const RCON_PORT = Number.parseInt(process.env.MC_RCON_PORT || '25579', 10);
export const RCON_PASSWORD = process.env.MC_RCON_PASSWORD || 'drinkingcraft_test_rcon';
export const BOT_VERSION = process.env.MC_BOT_VERSION || '26.1';

export const USER_AGENT = 'DrinkingCraft-TestHarness/1.0.0 (https://github.com/EnzuBR/DrinkingCraft)';

export const BOT_ALPHA = 'BotAlpha';
export const BOT_BETA = 'BotBeta';

export const ARENA_POS = { x: 10.5, y: 100, z: 10.5 };
export const DISTANT_POS = { x: 150.5, y: 100, z: 0.5 };
export const DIG_BLOCK_POS = { x: 10, y: 101, z: 12 };
export const BOT_LOOK_BLOCK_POS = { x: 10.5, y: 100, z: 10.5 };

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

/**
 * Todos os 14 marcos únicos (Primeira vez no mundo).
 * Note que `elytra` usa o objetivo `$global elytra_first`.
 */
export const GLOBAL_MILESTONES = [
  {
    name: 'full_dima',
    adv: 'full_dima',
    globalObj: 'full_dima',
    scope: 'everyone_except',
    title: 'Todos beben',
    sound: 'entity.player.levelup',
    chatContains: 'conseguir armadura completa de diamante',
  },
  {
    name: 'debris',
    adv: 'debris',
    globalObj: 'debris',
    scope: 'self_only',
    title: 'Elige a alguien',
    subtitle: 'Para tomar un shot',
    sound: 'entity.wither.ambient',
    chatContains: 'encontró el primer Ancient Debris',
  },
  {
    name: 'elytra',
    adv: 'elytra',
    globalObj: 'elytra_first',
    scope: 'self_only',
    title: 'Elige a alguien',
    subtitle: 'Para tomar un shot',
    sound: 'entity.wither.ambient',
    chatContains: 'consiguió la primera Elytra',
  },
  {
    name: 'full_netherite',
    adv: 'full_netherite',
    globalObj: 'full_netherite',
    scope: 'everyone_except',
    title: 'Todos toman un shot',
    sound: 'entity.wither.ambient',
    chatContains: 'conseguir armadura completa de netherite',
  },
  {
    name: 'nether',
    adv: 'nether',
    globalObj: 'nether',
    scope: 'everyone',
    title: 'Todos beben',
    subtitle: '',
    sound: 'entity.player.levelup',
    chatContains: 'se adentró en el Nether',
  },
  {
    name: 'end',
    adv: 'end',
    globalObj: 'end',
    scope: 'everyone',
    title: 'Todos toman un shot',
    subtitle: '',
    sound: 'entity.wither.ambient',
    chatContains: 'Llegamos al End',
  },
  {
    name: 'warden',
    adv: 'warden',
    globalObj: 'warden',
    scope: 'everyone_except',
    title: 'Todos toman un shot',
    sound: 'entity.wither.ambient',
    chatContains: 'valor de matar al Warden',
  },
  {
    name: 'cogu',
    adv: 'cogu',
    globalObj: 'cogu',
    scope: 'everyone_except',
    title: 'Todos beben',
    sound: 'entity.player.levelup',
    chatContains: 'encontrar el bioma de champiñones',
  },
  {
    name: 'fortaleza',
    adv: 'fortaleza',
    globalObj: 'fortaleza',
    scope: 'everyone',
    title: 'Todos beben',
    subtitle: '',
    sound: 'entity.player.levelup',
    chatContains: 'primera Fortaleza del Nether',
  },
  {
    name: 'stronghold',
    adv: 'stronghold',
    globalObj: 'stronghold',
    scope: 'everyone',
    title: 'Todos beben',
    subtitle: '',
    sound: 'entity.player.levelup',
    chatContains: 'encontró la Stronghold',
  },
  {
    name: 'trial',
    adv: 'trial',
    globalObj: 'trial',
    scope: 'everyone',
    title: 'Todos beben',
    subtitle: '',
    sound: 'entity.player.levelup',
    chatContains: 'descubrió las Trial Chambers',
  },
  {
    name: 'trade',
    adv: 'trade',
    globalObj: 'trade',
    scope: 'everyone',
    title: 'Todos beben',
    subtitle: '',
    sound: 'entity.player.levelup',
    chatContains: 'primer intercambio con un aldeano',
  },
  {
    name: 'ender_dragon',
    adv: 'ender_dragon',
    globalObj: 'ender_dragon',
    scope: 'everyone',
    title: 'Todos toman un shot',
    subtitle: '',
    sound: 'entity.wither.ambient',
    chatContains: 'mató al Ender Dragon',
  },
  {
    name: 'return',
    adv: 'return',
    globalObj: 'return',
    scope: 'self_only',
    title: 'Elige a alguien',
    subtitle: 'Para tomar un shot',
    sound: 'entity.wither.ambient',
    chatContains: 'matar a un Ghast devolviéndole su bola de fuego',
  },
];

export const MINING_ORBITS = [
  {
    fnName: 'diamante',
    checksSilkTouch: true,
    chance: 0.25,
    scope: 'everyone_except',
    title: 'Todos beben',
    sound: 'entity.player.levelup',
    chatContains: 'picó un diamante increíble',
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
    title: 'Elige a alguien',
    subtitle: 'Para beber',
    sound: 'entity.experience_orb.pickup',
    chatContains: 'picó un oro de 24K',
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
    title: 'Elige a alguien',
    subtitle: 'Para beber',
    sound: 'entity.experience_orb.pickup',
    chatContains: 'picó una esmeralda muy brillante',
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
    title: 'Elige a alguien',
    subtitle: 'Para beber',
    sound: 'entity.experience_orb.pickup',
    chatContains: 'picó un hierro de la suerte',
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
    title: 'Elige a alguien',
    subtitle: 'Para beber',
    sound: 'entity.experience_orb.pickup',
    chatContains: 'picó un carbón de forma ejemplar',
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
    title: 'Bebe',
    subtitle: '',
    sound: 'entity.experience_orb.pickup',
    chatContains: 'rompió una obsidiana un poco mal',
    variants: [
      { obj: 'obsidian', block: 'minecraft:obsidian' },
      { obj: 'obsidian_cry', block: 'minecraft:crying_obsidian' },
    ],
  },
];

export function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
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
    }
  }
  return opts;
}
