title @a times 10t 60t 20t

title @a title {"text":"Everyone drinks","color":"gold","bold":true}

playsound minecraft:entity.player.levelup player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_purple","bold":false},{"text":" found the Stronghold, everyone must drink to celebrate!","color":"dark_purple","bold":false}]

scoreboard players set $global stronghold 0
