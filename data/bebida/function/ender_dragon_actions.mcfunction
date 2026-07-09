title @a times 10t 60t 20t

title @a title {"text":"Everyone takes a shot","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_purple","bold":false},{"text":" killed the Ender Dragon, time for everyone to take a celebratory shot!","color":"dark_purple","bold":false}]

scoreboard players set $global ender_dragon 0
