title @s times 10t 60t 20t

title @s subtitle {"text":"Para tomar un shot","color":"white","bold":false}

title @s title {"text":"Elige a alguien","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_purple","bold":false},{"text":" consiguió la primera Elytra y ahora puede elegir a alguien para tomar un shot.","color":"dark_purple","bold":false}]

scoreboard players set $global elytra_first 0
