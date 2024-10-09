title @a times 5t 20t 5t

title @p subtitle ["",{"text":"Escolha alguém","bold":false},{"selector":"@p"}]

title @p title ["",{"text":"Para dar shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @p

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":" conseguiu o primeiro Ancient Debirs e agora pode escolher alguém para dar um shot"}]

scoreboard players set $global debris 0