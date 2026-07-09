title @a times 10t 60t 20t

title @a subtitle [{"text":"Except ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Except you","color":"white","bold":false}

title @a title {"text":"Everyone takes a shot","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_red","bold":false},{"text":" was the first to get Full Netherite armor, everyone must take a shot, except ","color":"dark_red","bold":false},{"selector":"@s","color":"dark_red","bold":false},{"text":"!","color":"dark_red","bold":false}]

scoreboard players set $global full_netherite 0
