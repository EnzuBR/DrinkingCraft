title @a reset

title @p title ["",{"text":"De shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @p

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_aqua","bold":false,"selector":"@p"},{"color":"dark_aqua","bold":false,"text":" acabou de entrar pela primeira vez, toma um shot pra já começar bem!"}]

# Atualiza scores com o global
