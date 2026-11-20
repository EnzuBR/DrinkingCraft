title @a times 10t 60t 20t

title @a subtitle [{"text":"Menos ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Menos tú","color":"white","bold":false}

title @a title {"text":"Todos beben","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_gray","bold":false},{"text":" fue el primero en encontrar el bioma de champiñones, algo súper útil para todos, así que todos deben dar un trago a sus bebidas, menos ","color":"dark_gray","bold":false},{"selector":"@s","color":"dark_gray","bold":false},{"text":".","color":"dark_gray","bold":false}]

scoreboard players set $global cogu 0
