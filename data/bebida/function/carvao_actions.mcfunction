title @a times 5t 20t 5t

title @p subtitle ["",{"text":"To drink","bold":false}]

title @p title ["",{"text":"Choose someone","color":"gold","bold":true}]

playsound minecraft:entity.experience_orb.pickup player @p

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"gray","bold":false,"selector":"@p"},{"color":"gray","bold":false,"text":" has mined a coal ore perfectly and can now choose someone to drink!"}]
