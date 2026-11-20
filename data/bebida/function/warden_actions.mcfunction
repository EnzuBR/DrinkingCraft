title @a times 10t 60t 20t

title @a subtitle [{"text":"Menos ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Menos você","color":"white","bold":false}

title @a title {"text":"Todos dão um shot","color":"gold","bold":true}

execute as @a at @s run playsound minecraft:entity.wither.ambient player @s ~ ~ ~ 1 1

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"blue","bold":false},{"text":" teve coragem para matar o Warden, todos devem dar um shot, menos ","color":"blue","bold":false},{"selector":"@s","color":"blue","bold":false},{"text":"!","color":"blue","bold":false}]

scoreboard players set $global warden 0
