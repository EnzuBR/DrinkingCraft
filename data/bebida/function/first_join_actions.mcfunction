title @s times 10t 60t 20t

title @s title {"text":"Take a shot","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @s

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_aqua","bold":false},{"text":" has just joined for the first time, take a shot to start off right!","color":"dark_aqua","bold":false}]
