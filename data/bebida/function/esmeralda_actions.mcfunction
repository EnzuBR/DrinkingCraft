title @a times 5t 20t 5t

title @p subtitle ["",{"text":"To drink","bold":false}]

title @p title ["",{"text":"Choose someone","color":"gold","bold":true}]

playsound minecraft:entity.experience_orb.pickup player @p

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"green","bold":false,"selector":"@p"},{"color":"green","bold":false,"text":" has mined a very shiny emerald and can choose someone to drink!"}]