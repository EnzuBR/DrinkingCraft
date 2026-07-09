# Carrega os objetivos
# Feito por EnzuBR

# Travas globais dos eventos de "primeira vez" (dummy)
scoreboard objectives add full_dima dummy
scoreboard objectives add full_netherite dummy
scoreboard objectives add debris dummy
scoreboard objectives add nether dummy
scoreboard objectives add ender_dragon dummy
scoreboard objectives add end dummy
scoreboard objectives add stronghold dummy
scoreboard objectives add crafting dummy
scoreboard objectives add cogu dummy
scoreboard objectives add return dummy
scoreboard objectives add fortaleza dummy
scoreboard objectives add trade dummy
scoreboard objectives add trial dummy
scoreboard objectives add warden dummy
scoreboard objectives add elytra_first dummy

# Diamante
scoreboard objectives add diamante minecraft.mined:minecraft.diamond_ore
scoreboard objectives add diamante_deep minecraft.mined:minecraft.deepslate_diamond_ore

# Obsidian
scoreboard objectives add obsidian minecraft.mined:minecraft.obsidian
scoreboard objectives add obsidian_cry minecraft.mined:minecraft.crying_obsidian

# Ferro
scoreboard objectives add ferro minecraft.mined:minecraft.iron_ore
scoreboard objectives add ferro_deep minecraft.mined:minecraft.deepslate_iron_ore

# Carvao
scoreboard objectives add carvao minecraft.mined:minecraft.coal_ore
scoreboard objectives add carvao_deep minecraft.mined:minecraft.deepslate_coal_ore

# Ouro
scoreboard objectives add ouro minecraft.mined:minecraft.gold_ore
scoreboard objectives add ouro_deep minecraft.mined:minecraft.deepslate_gold_ore
scoreboard objectives add ouro_nether minecraft.mined:minecraft.nether_gold_ore

# Esmeralda
scoreboard objectives add esmeralda minecraft.mined:minecraft.emerald_ore
scoreboard objectives add esmeralda_deep minecraft.mined:minecraft.deepslate_emerald_ore

# Morte
scoreboard objectives add mortes deathCount

# Sem morrer
scoreboard objectives add sem_morrer minecraft.custom:minecraft.time_since_death

# Da a tag init a quem ja esta online na instalacao/reload,
# para que nao tomem o shot de "primeiro join" no meio da sessao
tag @a[tag=!init] add init

# Equipamento quebrou
# Picaretas
scoreboard objectives add w_pick minecraft.broken:minecraft.wooden_pickaxe
scoreboard objectives add s_pick minecraft.broken:minecraft.stone_pickaxe
scoreboard objectives add cu_pick minecraft.broken:minecraft.copper_pickaxe
scoreboard objectives add i_pick minecraft.broken:minecraft.iron_pickaxe
scoreboard objectives add g_pick minecraft.broken:minecraft.golden_pickaxe
scoreboard objectives add d_pick minecraft.broken:minecraft.diamond_pickaxe
scoreboard objectives add n_pick minecraft.broken:minecraft.netherite_pickaxe

# Espadas
scoreboard objectives add w_sword minecraft.broken:minecraft.wooden_sword
scoreboard objectives add s_sword minecraft.broken:minecraft.stone_sword
scoreboard objectives add cu_sword minecraft.broken:minecraft.copper_sword
scoreboard objectives add i_sword minecraft.broken:minecraft.iron_sword
scoreboard objectives add g_sword minecraft.broken:minecraft.golden_sword
scoreboard objectives add d_sword minecraft.broken:minecraft.diamond_sword
scoreboard objectives add n_sword minecraft.broken:minecraft.netherite_sword

# Machados
scoreboard objectives add w_axe minecraft.broken:minecraft.wooden_axe
scoreboard objectives add s_axe minecraft.broken:minecraft.stone_axe
scoreboard objectives add cu_axe minecraft.broken:minecraft.copper_axe
scoreboard objectives add i_axe minecraft.broken:minecraft.iron_axe
scoreboard objectives add g_axe minecraft.broken:minecraft.golden_axe
scoreboard objectives add d_axe minecraft.broken:minecraft.diamond_axe
scoreboard objectives add n_axe minecraft.broken:minecraft.netherite_axe

# Pas
scoreboard objectives add w_shovel minecraft.broken:minecraft.wooden_shovel
scoreboard objectives add s_shovel minecraft.broken:minecraft.stone_shovel
scoreboard objectives add cu_shovel minecraft.broken:minecraft.copper_shovel
scoreboard objectives add i_shovel minecraft.broken:minecraft.iron_shovel
scoreboard objectives add g_shovel minecraft.broken:minecraft.golden_shovel
scoreboard objectives add d_shovel minecraft.broken:minecraft.diamond_shovel
scoreboard objectives add n_shovel minecraft.broken:minecraft.netherite_shovel

