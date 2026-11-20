# DrinkingCraft — Ambiente de Testes Automatizados Headless (Minecraft 26.3)

Suíte de testes automatizados ponta a ponta que sobe um servidor **Paper 26.3** headless real com **ViaVersion + ViaBackwards**, carrega o datapack diretamente da raiz do repositório, conecta múltiplos jogadores reais via **Mineflayer** (`BotAlpha` e `BotBeta`) e valida via **RCON + pacotes de rede** títulos, subtítulos, sons, chat, scoreboards, tags e advancements.

---

## 1. Arquitetura do Ambiente

```text
test/
├── README.md                    # Este guia e checklist de regressão
├── package.json                 # Dependências Node.js (mineflayer, prismarine-chat)
├── run-tests.ps1                # Entrypoint único (PowerShell)
├── run-tests.mjs                # Orquestrador (setup -> Paper 26.3 -> bots -> 7 suítes -> cleanup)
├── lib/
│   ├── config.mjs               # Portas, listas canônicas (30 objetivos, 18 advs, 13 minérios, 14 marcos)
│   ├── setup.mjs                # Auto-provisionamento de Java 25+, Paper 26.3, ViaVersion, ViaBackwards e sync
│   ├── rcon.mjs                 # Cliente RCON TCP puro
│   ├── server.mjs               # Ciclo de vida do Paper 26.3 + captura de logs + arena de testes
│   ├── bot.mjs                  # Wrapper Mineflayer + BotRecorder (chat, title, subtitle, sounds)
│   └── runner.mjs               # Runner de testes com filtros, timings e exit code
└── suites/
    ├── 01-load.mjs              # Checagens estáticas + boot 26.3 + datapack enabled + 30 objetivos
    ├── 02-first-join-reload.mjs # first_join, reconexão, isolamento @s/@a e tag init no reload/enable
    ├── 03-multiplayer.mjs       # "Except you" vs "Except <player>", sticky subtitle, playsound a 140+ blocos
    ├── 04-global-locks.mjs      # Travas $global nos 14 marcos únicos (1º jogador vs 2º jogador)
    ├── 05-mining.mjs            # 13 variantes de blocos, reset de score, Silk Touch, exceção obsidian e RNG
    ├── 06-continuous.mjs        # morte + sem_morrer, quebrou (item + Elytra), crafting (1º vs 33%), totem, passivos
    └── 07-uninstall.mjs         # bebida:uninstall removendo objetivos, advancements e tags sem rastros
```

### Como funciona o provisionamento automático
Na primeira execução, `lib/setup.mjs` verifica e baixa automaticamente apenas o que faltar:
1. **Java 25+**: procura na variável `MC_JAVA_PATH`, em `test/.runtime/jre25/`, `JAVA_HOME`, pastas padrão do sistema e `PATH`. Se não encontrar Java >= 25, baixa o **Eclipse Temurin 25 JRE** portátil via API da Adoptium em `test/.runtime/jre25/`.
2. **Paper 26.3**: consulta a API **Fill v3** da PaperMC (`fill.papermc.io`) e baixa o build mais recente para `test/server/paper-26.3.jar`.
3. **ViaVersion + ViaBackwards**: baixa as versões mais recentes compatíveis com Paper via **Hangar API** (com fallback para **Modrinth API**) para `test/server/plugins/`, permitindo que bots Mineflayer conectem a um servidor 26.3 real mantendo o servidor nativamente na versão **26.3**.
4. **Sync do Datapack**: copia **apenas** `pack.mcmeta` e `data/` da raiz para `test/server/world/datapacks/DrinkingCraft` a cada boot limpo (evitando recursão com a própria pasta `test/server/`).

### O que é versionado vs ignorado no `.gitignore`
- **Versionado**: `test/README.md`, `test/package.json`, `test/run-tests.ps1`, `test/run-tests.mjs`, `test/lib/*.mjs`, `test/suites/*.mjs`.
- **Ignorado no `.gitignore`**: `test/node_modules/`, `test/.runtime/` (JRE 25 portátil), `test/server/` (JARs do Paper/plugins, mundo temporário, logs) e `*.jar`.

