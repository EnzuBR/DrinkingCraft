title @a times 5t 20t 5t

title @a title ["",{"text":"Everyone drinks","color":"gold","bold":true}]

playsound minecraft:entity.player.levelup player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_aqua","bold":false,"selector":"@p"},{"color":"dark_aqua","bold":false,"text":" made their first trade with a villager, everyone must drink for capitalism!"}]

scoreboard players set $global fortaleza 0
