title @a times 10t 60t 20t

title @a subtitle {"text":""}

title @a title {"text":"Todos toman un shot","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.wither.ambient player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_purple","bold":false},{"text":" mató al Ender Dragon, ¡hora de que todos tomen un shot para celebrar!","color":"dark_purple","bold":false}]

scoreboard players set $global ender_dragon 0
