execute as @a[scores={carvao=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:carvao_rng run function bebida:carvao_actions
execute as @a[scores={carvao_deep=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:carvao_rng run function bebida:carvao_actions

scoreboard players reset @a[scores={carvao=1..}] carvao
scoreboard players reset @a[scores={carvao_deep=1..}] carvao_deep