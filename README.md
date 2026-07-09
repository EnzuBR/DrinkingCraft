# DrinkingCraft

DrinkingCraft turns Minecraft into a drinking game. Every ore you mine, boss you kill, and milestone you reach can send you — or the whole server — reaching for a drink. Built for Java Edition 26.2 (Chaos Cubed), pack format `107.1`. Inspired by the now-unavailable "Drunkcraft," rebuilt from scratch to be updated, reliable, and more fun. Made by EnzuBR.

![Example of how the message appears on screen](https://cdn.modrinth.com/data/cached_images/b196f8e4fc15134906590f1bddff9f377c42d804_0.webp)

![Example of breaking diamond](https://cdn.modrinth.com/data/cached_images/2a8f2bdba248ae4a32b4215f01fc6aec5bdf7fe3.gif)

## How it works

Every event fires the same way: a title flashes on screen, a sound plays, and a chat message tells the server what happened and who's drinking. Some events always trigger, others roll the dice — and a few let you pick your victim.

### Odds while playing

These events don't fire every time — they roll a chance first. Mining is the main trigger here (surface or deepslate ore, silk touch always spares you), but killing something defenseless can catch up with you too.

| Trigger                      | Chance | Effect                          |
| ------------------------------ | :----: | -------------------------------- |
| Mining Diamond                 |  25%   | Everyone drinks, except you      |
| Mining Emerald                 |  7.5%  | You choose someone to drink      |
| Mining Gold (including Nether) |  7.5%  | You choose someone to drink      |
| Mining Iron                    |   4%   | You choose someone to drink      |
| Mining Coal                    |   3%   | You choose someone to drink      |
| Breaking Obsidian               |   5%   | You drink                        |
| Killing a passive mob           |   5%   | You drink                        |

### First-time milestones

These only happen once per world — the first player to reach them triggers the event for everyone (or gets to pick a victim), and it never fires again.

| Milestone                        | Effect                                    |
| --------------------------------- | ------------------------------------------ |
| Entering the Nether                | Everyone drinks                            |
| Finding a Nether Fortress          | Everyone drinks                            |
| Finding a Stronghold               | Everyone drinks                            |
| Discovering the Trial Chambers     | Everyone drinks                            |
| Finding the Mushroom Fields biome  | Everyone drinks, except you                |
| First trade with a Villager        | Everyone drinks                            |
| Getting full Diamond armor         | Everyone drinks, except you                |
| Entering the End                   | Everyone takes a shot                      |
| Killing the Ender Dragon           | Everyone takes a shot                      |
| Killing the Warden                 | Everyone takes a shot, except you          |
| Getting full Netherite armor       | Everyone takes a shot, except you          |
| Finding Ancient Debris             | You choose someone to take a shot          |
| Getting an Elytra                  | You choose someone to take a shot          |
| Getting Return to Sender           | You choose someone to take a shot          |

### Every time

No luck, no "first player" — these fire for anyone, every single time.

| Event                          | Effect                       |
| -------------------------------- | ------------------------------ |
| Dying                             | You finish your drink          |
| Surviving 10 minutes without dying | You drink                    |
| Any tool, weapon, armor piece, or elytra breaking | You drink       |
| Using a Totem of Undying          | You drink                      |
| Joining the server for the first time | You take a shot            |
| Picking up your first Crafting Table | You take a shot             |
| Picking up any Crafting Table after that | 33% chance you drink    |

## Uninstalling

Run `/function bebida:uninstall` before removing the datapack — it cleans up every scoreboard, tag, and advancement DrinkingCraft added, so nothing lingers behind.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/I2I0149EW0)

## Other languages
[![USA](https://cdn.modrinth.com/data/cached_images/2bc64824a9d35794d3f982b385d613c8b5b20f13.png)](https://modrinth.com/datapack/drinkingcraft-eng) [![BR](https://cdn.modrinth.com/data/cached_images/8f056b9e447c97c2e6597c6c3e6f150b037481db.png)](https://modrinth.com/datapack/drinkingcraft)
