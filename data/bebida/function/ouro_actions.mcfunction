title @s times 10t 60t 20t

title @s subtitle {"text":"Para beber","color":"white","bold":false}

title @s title {"text":"Escolha alguém","color":"gold","bold":true}

playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"yellow","bold":false},{"text":" quebrou um ouro de 24K e pode escolher alguém para beber!","color":"yellow","bold":false}]
