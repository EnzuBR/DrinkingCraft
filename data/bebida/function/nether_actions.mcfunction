title @a times 10t 60t 20t

title @a subtitle {"text":""}

title @a title {"text":"Everyone drinks","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"red","bold":false},{"text":" ventured into the Nether, everyone drinks to celebrate!","color":"red","bold":false}]

scoreboard players set $global nether 0
