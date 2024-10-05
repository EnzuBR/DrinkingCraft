title @a times 5t 20t 5t

title @a subtitle ["",{"text":"Menos ","bold":false},{"selector":"@p"}]

title @p subtitle ["",{"text":"Menos você","bold":false}]

title @a title ["",{"text":"Todos dão shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":" conseguiu o primeiro Ancient Debirs, todos devem dar um shot, menos "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":"!"}]

scoreboard players set $global debris 0