title @a times 5t 20t 5t

title @a subtitle ["",{"text":"Menos ","bold":false},{"selector":"@p"}]

title @p subtitle ["",{"text":"Menos você","bold":false}]

title @a title ["",{"text":"Todos bebem","color":"gold","bold":true}]

playsound minecraft:entity.player.levelup player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":" foi o primeiro a matar um Ghast rebatendo sua bola de fogo e agora todos devem dar um gole de suas bebidas, menos "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":"!"}]

scoreboard players set $global return 0