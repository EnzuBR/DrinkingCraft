execute as @a[scores={ferro=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:ferro_rng run function bebida:ferro_actions
execute as @a[scores={ferro_deep=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:ferro_rng run function bebida:ferro_actions

scoreboard players reset @a[scores={ferro=1..}] ferro
scoreboard players reset @a[scores={ferro_deep=1..}] ferro_deep