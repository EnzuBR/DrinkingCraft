execute as @a[scores={diamante=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:diamante_rng run function bebida:diamante_actions
execute as @a[scores={diamante_deep=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:diamante_rng run function bebida:diamante_actions

scoreboard players reset @a[scores={diamante=1..}] diamante
scoreboard players reset @a[scores={diamante_deep=1..}] diamante_deep