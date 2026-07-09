execute as @a[scores={mortes=1..}] at @s run function bebida:morte_actions

scoreboard players reset @a[scores={mortes=1..}] mortes