---

## 2. Pré-requisitos e Como Rodar

### Pré-requisitos
- **Node.js >= 18** (testado com Node 22) e **npm**
- **Acesso à internet na 1ª execução** (para baixar `node_modules`, Temurin JRE 25, Paper 26.3 e plugins Via*). Execuções seguintes reutilizam o cache local.

### Execução padrão (comando único)
Na raiz do repositório:
```powershell
.\test\run-tests.ps1
```
Ou via npm/node:
```powershell
npm --prefix test test
```

### Flags úteis e variáveis de ambiente
```powershell
# Rodar apenas uma suíte ou teste específico (substring do nome)
.\test\run-tests.ps1 --only 05-mining
.\test\run-tests.ps1 --only crafting

# Exibir logs completos do console do Paper em tempo real
.\test\run-tests.ps1 --verbose

# Reaproveitar caches já baixados sem consultar APIs externas (modo offline)
.\test\run-tests.ps1 --skip-download

# Manter o mundo entre execuções (útil apenas ao depurar estado específico; padrão recria world/ limpo)
.\test\run-tests.ps1 --keep-world
```

Variáveis de ambiente opcionais:
- `MC_PORT` (padrão `25569`)
- `MC_RCON_PORT` (padrão `25579`)
- `MC_RCON_PASSWORD` (padrão `drinkingcraft_test_rcon`)
- `MC_BOT_VERSION` (padrão `26.1`)
- `MC_JAVA_PATH` (caminho explícito para um executável `java` 25+)

---

## 3. Cobertura das Suítes Automatizadas

| Suíte | O que valida na prática |
| :--- | :--- |
| `01-load` | Valida `pack.mcmeta` (`[121, 0]` / `121`), sintaxe de todos os JSONs, ausência de `"condition":`, listas cruas em `player`/`entity`, `@p` e `playsound .* player @a`; checa paridade 1:1 `.load` <-> `advancements` <-> `uninstall`; verifica zero erros de datapack no boot do Paper 26.3, `file/DrinkingCraft` habilitado e todos os 30 objetivos criados. |
| `02-first-join-reload` | Valida disparo de `first_join` (`Dê um shot` + `wither.ambient` + tag `init`) na 1ª entrada, não-disparo ao reconectar, isolamento `@s`/`@a` quando o 2º jogador entra, e proteção de jogadores online via `tag @a[tag=!init] add init` ao reabilitar o datapack ou rodar `minecraft:reload`. |
| `03-multiplayer` | Valida `"Menos você"` para `@s` vs `"Menos <player>"` para `@a` (`full_dima`), recebimento de som a 140+ blocos de distância, isolamento de título/som em evento apenas `@s` (`debris`), e limpeza explícita de subtítulo (`{"text":""}`) para evitar *sticky subtitle*. |
| `04-global-locks` | Valida as travas `$global` nos 14 marcos únicos (incluindo `elytra` -> `elytra_first`, `full_netherite`, mudança de dimensão para Nether e End, abate real de Warden com espada e os demais marcos de estrutura/bioma/combate), garantindo que o 2º jogador nunca dispare de novo. |
| `05-mining` | Valida mineração física real das 13 variantes de blocos (`diamond_ore`, `deepslate_*`, `nether_gold_ore`, `obsidian`, `crying_obsidian`, etc.), anti-exploit com Silk Touch (bloqueia os 5 minérios + reseta scores, mas mantém `obsidian` e `obsidian_cry` ativos) e disparo RNG de todas as 13 variantes sem Silk Touch. |
| `06-continuous` | Valida `morte` (inclui reset de `sem_morrer` próximo de 12000 ticks), `sem_morrer >= 12000`, `quebrou` repetido 2x com picareta e 1x com Elytra (`durability <= 1`), `crafting` (1º jogador toma shot e nunca ambos os branches; demais têm 33% de beber e não re-disparam), `totem` repetido 2x e `passivos` (abate real de porco + auto-revogação + RNG). |
| `07-uninstall` | Executa `bebida:uninstall` e confirma remoção integral dos 30 objetivos, das tags `init` e dos 18 advancements em ambos os bots sem deixar rastros. |

