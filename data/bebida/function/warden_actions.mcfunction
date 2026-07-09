title @a times 10t 60t 20t

title @a subtitle [{"text":"Except ","color":"white","bold":false},{"selector":"@s","color":"white","bold":false}]

title @s subtitle {"text":"Except you","color":"white","bold":false}

title @a title {"text":"Everyone takes a shot","color":"gold","bold":true}

playsound minecraft:entity.wither.ambient player @a

tellraw @a [{"text":"<DrinkingCraft> ","color":"gold","bold":true},{"selector":"@s","color":"blue","bold":false},{"text":" was brave enough to slay the Warden, everyone must take a shot, except ","color":"blue","bold":false},{"selector":"@s","color":"blue","bold":false},{"text":"!","color":"blue","bold":false}]

scoreboard players set $global warden 0
