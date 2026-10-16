# Pokémon Arena

3D arena battles with 81 Pokémon (full evolution lines) and 33 Mega Evolutions, real stats, level-up movesets and the official damage formula.

- **Real 3D Pokémon:** animated 3D models (111 of 114 forms, incl. Megas) with a procedural rig — breathing, walking, lunging, recoiling, roaring, fainting. Models with full game animations use them.
- **Trainers:** a 3D trainer per player (outfits: Red, Blue, Leaf, May, Dawn, Ethan; custom names). They throw the Poké Ball, point to command, raise their Key Stone for Mega Evolution, cheer and despair.
- **3D move effects:** GPU particles, energy beams, lightning, shockwaves, debris, ground scorch/crack/frost marks, dynamic lights and bloom. Every move has an effect styled by its type (beam, stream, orb, bolt, sky strike, quake, rock slide, slash, bite, punch, buff, heal, drain, powder, shield...).
- **Broadcast camera:** high-angle view with close-ups on attacks, throws, Mega Evolutions and faints.
- **6 arenas:** Pokémon Stadium, Viridian Forest, Mt. Chimney Crater, Sunny Beach, Ice Path Cavern and Lumiose Night Arena.

## Run it
Double-click **`start.bat`**. It starts a tiny local server and opens http://localhost:8080 in Chrome/Edge.
The game must run through that server (the 3D engine loads as modules); opening `index.html` directly shows a reminder.

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
node tools/build-models.mjs
```
Data, sprites and cries come from PokéAPI (https://pokeapi.co).

## Rebuild 3D models / libraries
```
node tools/build-models.mjs
```
Downloads the .glb models for every species in data.js from the Pokémon 3D API asset repo
(https://github.com/Pokemon-3D-api/assets — fan project, non-commercial) and three.js r170 into `lib/`.
`tools/model-preview.html` (open via the server) shows models side by side.

## Not implemented (yet)
Abilities, held items other than Mega Stones, weather/terrain, two-turn moves (Solar Beam, Fly, Hyper Beam…). Moves the engine can't run are hidden from move lists.
