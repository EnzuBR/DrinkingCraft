title @s times 10t 60t 20t

title @s title {"text":"Take a shot","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @s

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_aqua","bold":false},{"text":" has already gotten a crafting table. What are you, a speedrunner? Take a shot to relax.","color":"dark_aqua","bold":false}]

scoreboard players set $global crafting 0
