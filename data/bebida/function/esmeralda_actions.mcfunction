title @s times 10t 60t 20t

title @s subtitle {"text":"Para beber","color":"white","bold":false}

title @s title {"text":"Escolha alguém","color":"gold","bold":true}

playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"green","bold":false},{"text":" quebrou uma esmeralda muito brilhante e pode escolher alguém para beber!","color":"green","bold":false}]
