# Use o comando "/function bebida:uninstall" para que todos os objetivos, advancements e tags sejam removidos

# Remove os advancements
advancement revoke @a only bebida:cogu
advancement revoke @a only bebida:crafting
advancement revoke @a only bebida:debris
advancement revoke @a only bebida:elytra
advancement revoke @a only bebida:end
advancement revoke @a only bebida:ender_dragon
advancement revoke @a only bebida:fortaleza
advancement revoke @a only bebida:full_dima
advancement revoke @a only bebida:full_netherite
advancement revoke @a only bebida:nether
advancement revoke @a only bebida:passivos
advancement revoke @a only bebida:quebrou
advancement revoke @a only bebida:return
advancement revoke @a only bebida:stronghold
advancement revoke @a only bebida:totem
advancement revoke @a only bebida:trade
advancement revoke @a only bebida:trial
advancement revoke @a only bebida:warden

# Remove as travas globais dos eventos
scoreboard objectives remove full_dima
scoreboard objectives remove full_netherite
scoreboard objectives remove debris
scoreboard objectives remove nether
scoreboard objectives remove ender_dragon
scoreboard objectives remove end
scoreboard objectives remove stronghold
scoreboard objectives remove crafting
scoreboard objectives remove cogu
scoreboard objectives remove return
scoreboard objectives remove fortaleza
scoreboard objectives remove trade
scoreboard objectives remove trial
scoreboard objectives remove warden
scoreboard objectives remove elytra_first

# Remove os objetivos de minerios
scoreboard objectives remove diamante
scoreboard objectives remove diamante_deep
scoreboard objectives remove obsidian
scoreboard objectives remove obsidian_cry
scoreboard objectives remove ferro
scoreboard objectives remove ferro_deep
scoreboard objectives remove carvao
scoreboard objectives remove carvao_deep
scoreboard objectives remove ouro
scoreboard objectives remove ouro_deep
scoreboard objectives remove ouro_nether
scoreboard objectives remove esmeralda
scoreboard objectives remove esmeralda_deep

# Remove os objetivos de morte
scoreboard objectives remove mortes
scoreboard objectives remove sem_morrer

# Remove a tag init dos jogadores
tag @a remove init
