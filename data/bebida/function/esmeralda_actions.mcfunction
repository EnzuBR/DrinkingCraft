title @a times 5t 20t 5t

title @p subtitle ["",{"text":"Para beber","bold":false}]

title @p title ["",{"text":"Escolha alguém","color":"gold","bold":true}]

playsound minecraft:entity.experience_orb.pickup player @p

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"green","bold":false,"selector":"@p"},{"color":"green","bold":false,"text":" quebrou uma esmeralda muito brilhante e pode escolher alguém para beber!"}]