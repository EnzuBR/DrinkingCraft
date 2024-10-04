title @a reset

title @a title ["",{"text":"Todos dão shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_purple","bold":false,"selector":"@p"},{"color":"dark_purple","bold":false,"text":" matou o Ender Dragon, todos devem dar um shot para comemorar!"}]

scoreboard players set $global ender_dragon 0