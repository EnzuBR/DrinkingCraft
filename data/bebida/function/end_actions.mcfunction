title @a times 10t 60t 20t

title @a title {"text":"Everyone takes a shot","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"text":"We've reached the End, everyone must take a shot to celebrate!","color":"dark_purple","bold":false}]

scoreboard players set $global end 0
