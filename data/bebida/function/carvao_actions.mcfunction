title @s times 10t 60t 20t

title @s subtitle {"text":"To drink","color":"white","bold":false}

title @s title {"text":"Choose someone","color":"gold","bold":true}

playsound minecraft:entity.experience_orb.pickup player @s

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"gray","bold":false},{"text":" has perfectly mined a coal ore and can now choose someone to drink!","color":"gray","bold":false}]
