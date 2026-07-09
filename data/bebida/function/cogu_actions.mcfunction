title @a times 10t 60t 20t

title @a subtitle [{"text":"Except ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Except you","color":"white","bold":false}

title @a title {"text":"Everyone drinks","color":"gold","bold":true}

playsound minecraft:entity.player.levelup player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_gray","bold":false},{"text":" was the first to find the mushroom biome, something extremely useful for everyone, so everyone must take a sip of their drinks, except ","color":"dark_gray","bold":false},{"selector":"@s","color":"dark_gray","bold":false},{"text":"!","color":"dark_gray","bold":false}]

scoreboard players set $global cogu 0
