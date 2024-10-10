title @a times 5t 20t 5t
title @p subtitle ["",{"text":"To drink","bold":false}]
title @p title ["",{"text":"Choose someone","color":"gold","bold":true}]
playsound minecraft:entity.experience_orb.pickup player @p
tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"yellow","bold":false,"selector":"@p"},{"color":"yellow","bold":false,"text":" broke a 24K gold and can choose someone to drink!"}]
