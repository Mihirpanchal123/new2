# Live 3D Pokémon (Retro 2D, prototype)

Species listed in `manifest.json` are drawn in Retro 2D battles from their real animated 3D model, every
frame, by `retro3d.js`. Nothing is pre-rendered. three.js (already in `lib/`) loads only when such a Pokémon
is in the battle. The model renders offscreen with a fixed orthographic 3/4 camera, toon lighting and a
cast shadow, then a GPU pass reduces it to the art-pixel grid (12-level palette, 1 px outline). Retro then
draws that frame like any sprite, so the camera, effects, flashes, HUD and battle logic are unchanged.
Live models are preferred over the baked `sprites25d/` sheets. Settings → "Live 3D Pokémon" turns them off.
A Mega Evolution switches to its pixel sprite.

## Current models
| species | file | source | clips used |
|---|---|---|---|
| mewtwo | `mewtwo.glb` (1.4 MB) | Pokémon 3D API assets `models/regular-150.glb` (git `b596552`) | idle, run, attack, special, hurt, stun → recovery, faint, roar, sleep, win |

These models come from the fan collection https://github.com/Pokemon-3D-api/assets. Its README states that
the models are property of Nintendo / Creatures Inc. / GAME FREAK inc. (non-commercial, personal use only).

## Adding a species
1. Get the .glb, e.g. from git history: `git show b596552:pokemon-arena/models/regular-149.glb > dragonite-src.glb`
2. Slim it, keeping only the battle clips and dropping redundant keyframes:
   `node tools/slim-glb.mjs dragonite-src.glb models3d/dragonite.glb`
3. Add it to `manifest.json`: `"dragonite": { "file": "models3d/dragonite.glb", "heightPx": 112 }`
   (`heightPx` = standing height in art pixels; the bake used `clamp(46 + height_m * 30, 54, 112)`).

Clip names are matched by the rules in `CLIPS` in `retro3d.js` (official `pmXXXX_..._attack01` names first,
then the other naming schemes). Root motion is removed at load because Retro moves the Pokémon itself.
Models exported without normals (unlit) get computed normals.

## Asset requirements for more species
Most models in the collection are static: their `clips` entry in `models.js` is empty, or holds a single
generic action. A static model would render as a stiff 3D statue, so don't add it as a live model; such
species should keep their animated sprite. A good live model has:
- a skinned mesh with **idle (loop), run (loop), physical attack, special attack, damage, faint** clips;
  stun start/loop/end, roar and a victory clip are used when present.
- under ~10k triangles and textures ≤ 1024 px (they are downscaled to 512 px at load).

Ready-to-use candidates from the same collection: Dragonite, Raichu-Mega X/Y, Scizor-Mega, Lucario-Mega Z,
Garchomp-Mega Z (official clip set), plus Grovyle and Bulbasaur (partial sets; Bulbasaur has no damage clip).
