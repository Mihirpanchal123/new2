# Pokémon Arena

3D arena battles with 81 Pokémon (full evolution lines) and 33 Mega Evolutions, real stats, level-up movesets and the official damage formula.

## Run it
Double-click **`start.bat`**. It starts a tiny local server and opens http://localhost:8080 in Chrome/Edge.
Use Chrome or Edge: recording needs them, and opening `index.html` directly can block it.

## Play
1. **Team builder:** click Pokémon to add them to the highlighted player. Set level, Mega Stone, 4 moves, or evolve/de-evolve each slot.
   Evolved forms can't go below their real evolution level (Charizard ≥ 36). Pick Human or CPU for each player.
2. **Battle:** choose a move, or switch. If your Pokémon holds a Mega Stone, toggle **Mega Evolve** before picking a move (once per battle).
3. **Auto-play:** tick "Auto-play next random battle" for endless CPU vs CPU battles.

## Record for upload
Click **⏺ Record** (or press **R**), then pick **this tab** and tick "share tab audio" for the cries.
Every battle is saved as its own video (`pokemon-battle-<date>.mp4`) in your Downloads folder. Press R again to stop.
Combine with auto-play + Turbo speed to record lots of battles hands-free.

## Add more Pokémon
Add an evolution chain's first species to `ROOTS` in `tools/build-data.mjs`, then run:
```
node tools/build-data.mjs
```
Data, sprites and cries come from PokéAPI (https://pokeapi.co).

## Not implemented (yet)
Abilities, held items other than Mega Stones, weather/terrain, two-turn moves (Solar Beam, Fly, Hyper Beam…). Moves the engine can't run are hidden from move lists.