---

## 4. Checklist de Testes para Novas Implementações no Datapack

Sempre que adicionar ou modificar qualquer mecânica no datapack, verifique os itens abaixo **e** adicione/atualize os asserts correspondentes em `test/suites/` e `test/lib/config.mjs`:

### A. Novo Marco Único ("Primeira vez no mundo")
- [ ] **Schema 26.3**: advancement sem `display`/`parent`, `"sends_telemetry_event": false`, `"type"` no lugar de `"condition"`, objeto direto em `"player"`/`"entity"` (nunca `[...]`), e `rewards.function = "bebida:<evento>"`.
- [ ] **Objetivo `$global`**: adicionado em `.load.mcfunction`, sem colidir com nenhum objetivo existente, e usado **exatamente com o mesmo nome** em `<evento>.mcfunction` e `scoreboard players set $global <obj> 0` em `<evento>_actions.mcfunction`.
- [ ] **Paridade `uninstall.mcfunction`**: adicionados `advancement revoke @a only bebida:<evento>` e `scoreboard objectives remove <obj>`.
- [ ] **Trava do 2º jogador**: confirmar na suíte `04-global-locks` que o 1º jogador dispara e o 2º jogador não dispara nem recebe título/som/chat.
- [ ] **Idioma da branch**: confirmar que textos de UI (`title`, `subtitle`, `tellraw`) estão em português BR na branch `main` (ou inglês na `ENG`).

### B. Novo Evento de Mineração / Tick / RNG
- [ ] **Variantes completas**: todas as variantes do bloco existem como objetivos separados em `.load.mcfunction` e `uninstall.mcfunction` (normal, `deepslate_*`, variantes de Nether/crying se houver).
- [ ] **Silk Touch**: decidir explicitamente se o evento exige `unless predicate bebida:silk_touch` e testar com picareta Silk Touch vs picareta comum.
- [ ] **Reset atômico no miss E no hit**: se o jogador minerar e o RNG falhar (95%+ dos casos), o score do minério **ainda precisa ser resetado** dentro de `internal/<evento>_check.mcfunction` para não acumular e rolar novamente no tick seguinte.
- [ ] **Contexto `@s` / `at @s`**: função chamada via `execute as @a[scores={...}] at @s run function bebida:internal/<evento>_check` (nunca `@p`).
- [ ] **Registro no tick**: função listada em `.tick.mcfunction`.

### C. Novo Evento Repetível via Advancement (`passivos`, `totem`, `quebrou`, etc.)
- [ ] **Auto-revogação imediata**: a primeira linha da função reward executa `advancement revoke @s only bebida:<evento>` antes de qualquer predicate RNG — assim mesmo se o RNG falhar, o próximo evento volta a disparar.
- [ ] **Tags com `required: false`**: para mobs/blocos/itens recentes ou opcionais, usar `{"id": "...", "required": false}` em `data/bebida/tags/`.
- [ ] **Teste de repetibilidade**: acionar o evento **pelo menos 2 vezes seguidas** no mesmo jogador.

### D. Alterações de Apresentação (`*_actions.mcfunction`) e `.load`/`.tick`
- [ ] **Sem sticky subtitle**: eventos sem subtítulo **precisam** enviar `title <@s|@a> subtitle {"text":""}` antes de `title ... title`.
- [ ] **Ordem "Menos você"**: `title @a subtitle ["Menos ", @s]` **sempre antes** de `title @s subtitle {"text":"Menos você"}` e ambos antes de `title @a title ...`.
- [ ] **Som à distância**: eventos coletivos usam `execute as @a at @s run playsound <som> player @s ~ ~ ~ 1 1` (nunca `playsound ... player @a`).
- [ ] **Hierarquia sonora correta**: `experience_orb.pickup` (beber/escolher beber), `player.levelup` (todos bebem), `wither.ambient` (qualquer shot), `block.anvil.place` (morte).

