# DrinkingCraft

Um datapack que transforma o Minecraft em um jogo de bebida. Cada minério que você quebra, chefe que derrota ou marco que alcança pode fazer você — ou o servidor inteiro — dar um gole ou virar um shot. Feito para Minecraft Java Edition 26.3 (Wilderness Bound), pack format `121.0`. Inspirado no antigo "Drunkcraft", recriado do zero para ser atualizado, confiável e em português. Feito por EnzuBR.

![Exemplo de como fica a mensagem na tela](https://cdn.modrinth.com/data/cached_images/7684b7006b816873d0f73e328ab49da0b437e8f9_0.webp)

![Exemplo quebrando diamante](https://cdn.modrinth.com/data/cached_images/78b106b706a28de664e906c0fd52d4700f4c1620.gif)

## Como funciona

Todo evento dispara da mesma forma: um título aparece na tela, um som toca e uma mensagem no chat avisa o servidor o que aconteceu e quem vai beber. Alguns eventos disparam sempre, outros dependem de sorte e alguns deixam você escolher a vítima.

### Chances jogando

Esses eventos não acontecem toda hora; primeiro rolam uma chance. A mineração é o gatilho principal (minérios normais ou de ardosia/deepslate, e Toque Suave protege nos minérios, exceto obsidian), mas matar um animal indefeso também pode sobrar para você.

| Gatilho | Chance | Efeito |
| --- | :---: | --- |
| Minerar Diamante | 25% | Todos bebem, menos você |
| Minerar Esmeralda | 7.5% | Você escolhe alguém para beber |
| Minerar Ouro (inclui Nether) | 7.5% | Você escolhe alguém para beber |
| Minerar Ferro | 4% | Você escolhe alguém para beber |
| Minerar Carvão | 3% | Você escolhe alguém para beber |
| Quebrar Obsidian (inclui Chorona) | 5% | Você bebe |
| Matar um mob passivo | 5% | Você bebe |

### Marcos únicos

Esses só acontecem uma vez por mundo: o primeiro jogador a alcançar dispara o evento para todos (ou escolhe alguém) e o marco não dispara mais.

| Marco | Efeito |
| --- | --- |
| Entrar no Nether | Todos bebem |
| Encontrar uma Fortaleza do Nether | Todos bebem |
| Encontrar a Stronghold | Todos bebem |
| Descobrir a Trial Chambers | Todos bebem |
| Encontrar o bioma de Cogumelos | Todos bebem, menos você |
| Primeira troca com um Villager | Todos bebem |
| Conseguir armadura completa de Diamante | Todos bebem, menos você |
| Entrar no End | Todos dão um shot |
| Matar o Ender Dragon | Todos dão um shot |
| Matar o Warden | Todos dão um shot, menos você |
| Conseguir armadura completa de Netherite | Todos dão um shot, menos você |
| Encontrar Ancient Debris | Você escolhe alguém para dar um shot |
| Conseguir uma Elytra | Você escolhe alguém para dar um shot |
| Conseguir "De volta ao remetente" (Ghast) | Você escolhe alguém para dar um shot |

### Toda vez

Sem sorte nem "primeiro jogador": esses disparam para qualquer jogador, toda vez.

| Evento | Efeito |
| --- | --- |
| Morrer | Você acaba sua bebida |
| Ficar 10 minutos sem morrer | Você bebe |
| Quebrar qualquer ferramenta, arma, armadura ou Elytra | Você bebe |
| Usar um Totem da Imortalidade | Você bebe |
| Entrar no servidor pela primeira vez | Você dá um shot |
| Primeiro jogador a conseguir uma Crafting Table | Você dá um shot |
| Primeira Crafting Table dos demais jogadores | 33% de chance de beber |

## Desinstalação

Execute `/function bebida:uninstall` antes de remover o datapack para limpar todos os scoreboards, tags e advancements criados pelo DrinkingCraft sem deixar rastros.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/I2I0149EW0)

## Outros idiomas
[![USA](https://cdn.modrinth.com/data/cached_images/2bc64824a9d35794d3f982b385d613c8b5b20f13.png)](https://modrinth.com/datapack/drinkingcraft-eng) [![BR](https://cdn.modrinth.com/data/cached_images/8f056b9e447c97c2e6597c6c3e6f150b037481db.png)](https://modrinth.com/datapack/drinkingcraft)
