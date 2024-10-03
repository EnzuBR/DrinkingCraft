execute at @a[scores={ferro=1..}] run function bebida:ferro_rng
execute at @a[scores={ferro_deep=1..}] run function bebida:ferro_rng

scoreboard players reset @a[scores={ferro=1..}] ferro
scoreboard players reset @a[scores={ferro_deep=1..}] ferro_deep