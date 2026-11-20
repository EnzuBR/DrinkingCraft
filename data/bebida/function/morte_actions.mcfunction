title @s times 10t 60t 20t

title @s subtitle {"text":""}

title @s title {"text":"Bébelo todo","color":"gold","bold":true}

playsound minecraft:block.anvil.place player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_red","bold":false},{"text":" murió y ahora tiene que terminarse su bebida.","color":"dark_red","bold":false}]

scoreboard players reset @s mortes
scoreboard players reset @s sem_morrer
