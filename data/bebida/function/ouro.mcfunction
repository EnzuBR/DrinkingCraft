execute as @a[scores={ouro=1..}] at @s unless predicate bebida:silk_touch if predicate bebida:ouro_rng run function bebida:ouro_actions
execute as @a[scores={ouro_deep=1..}] at @s unless predicate bebida:silk_touch if predicate bebida:ouro_rng run function bebida:ouro_actions
execute as @a[scores={ouro_nether=1..}] at @s unless predicate bebida:silk_touch if predicate bebida:ouro_rng run function bebida:ouro_actions

scoreboard players reset @a[scores={ouro=1..}] ouro
scoreboard players reset @a[scores={ouro_deep=1..}] ouro_deep
scoreboard players reset @a[scores={ouro_nether=1..}] ouro_nether
