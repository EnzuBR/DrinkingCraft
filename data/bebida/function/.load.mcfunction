# Carrega os objetivos
# Feito por EnzuBR
# (mobs passivos e quebra de equipamentos sao detectados via advancements, sem custo por tick)

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
