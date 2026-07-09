title @s times 10t 60t 20t

title @s title {"text":"Drink","color":"gold","bold":true}

playsound minecraft:entity.experience_orb.pickup player @s

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_aqua","bold":false},{"text":" killed a defenseless animal and must now drink!","color":"dark_aqua","bold":false}]
