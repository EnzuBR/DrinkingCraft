execute as @a[scores={ferro=1..}] at @s unless predicate bebida:silk_touch if predicate bebida:ferro_rng run function bebida:ferro_actions
execute as @a[scores={ferro_deep=1..}] at @s unless predicate bebida:silk_touch if predicate bebida:ferro_rng run function bebida:ferro_actions

scoreboard players reset @a[scores={ferro=1..}] ferro
scoreboard players reset @a[scores={ferro_deep=1..}] ferro_deep
