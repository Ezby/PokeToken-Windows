# PokéToken Windows

Hatch an egg, evolve your Pokémon, and build a collection while you work with Codex on Windows.

[한국어](README.ko.md) · [Download ZIP](https://github.com/Ezby/PokeToken-Windows/archive/refs/heads/main.zip) · [Tests](https://github.com/Ezby/PokeToken-Windows/actions/workflows/test.yml)

An independent, unofficial Windows MVP inspired by [chattymin/PokeTokenBar](https://github.com/chattymin/PokeTokenBar). This is a separate implementation with no original application source code included, and is not an official Windows port or Pokémon product.

## Quick start

1. Install [Node.js LTS](https://nodejs.org/) on Windows 10 or 11. **Node.js 22 or newer** is required.
2. [Download the ZIP](https://github.com/Ezby/PokeToken-Windows/archive/refs/heads/main.zip) and **extract it** to a writable folder.
3. Double-click **`Start-PokeToken.cmd`**.
4. Your browser opens **http://127.0.0.1:32145**. Use Codex and watch your companion grow.

No npm dependencies, API keys, or paid API requests are required. The app interface is currently in Korean.

The collector keeps running when you close the browser. Restarting Windows stops it; launching the app again resumes your progress. To stop it manually, run `Stop-PokeToken.ps1` in PowerShell. The app does not register itself to start at login.

## Features

- Eggs that hatch with newly recorded Codex token usage.
- Two evolutions, graduation, and a collection of graduated companions.
- Bulbasaur, Charmander, and Squirtle evolution lines in sequence.
- Automatic usage refresh every 15 seconds, plus a manual **↻** button.
- Local automatic saves with a previous-save backup.

This MVP runs in a browser with a local Node.js server. Floating desktop pets, a system tray interface, shops, shiny variants, and the original application's 649-species Pokédex are outside its current scope.

## Growth

| Tokens earned for the current companion | Milestone |
| --- | --- |
| 0 | Start with a Bulbasaur egg |
| 20,000 | Hatch |
| 100,000 | First evolution |
| 250,000 | Final evolution |
| 400,000 | Graduation available |

Click **졸업하고 새 알 만나기 →** to graduate your companion and receive a new egg. Graduates remain in your collection. Eggs cycle through Bulbasaur → Charmander → Squirtle.

Graduation resets the current companion's growth to zero; excess growth does not carry over. Your lifetime token total is retained.

On first launch, existing session history establishes a baseline. **Only newly recorded tokens count toward growth.** Input and output tokens are counted. Cached input counts only as already included in input usage; reasoning tokens are not added again on top of output usage. The app does not calculate charges.

## Privacy and saves

- Default log location: `%USERPROFILE%\.codex\sessions\**\*.jsonl`. With `CODEX_HOME` set, its `sessions` subdirectory is used instead.
- The collector reads local `event_msg / token_count` events. Conversation text, account credentials, and authentication files are not saved or transmitted.
- The server listens on **127.0.0.1 only**, not your network interfaces.
- Sprites load directly in your browser from [PokeAPI/sprites](https://github.com/PokeAPI/sprites). GitHub receives ordinary image-request information and the Pokémon number. Growth and saving work without images.
- Progress, collection entries, log paths, read offsets, and counters are stored in `data/save.json`. The previous save is kept as `data/save.json.bak`.
- An unreadable save is preserved. With the collector stopped, restore a valid backup by copying `save.json.bak` to `save.json`.
- `data/` is ignored by Git. Keep saves and personal session logs private.

Use a writable folder and run only one copy at a time.

## Troubleshooting

**No connected sessions:** Use Codex locally and check that session logs exist in the expected directory. Set a custom `CODEX_HOME` before launching if needed. Cloud-only activity without local logs is not tracked.

**Slow first launch:** The initial scan reads existing history to establish a baseline. Later scans read appended records.

**Usage differs from official totals:** Growth uses local session events, not billing or quota APIs. Log-format changes may require updates. Copying old logs into the directory while the app runs can count those records as newly discovered usage.

**Port conflict:** The default port is 32145. Stop the conflicting app, or launch `server.mjs` directly with `POKETOKEN_PORT` set and open the matching URL. The double-click launcher and stop script use the default port.

## Development and contributions

```sh
npm start
npm test
```

No dependency installation is needed. Tests cover growth stages, token parsing, incremental reads, partial writes, repeated events, counter resets, first-launch baselines, graduation, save restoration, and origin checks. GitHub Actions runs tests on Windows with Node.js 22.

| Environment variable | Purpose |
| --- | --- |
| `CODEX_HOME` | Codex directory containing `sessions/` |
| `POKETOKEN_DATA_DIR` | Override the save directory |
| `POKETOKEN_PORT` | Override the port when launching the server directly |

Contributions and bug reports are welcome. Use synthetic token events in tests and remove personal paths, conversations, and credentials from reports.

## Credits and license

- Inspiration: [PokeTokenBar by chattymin](https://github.com/chattymin/PokeTokenBar).
- Sprite delivery: [PokeAPI/sprites](https://github.com/PokeAPI/sprites). Sprites are not redistributed in this repository.
- Independent application code: [MIT](LICENSE).
- Pokémon characters, names, trademarks, and graphics belong to their respective owners, including Nintendo, Creatures, and GAME FREAK. The code license does not grant rights to those assets or trademarks.

Not affiliated with or endorsed by those rights holders or the original PokeTokenBar developer.
