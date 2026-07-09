title @s times 10t 60t 20t

title @s title {"text":"Drink","color":"gold","bold":true}

playsound minecraft:entity.experience_orb.pickup player @s

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"light_purple","bold":false},{"text":" broke an obsidian a bit poorly and must now drink!","color":"light_purple","bold":false}]
