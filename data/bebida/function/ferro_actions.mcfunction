title @s times 10t 60t 20t

title @s subtitle {"text":"Para beber","color":"white","bold":false}

title @s title {"text":"Elige a alguien","color":"gold","bold":true}

playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"white","bold":false},{"text":" picó un hierro de la suerte y puede elegir a alguien para beber.","color":"white","bold":false}]
