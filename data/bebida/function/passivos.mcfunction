# Reward do advancement bebida:passivos (roda como/na posicao do jogador que matou)
# Revoga para que o advancement possa disparar de novo na proxima morte de mob passivo
advancement revoke @s only bebida:passivos

execute if predicate bebida:passivos_rng run function bebida:passivos_actions
