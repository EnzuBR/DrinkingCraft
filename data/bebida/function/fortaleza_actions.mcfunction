title @a times 10t 60t 20t

title @a title {"text":"Everyone drinks","color":"gold","bold":true}

playsound minecraft:entity.player.levelup player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_red","bold":false},{"text":" has found the first Nether Fortress, and now everyone must drink to celebrate!","color":"dark_red","bold":false}]

scoreboard players set $global fortaleza 0
