execute as @a[scores={obsidian=1..}] at @s if predicate bebida:obsidian_rng run function bebida:obsidian_actions
execute as @a[scores={obsidian_cry=1..}] at @s if predicate bebida:obsidian_rng run function bebida:obsidian_actions

scoreboard players reset @a[scores={obsidian=1..}] obsidian
scoreboard players reset @a[scores={obsidian_cry=1..}] obsidian_cry
