title @s times 10t 60t 20t

title @s title {"text":"Drink","color":"gold","bold":true}

playsound minecraft:entity.experience_orb.pickup player @s

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_aqua","bold":false},{"text":" has gotten a bad crafting table and now has to drink to make up for it.","color":"dark_aqua","bold":false}]
