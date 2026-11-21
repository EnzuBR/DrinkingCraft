# DrinkingCraft — Ambiente de Testes Automatizados para Mods (Modrinth JAR, Minecraft 26.3)

Suíte de testes automatizados ponta a ponta clonada de `test/` e adaptada para validar o datapack **DrinkingCraft** empacotado como **mod `.jar`** (gerado pelo Modrinth em `releases/`) diretamente na pasta `mods/` de servidores moddados **Minecraft 26.3**:

- **Fabric 26.3** (Fabric Loader + Fabric API)
- **NeoForge 26.3**
- **Forge 26.3**

Para permitir que os bots **Mineflayer** (`MC_BOT_VERSION`, padrão `26.1`) conectem a servidores **26.3** sem exigir plugins Bukkit/Paper, o ambiente sobe o proxy **ViaProxy** (`test-mod/.runtime/viaproxy/ViaProxy.jar`) apontando para a porta do servidor moddado em execução.

---

## 1. Arquitetura do Ambiente

```text
test-mod/
├── README.md                    # Este guia
├── package.json                 # Dependências Node.js (mineflayer, prismarine-chat)
├── run-tests.ps1                # Entrypoint PowerShell
├── run-tests.mjs                # Orquestrador multi-loader (JAR -> Fabric/NeoForge/Forge -> ViaProxy -> 7 suítes)
├── lib/
│   ├── config.mjs               # Portas (25570/25571/25580), listas canônicas, locales EN/PT-BR e CLI args
│   ├── jar.mjs                  # Extração e inspeção do mod .jar (metadados Modrinth + detecção de idioma)
│   ├── setup.mjs                # Auto-provisionamento de Java 25+, ViaProxy, Fabric, NeoForge, Forge e mods/
│   ├── proxy.mjs                # Gerenciamento do processo ViaProxy (26.3 <-> 26.1)
│   ├── server.mjs               # Ciclo de vida do servidor moddado (Fabric/NeoForge/Forge) + arena RCON
│   ├── bot.mjs                  # Wrapper Mineflayer + BotRecorder (chat, title, subtitle, sounds)
│   └── runner.mjs               # Runner de testes com filtros, timings e exit code
└── suites/
    ├── 01-load.mjs              # Checagem dos manifestos do .jar + boot moddado com world/datapacks vazio
    ├── 02-first-join-reload.mjs # first_join, reconexão, isolamento @s/@a e proteção init em reload vanilla
    ├── 03-multiplayer.mjs       # "Except you" vs "Except <player>", sticky subtitle e som a 140+ blocos
    ├── 04-global-locks.mjs      # Travas $global nos 14 marcos únicos
    ├── 05-mining.mjs            # 13 variantes de blocos, reset de score, Silk Touch, obsidian e RNG
    ├── 06-continuous.mjs        # morte + sem_morrer, quebrou (item + Elytra), crafting, totem e passivos
    └── 07-uninstall.mjs         # bebida:uninstall removendo objetivos, advancements e tags sem rastros
```

### Fluxo de rede e portas
Os valores padrão de porta são isolados dos de `test/` (`25569`/`25579`) para evitar conflitos:
- **Servidor Moddado 26.3 (`MC_BACKEND_PORT`)**: `127.0.0.1:25570`
- **ViaProxy (`MC_PORT`)**: `127.0.0.1:25571` *(porta em que os bots Mineflayer conectam)*
- **RCON (`MC_RCON_PORT`)**: `127.0.0.1:25580`

