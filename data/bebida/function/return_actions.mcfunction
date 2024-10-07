title @a times 5t 20t 5t

title @p subtitle ["",{"text":"Para dar um shot","bold":false}]

title @p title ["",{"text":"Escolha alguém","color":"gold","bold":true}]

playsound minecraft:entity.player.levelup player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":" foi o primeiro a matar um Ghast rebatendo sua bola de fogo e agora pode escolher alguem para dar um shot!"}]

scoreboard players set $global return 0