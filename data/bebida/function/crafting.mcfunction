# A checagem "if score" precisa vir ANTES de crafting_actions setar o score,
# senao o primeiro jogador dispara os dois eventos no mesmo trigger
execute if score $global crafting = $global crafting if predicate bebida:crafting_rng run function bebida:crafting_actions2
execute unless score $global crafting = $global crafting run function bebida:crafting_actions
