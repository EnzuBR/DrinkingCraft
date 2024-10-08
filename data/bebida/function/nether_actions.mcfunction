title @a times 5t 20t 5t

title @a title ["",{"text":"Everyone drinks","color":"gold","bold":true}]

playsound minecraft:entity.player.levelup player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"red","bold":false,"selector":"@p"},{"color":"red","bold":false,"text":" entered the Nether, everyone drinks to celebrate!"}]

scoreboard players set $global nether 0
