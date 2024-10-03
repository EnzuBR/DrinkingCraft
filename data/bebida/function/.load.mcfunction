# Carrega os objetivos

# Full Dima
scoreboard objectives add full_dima dummy
scoreboard players set @a full_dima 1

# Nether
scoreboard objectives add nether dummy

# Ender Dragon
scoreboard objectives add ender_dragon dummy
scoreboard players set @a ender_dragon 1

# End
scoreboard objectives add end dummy
scoreboard players set @a end 1

# Stronghold
scoreboard objectives add stronghold dummy
scoreboard players set @a stronghold 1

# Craft
scoreboard objectives add crafting dummy
scoreboard players set @a crafting 1

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

# Morte
scoreboard objectives add mortes deathCount

# Sem morrer
scoreboard objectives add sem_morrer minecraft.custom:minecraft.time_since_death

# Da a tag init
tag @a[tag=!init] add init