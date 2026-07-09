title @s times 10t 60t 20t

title @s subtitle {"text":"To take a shot","color":"white","bold":false}

title @s title {"text":"Choose someone","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @s

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_red","bold":false},{"text":" found the first Ancient Debris and can now choose someone to take a shot!","color":"dark_red","bold":false}]

scoreboard players set $global debris 0
