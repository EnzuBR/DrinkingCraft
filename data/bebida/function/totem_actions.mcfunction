title @s times 10t 60t 20t

title @s subtitle {"text":""}

title @s title {"text":"Beba","color":"gold","bold":true}

playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"light_purple","bold":false},{"text":" enganou a morte com um Totem da Imortalidade e agora deve beber!","color":"light_purple","bold":false}]