---

## 5. Catálogo de Edge Cases Críticos para Verificar

1. **Sticky Subtitle no cliente Minecraft**: o cliente mantém o último subtítulo exibido se um novo `title` não enviar `subtitle {"text":""}` antes. Sempre testar um evento sem subtítulo logo após um evento com subtítulo (`"Menos você"`, `"Menos BotAlpha"` ou `"Para dar um shot"`).
2. **Copy-paste errado de `$global`**: copiar `cogu_actions.mcfunction` e esquecer de trocar `scoreboard players set $global <obj> 0` faz o marco disparar infinitamente ou travar outro marco. Sempre validar o objetivo exato após o disparo.
3. **Ordem de execução em `crafting.mcfunction`**: `execute if score $global crafting = $global crafting ...` deve rodar **antes** de `execute unless score $global crafting = $global crafting ...`; se inverter, o 1º jogador seta `$global crafting = 0` e dispara os dois eventos no mesmo tick.
4. **Alcance do `playsound` em multiplayer**: `playsound ... player @a` sem `at @s` falha silenciosamente para jogadores além de ~16 blocos. Sempre testar com um jogador a 140+ blocos de distância.
5. **Reset de `sem_morrer` ao morrer**: morrer aos 9m59s (`sem_morrer = 11985`) sem resetar `sem_morrer` dentro de `morte_actions.mcfunction` faz o jogador receber dois drinks em sequência ao renascer.
6. **Elytra em `quebrou`**: Elytras não chegam a `durability = 0` ao quebrar; elas param utilizáveis em `durability = 1`. O critério precisa cobrir `minecraft:elytra` com `"durability": {"max": 1}` e `"delta": {"max": -1}`.
7. **Proteção `init` em `.load.mcfunction`**: executar `/minecraft:reload` ou instalar/reabilitar o datapack com jogadores já online **não** pode disparar `first_join` para eles.
8. **`bebida:uninstall` vs `.tick` em execução**: se o datapack continuar habilitado após `bebida:uninstall`, o próximo tick (50ms depois) disparará `first_join` e recriará a tag `init`. Ao testar desinstalação no jogo, execute `/function bebida:uninstall` e imediatamente `/datapack disable "file/DrinkingCraft"` (ou congele ticks durante a inspeção).
9. **Paper `/reload` vs `/minecraft:reload`**: em servidores Paper com plugins (como ViaVersion/ViaBackwards nos testes), `/reload` aciona o reload de plugins do Bukkit e pode causar erros; use `/minecraft:reload` ou `/datapack disable` + `/datapack enable` para recarregar apenas datapacks.
10. **`.gitignore` sem `.*`**: nunca adicione `.*` genérico no `.gitignore`, pois isso ocultaria `data/bebida/function/.load.mcfunction` e `.tick.mcfunction` do Git.

---

## 6. Troubleshooting

- **`Java 25+ not found` / erro `UnsupportedClassVersionError` (major version 69)**: delete `test/.runtime/jre25/` e rode `.\test\run-tests.ps1` sem `--skip-download` para baixar o Temurin 25 novamente, ou defina `$env:MC_JAVA_PATH`.
- **Timeout no primeiro startup do Paper**: no primeiro run o Paper baixa/aplica patches do servidor vanilla 26.3; se a rede estiver lenta e passar de 240s, rode novamente após concluir o download em `test/server/cache/`.
- **Conflito de porta (`25569` / `25579`)**: defina `MC_PORT` e `MC_RCON_PORT` para outras portas livres antes de rodar.
- **Erro de protocolo ou bot desconectado**: verifique se `ViaVersion.jar` e `ViaBackwards.jar` em `test/server/plugins/` são recentes o suficiente para traduzir 26.3 -> `MC_BOT_VERSION` (`26.1`), ou remova `test/server/plugins/*.jar` e `test/server/.versions.json` para atualizar.
- **Processos órfãos do Java após cancelar manualmente**: se interromper o terminal à força durante um boot, encerre eventual `java.exe` rodando em `test/server` antes da próxima execução.
