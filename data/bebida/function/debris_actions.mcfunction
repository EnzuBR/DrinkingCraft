title @a times 5t 20t 5t

title @p subtitle ["",{"text":"Choose someone","bold":false},{"selector":"@p"}]

title @p title ["",{"text":"To take a shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @p

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_red","bold":false,"selector":"@p"},{"color":"dark_red","bold":false,"text":" found the first Ancient Debris and can now choose someone to take a shot"}]

scoreboard players set $global debris 0
