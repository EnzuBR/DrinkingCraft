title @a reset

title @p title ["",{"text":"De shot","color":"gold","bold":true}]

playsound minecraft:entity.wither.ambient player @p

tellraw @a ["",{"color":"gold","bold":true,"text":"<DrinkingCraft> "},{"color":"dark_aqua","bold":false,"selector":"@p"},{"color":"dark_aqua","bold":false,"text":" já fez uma crafting table, ta achando que é speedrun? Toma um shot pra relaxar."}]

scoreboard players set $global crafting 0