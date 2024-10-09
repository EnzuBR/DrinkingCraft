execute as @a[scores={ouro=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:ouro_rng run function bebida:ouro_actions
execute as @a[scores={ouro_deep=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:ouro_rng run function bebida:ouro_actions

scoreboard players reset @a[scores={ouro=1..}] ouro
scoreboard players reset @a[scores={ouro_deep=1..}] ouro_deep