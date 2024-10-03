execute at @a[scores={carvao=1..}] run function bebida:carvao_rng
execute at @a[scores={carvao_deep=1..}] run function bebida:carvao_rng

scoreboard players reset @a[scores={carvao=1..}] carvao
scoreboard players reset @a[scores={carvao_deep=1..}] carvao_deep