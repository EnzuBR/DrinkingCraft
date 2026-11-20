title @a times 10t 60t 20t

title @a subtitle [{"text":"Menos ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Menos tú","color":"white","bold":false}

title @a title {"text":"Todos beben","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"aqua","bold":false},{"text":" picó un diamante increíble, todos deben dar un trago a sus bebidas, menos ","color":"aqua","bold":false},{"selector":"@s","color":"aqua","bold":false},{"text":".","color":"aqua","bold":false}]
