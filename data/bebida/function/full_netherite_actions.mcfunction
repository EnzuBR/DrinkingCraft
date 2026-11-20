title @a times 10t 60t 20t

title @a subtitle [{"text":"Menos ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Menos tú","color":"white","bold":false}

title @a title {"text":"Todos toman un shot","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.wither.ambient player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_red","bold":false},{"text":" fue el primero en conseguir armadura completa de netherite, todos deben tomar un shot, menos ","color":"dark_red","bold":false},{"selector":"@s","color":"dark_red","bold":false},{"text":".","color":"dark_red","bold":false}]

scoreboard players set $global full_netherite 0
