title @s times 10t 60t 20t

title @s subtitle {"text":""}

title @s title {"text":"Drink it all","color":"gold","bold":true}

playsound minecraft:block.anvil.place player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_red","bold":false},{"text":" died and now has to finish their drink!","color":"dark_red","bold":false}]

scoreboard players reset @s mortes
scoreboard players reset @s sem_morrer
