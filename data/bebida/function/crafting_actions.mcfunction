title @s times 10t 60t 20t

title @s subtitle {"text":""}

title @s title {"text":"Dê um shot","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_aqua","bold":false},{"text":" já conseguiu uma crafting table. Tá achando que é speedrun? Toma um shot pra relaxar.","color":"dark_aqua","bold":false}]

scoreboard players set $global crafting 0
