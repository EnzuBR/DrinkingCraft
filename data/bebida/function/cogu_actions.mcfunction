title @a times 10t 60t 20t

title @a subtitle [{"text":"Menos ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Menos você","color":"white","bold":false}

title @a title {"text":"Todos bebem","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_gray","bold":false},{"text":" foi o primeiro a achar o bioma de cogumelos, algo extremamente útil para todos, portanto todos devem dar um gole de suas bebidas, menos ","color":"dark_gray","bold":false},{"selector":"@s","color":"dark_gray","bold":false},{"text":"!","color":"dark_gray","bold":false}]

scoreboard players set $global cogu 0
