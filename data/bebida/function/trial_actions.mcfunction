title @a times 10t 60t 20t

title @a subtitle {"text":""}

title @a title {"text":"Todos beben","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"yellow","bold":false},{"text":" descubrió las Trial Chambers, ¡todos deben beber antes de que empiece la pelea!","color":"yellow","bold":false}]

scoreboard players set $global trial 0