# Enxadas
scoreboard objectives add w_hoe minecraft.broken:minecraft.wooden_hoe
scoreboard objectives add s_hoe minecraft.broken:minecraft.stone_hoe
scoreboard objectives add cu_hoe minecraft.broken:minecraft.copper_hoe
scoreboard objectives add i_hoe minecraft.broken:minecraft.iron_hoe
scoreboard objectives add g_hoe minecraft.broken:minecraft.golden_hoe
scoreboard objectives add d_hoe minecraft.broken:minecraft.diamond_hoe
scoreboard objectives add n_hoe minecraft.broken:minecraft.netherite_hoe

# Lancas
scoreboard objectives add w_spear minecraft.broken:minecraft.wooden_spear
scoreboard objectives add s_spear minecraft.broken:minecraft.stone_spear
scoreboard objectives add cu_spear minecraft.broken:minecraft.copper_spear
scoreboard objectives add i_spear minecraft.broken:minecraft.iron_spear
scoreboard objectives add g_spear minecraft.broken:minecraft.golden_spear
scoreboard objectives add d_spear minecraft.broken:minecraft.diamond_spear
scoreboard objectives add n_spear minecraft.broken:minecraft.netherite_spear

# Capacetes
scoreboard objectives add l_helmet minecraft.broken:minecraft.leather_helmet
scoreboard objectives add c_helmet minecraft.broken:minecraft.chainmail_helmet
scoreboard objectives add cu_helmet minecraft.broken:minecraft.copper_helmet
scoreboard objectives add i_helmet minecraft.broken:minecraft.iron_helmet
scoreboard objectives add g_helmet minecraft.broken:minecraft.golden_helmet
scoreboard objectives add d_helmet minecraft.broken:minecraft.diamond_helmet
scoreboard objectives add n_helmet minecraft.broken:minecraft.netherite_helmet
scoreboard objectives add t_helmet minecraft.broken:minecraft.turtle_helmet

# Peitorais
scoreboard objectives add l_chestplate minecraft.broken:minecraft.leather_chestplate
scoreboard objectives add c_chestplate minecraft.broken:minecraft.chainmail_chestplate
scoreboard objectives add cu_chestplate minecraft.broken:minecraft.copper_chestplate
scoreboard objectives add i_chestplate minecraft.broken:minecraft.iron_chestplate
scoreboard objectives add g_chestplate minecraft.broken:minecraft.golden_chestplate
scoreboard objectives add d_chestplate minecraft.broken:minecraft.diamond_chestplate
scoreboard objectives add n_chestplate minecraft.broken:minecraft.netherite_chestplate

# Calcas
scoreboard objectives add l_leggings minecraft.broken:minecraft.leather_leggings
scoreboard objectives add c_leggings minecraft.broken:minecraft.chainmail_leggings
scoreboard objectives add cu_leggings minecraft.broken:minecraft.copper_leggings
scoreboard objectives add i_leggings minecraft.broken:minecraft.iron_leggings
scoreboard objectives add g_leggings minecraft.broken:minecraft.golden_leggings
scoreboard objectives add d_leggings minecraft.broken:minecraft.diamond_leggings
scoreboard objectives add n_leggings minecraft.broken:minecraft.netherite_leggings

# Botas
scoreboard objectives add l_boots minecraft.broken:minecraft.leather_boots
scoreboard objectives add c_boots minecraft.broken:minecraft.chainmail_boots
scoreboard objectives add cu_boots minecraft.broken:minecraft.copper_boots
scoreboard objectives add i_boots minecraft.broken:minecraft.iron_boots
scoreboard objectives add g_boots minecraft.broken:minecraft.golden_boots
scoreboard objectives add d_boots minecraft.broken:minecraft.diamond_boots
scoreboard objectives add n_boots minecraft.broken:minecraft.netherite_boots

# Equipamentos Misc
scoreboard objectives add shear minecraft.broken:minecraft.shears
scoreboard objectives add flint_and_steel minecraft.broken:minecraft.flint_and_steel
scoreboard objectives add fishing_rod minecraft.broken:minecraft.fishing_rod
scoreboard objectives add carrot_on_a_stick minecraft.broken:minecraft.carrot_on_a_stick
scoreboard objectives add warped_fungus_on_a_stick minecraft.broken:minecraft.warped_fungus_on_a_stick
scoreboard objectives add shield minecraft.broken:minecraft.shield
scoreboard objectives add bow minecraft.broken:minecraft.bow
scoreboard objectives add crossbow minecraft.broken:minecraft.crossbow
scoreboard objectives add trident minecraft.broken:minecraft.trident
scoreboard objectives add mace minecraft.broken:minecraft.mace
scoreboard objectives add brush minecraft.broken:minecraft.brush
scoreboard objectives add elytra minecraft.broken:minecraft.elytra
