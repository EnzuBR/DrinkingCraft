title @a times 5t 20t 5t

title @a title ["",{"text":"Todos bebem","color":"gold","bold":true}]

playsound minecraft:entity.player.levelup player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":" foi o primeiro a encontrar a fortaleza do nether e agora todos devem beber para comemorar!"}]

scoreboard players set $global fortaleza 0