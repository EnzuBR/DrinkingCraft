title @a times 5t 20t 5t

title @a subtitle ["",{"text":"Except ","bold":false},{"selector":"@p"}]

title @p subtitle ["",{"text":"Except you","bold":false}]

title @a title ["",{"text":"Everyone takes a shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":" found the first Ancient Debris, everyone must take a shot, except "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":"!"}]

scoreboard players set $global debris 0
