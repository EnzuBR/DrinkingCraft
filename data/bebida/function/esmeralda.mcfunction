execute as @a[scores={esmeralda=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:esmeralda_rng run function bebida:esmeralda_actions
execute as @a[scores={esmeralda_deep=1..}] run execute unless predicate bebida:silk_touch run execute if predicate bebida:esmeralda_rng run function bebida:esmeralda_actions

scoreboard players reset @a[scores={esmeralda=1..}] esmeralda
scoreboard players reset @a[scores={esmeralda_deep=1..}] esmeralda_deep