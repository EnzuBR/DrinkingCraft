title @a times 5t 20t 5t

title @a subtitle ["",{"text":"Menos ","bold":false},{"selector":"@p"}]

title @p subtitle ["",{"text":"Menos você","bold":false}]

title @a title ["",{"text":"Todos bebem","color":"gold","bold":true}]

playsound minecraft:entity.player.levelup player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"aqua","bold":false,"selector":"@p"},{"color":"aqua","bold":false,"text":" conseguiu um Full Dima, todos devem dar um gole de suas bebidas, menos "},{"color":"aqua","bold":false,"selector":"@p"},{"color":"aqua","bold":false,"text":"!"}]

scoreboard players set $global full_dima 0