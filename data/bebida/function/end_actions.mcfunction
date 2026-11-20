title @a times 10t 60t 20t

title @a subtitle {"text":""}

title @a title {"text":"Todos dão um shot","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.wither.ambient player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"text":"Chegamos no End, todos devem dar um shot para comemorar!","color":"dark_purple","bold":false}]

scoreboard players set $global end 0
