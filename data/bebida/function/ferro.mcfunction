execute at @a[scores={ferro=1..}] run execute if predicate bebida:ferro_rng run function bebida:ferro_actions
execute at @a[scores={ferro_deep=1..}] run execute if predicate bebida:ferro_rng run function bebida:ferro_actions

scoreboard players reset @a[scores={ferro=1..}] ferro
scoreboard players reset @a[scores={ferro_deep=1..}] ferro_deep