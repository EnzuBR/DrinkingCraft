title @a times 10t 60t 20t

title @a title {"text":"Everyone drinks","color":"gold","bold":true}

playsound minecraft:entity.player.levelup player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_aqua","bold":false},{"text":" made the first trade with a villager, everyone must drink for capitalism!","color":"dark_aqua","bold":false}]

scoreboard players set $global trade 0
