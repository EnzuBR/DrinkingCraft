title @a times 10t 60t 20t

title @a subtitle [{"text":"Except ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Except you","color":"white","bold":false}

title @a title {"text":"Everyone drinks","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"aqua","bold":false},{"text":" has mined an outstanding diamond, everyone must take a sip of their drinks, except ","color":"aqua","bold":false},{"selector":"@s","color":"aqua","bold":false},{"text":"!","color":"aqua","bold":false}]
