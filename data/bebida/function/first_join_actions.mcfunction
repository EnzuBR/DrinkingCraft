title @s times 10t 60t 20t

title @s subtitle {"text":""}

title @s title {"text":"Dê um shot","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_aqua","bold":false},{"text":" acabou de entrar pela primeira vez, toma um shot pra já começar bem!","color":"dark_aqua","bold":false}]

tag @s add init
