execute as @a[scores={sem_morrer=12000..}] at @s run function bebida:sem_morrer_actions

scoreboard players reset @a[scores={sem_morrer=12000..}] sem_morrer
