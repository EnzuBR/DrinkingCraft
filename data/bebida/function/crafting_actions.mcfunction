title @a times 5t 20t 5t

title @p title ["",{"text":"Take a shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @p

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_aqua","bold":false,"selector":"@p"},{"color":"dark_aqua","bold":false,"text":" already made a crafting table, thinking it's a speedrun? Take a shot to relax."}]

scoreboard players set $global crafting 0
