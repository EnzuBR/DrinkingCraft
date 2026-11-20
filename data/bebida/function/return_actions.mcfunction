title @s times 10t 60t 20t

title @s subtitle {"text":"Para dar um shot","color":"white","bold":false}

title @s title {"text":"Escolha alguém","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"dark_red","bold":false},{"text":" foi o primeiro a matar um Ghast rebatendo sua bola de fogo e agora pode escolher alguém para dar um shot!","color":"dark_red","bold":false}]

scoreboard players set $global return 0
