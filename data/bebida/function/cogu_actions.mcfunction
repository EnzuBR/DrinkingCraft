title @a times 5t 20t 5t

title @a subtitle ["",{"text":"Except ","bold":false},{"selector":"@p"}]

title @p subtitle ["",{"text":"Except you","bold":false}]

title @a title ["",{"text":"Everyone drinks","color":"gold","bold":true}]

playsound minecraft:entity.player.levelup player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_gray","bold":false,"selector":"@p"},{"color":"dark_gray","bold":false,"text":" was the first to find the mushroom biome, something extremely useful for everyone, so everyone must take a sip of their drinks, except "},{"color":"dark_gray","bold":false,"selector":"@p"},{"color":"dark_gray","bold":false,"text":"!"}]

scoreboard players set $global full_dima 0
