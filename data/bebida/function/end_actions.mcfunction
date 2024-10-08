title @a times 5t 20t 5t

title @a title ["",{"text":"Everyone takes a shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_purple","bold":false,"text":"We've reached the End, everyone must take a shot to celebrate!"}]

scoreboard players set $global end 0
