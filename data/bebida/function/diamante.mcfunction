execute at @a[scores={diamond=1..}] run function bebida:diamante_rng
execute at @a[scores={diamond_deep=1..}] run function bebida:diamante_rng

scoreboard players reset @a[scores={diamond=1..}] diamond
scoreboard players reset @a[scores={diamond_deep=1..}] diamond_deep