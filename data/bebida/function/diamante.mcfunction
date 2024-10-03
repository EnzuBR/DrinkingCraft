execute at @a[scores={diamond=1..}] run function bebida:diamante_cd
execute at @a[scores={diamond_deep=1..}] run function bebida:diamante_cd

# Reseta o score
scoreboard players reset @a[scores={diamond=1..}]
scoreboard players reset @a[scores={diamond_deep=1..}]