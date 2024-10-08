title @a times 5t 20t 5t

title @a title ["",{"text":"Everyone drinks","color":"gold","bold":true}]

playsound minecraft:entity.player.levelup player @a

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_purple","bold":false,"selector":"@p"},{"color":"dark_purple","bold":false,"text":" found the Stronghold, everyone must drink to celebrate!"}]

scoreboard players set $global stronghold 0
