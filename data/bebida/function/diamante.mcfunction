execute at @a[scores={diamante=1..}] run function bebida:diamante_rng
execute at @a[scores={diamante_deep=1..}] run function bebida:diamante_rng

scoreboard players reset @a[scores={diamante=1..}] diamante
scoreboard players reset @a[scores={diamante_deep=1..}] diamante_deep