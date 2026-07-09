title @a times 10t 60t 20t

title @a title {"text":"Everyone drinks","color":"gold","bold":true}

playsound minecraft:entity.player.levelup player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"yellow","bold":false},{"text":" discovered the Trial Chambers, everyone must drink before the fight begins!","color":"yellow","bold":false}]

scoreboard players set $global trial 0