### Como o provisionamento funciona
1. **Java 25+**: reaproveita automaticamente `test/.runtime/jre25/` quando existir (ou `MC_JAVA_PATH` / `JAVA_HOME` / sistema), baixando Eclipse Temurin 25 apenas se necessário.
2. **ViaProxy**: baixa o release mais recente de `ViaVersion/ViaProxy` para `test-mod/.runtime/viaproxy/ViaProxy.jar`.
3. **Fabric 26.3**: consulta `meta.fabricmc.net` para Fabric Loader + Installer (`fabric-server-launch.jar`) e baixa o **Fabric API** de `26.3` via Modrinth API para `test-mod/servers/fabric/mods/fabric-api.jar`.
4. **NeoForge 26.3**: consulta a Maven API oficial da NeoForged, baixa o installer `26.3.x` e executa `--installServer` em `test-mod/servers/neoforge/`.
5. **Forge 26.3**: consulta `promotions_slim.json` da Minecraft Forge, baixa o installer `26.3-x` e executa `--installServer` em `test-mod/servers/forge/`.
6. **Instalação do Mod**: limpa apenas JARs anteriores do DrinkingCraft em `mods/` e copia o `.jar` alvo sem alterar arquivos do repositório.

---

## 2. Como Executar

### Pré-requisitos
- **Node.js >= 18** e **npm**
- Acesso à internet na 1ª execução para baixar ViaProxy, launchers/installers de Fabric, NeoForge e Forge e dependências npm.

### Exemplos de uso
Na raiz do repositório:

```powershell
# Instalar dependências (primeira vez)
npm --prefix test-mod ci

# Testar o .jar mais recente de releases/ em todos os 3 loaders (fabric, neoforge, forge)
.\test-mod\run-tests.ps1

# Testar explicitamente um .jar e loader específico
.\test-mod\run-tests.ps1 --jar releases\drinkingcraft-eng-4.0.jar --loader fabric
.\test-mod\run-tests.ps1 --jar releases\drinkingcraft-eng-4.0.jar --loader neoforge,forge

# Filtrar suíte/teste específico, logs completos e modo offline (após 1º download)
.\test-mod\run-tests.ps1 --loader neoforge --only 05-mining --skip-download --verbose
```

### Flags disponíveis
- `--jar <caminho>`: caminho do `.jar` empacotado (padrão: `.jar` mais recente em `releases/`).
- `--loader <fabric|neoforge|forge|all|lista>`: loader(s) a executar (padrão: `all`).
- `--lang <auto|en|pt>`: idioma esperado das mensagens; `auto` detecta pelo conteúdo do `.jar`.
- `--only <filtro>`: executa apenas suítes ou testes contendo a substring informada.
- `--verbose` / `-v`: exibe logs do servidor moddado e do ViaProxy em tempo real.
- `--skip-download`: usa caches já baixados em `test-mod/.runtime/` e `test-mod/servers/` sem consultar APIs externas.
- `--keep-world`: preserva `world/` entre execuções (padrão recria mundo limpo).

### Variáveis de ambiente opcionais
- `MC_BACKEND_PORT` (padrão `25570`)
- `MC_PORT` (padrão `25571`)
- `MC_RCON_PORT` (padrão `25580`)
- `MC_RCON_PASSWORD` (padrão `drinkingcraft_mod_test_rcon`)
- `MC_BOT_VERSION` (padrão `26.1`)
- `MC_JAVA_PATH` (caminho explícito para `java` 25+)

---

## 3. Diferenças em relação a `test/` (Datapack em Paper)

1. **Carregamento via `mods/`**: `world/datapacks/` permanece vazio; os dados do datapack são carregados pelo mod loader a partir do `.jar` em `mods/`.
2. **Validação dos manifestos do Modrinth**: a suíte `01-load` verifica `fabric.mod.json`, `quilt.mod.json`, `META-INF/mods.toml` e `META-INF/neoforge.mods.toml` dentro do `.jar` alvo. Rejeições reais por incompatibilidade de manifesto em algum loader (ex.: dependência de `fabric-resource-loader-v0` removida no Fabric API 26.3) são reportadas como falha do respectivo loader sem interromper os demais.
3. **Reload vanilla**: como mods não são desabilitados por `datapack disable "file/DrinkingCraft"`, a suíte `02-first-join-reload` congela ticks (`tick freeze`), remove `init`, executa `reload` vanilla e valida que `.load.mcfunction` reaplicou `init` antes de descongelar os ticks.
4. **Suporte bilíngue (`en` e `pt`)**: os textos esperados de títulos, subtítulos e chat se adaptam automaticamente ao idioma detectado no `.jar`.
