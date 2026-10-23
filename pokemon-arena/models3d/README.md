# Live 3D Pokémon (Retro 2D)

Every form listed in `manifest.json` is drawn in Retro 2D battles from its real 3D model, every frame, by
`retro3d.js`. Nothing is pre-rendered. three.js (in `lib/`) loads only when such a Pokémon is in the battle. The model
renders offscreen with a fixed orthographic 3/4 camera, toon lighting and a cast shadow, then a GPU pass reduces it to
the art-pixel grid (12-level palette, 1 px outline). Retro then draws that frame like any sprite, so the camera,
effects, flashes, HUD and battle logic are unchanged.
A Mega Evolution switches to the Mega form's model. Settings → "Live 3D Pokémon" turns them off.

## Building the models
    node tools/build-live3d.mjs                 every form in data.js that has no model yet
    node tools/build-live3d.mjs pikachu gengar  only these (rebuilds them)
    node tools/build-live3d.mjs --force         everything again

For each form the tool reads only the glTF header of each candidate, picks the best, downloads it, slims it with
`tools/slim-glb.mjs` (battle clips only, redundant keyframes and lower levels of detail dropped) and writes the
manifest entry: `file`, `heightPx` (standing height in art pixels, `clamp(46 + height_m * 30, 54, 112)`), `anim` and
`source`. Sources, best first:

| anim | source | motion in battle |
|---|---|---|
| full | Pokémon 3D API assets, official models with the battle clip set | their own clips (wait, run, attack, special, damage, stun, faint, roar, victory) |
| idle / rig | Pokémon 3D API assets, skinned | procedural motion on the skeleton, on top of the idle clip if there is one |
| static | Pokémon 3D API assets, no skeleton | procedural whole-body motion |
| (last resort) | Switch models, https://github.com/Unborne-Fetus/Pokedex-3D-Models-Animations | only used where the first has nothing; their colours mostly live in shader parameters the conversion lost, so they render pale |

`SKIP` in the tool lists forms whose only model is unusable (Impidimp, Morgrem): they keep their pixel sprite. `FIX`
holds per-form corrections (e.g. `yaw` for a model that does not face +Z).

The Pokémon 3D API models come from the fan collection https://github.com/Pokemon-3D-api/assets; its README states that
the models are property of Nintendo / Creatures Inc. / GAME FREAK inc. (non-commercial, personal use only).

## Checking the models
Open http://localhost:8080/tools/live3d-preview.html?from=0&n=64 (or `?keys=pikachu,gengar`): every model through the
exact battle pipeline, at its size in battle. Keys 1-7 play attack, special, hurt, stun, roar, win and faint; m walks,
f turns around.

## What happens at load (retro3d.js)
- Clips are matched by the rules in `CLIPS` (official `pmXXXX_..._00400_attack01` names, 0xxxx or 2xxxx set, first);
  a single generically named clip is the idle loop; root motion is removed (Retro moves the Pokémon itself).
- Models without an idle clip get their rest pose fixed: T-pose arms hang down (not the wings of Flying types),
  legless serpents modelled standing up get their head raised and tail coiled. A display pedestal or puddle merged
  into a static mesh is cut away.
- Rips that are not official are centred over their origin; every model stands on the ground. Long or wide bodies
  are sized partly by their width.
- Shaders are compiled (in the background where the driver allows), textures and geometry uploaded while the battle
  loads, so a send-out never stalls. Models of earlier battles are kept for a rematch, at most 16 of them.

## Actions and the Retro look
Models without the official battle clips act through key poses (`ACTIONS` in `retro3d.js`), picked by the move's style
from Retro's move table (`bodyStyle()` in `retro.js`): punch, chop, slash, cross, kick / buck, bite, tail whip, spin,
tackle, slam, wing strike, clap; breath, cast, zap, stomp, sweep, roar; guard (Protect), flex, heal, point; hurt, stun,
recover, win, faint; plus a walking gait. Official models play their own clips, and the guard pose. While striking, a
Pokémon turns closer to side-on (`YAW_ACT`) and strikes with the side nearer the camera.

`RETRO` in `retro3d.js` sets the pixel-art treatment: frames step at 12 fps (an action's first frame shows at once),
facing snaps to 16 directions, 7 colour levels per channel, textures shrunk to 128 px and sampled nearest, and inner
contour lines from a depth step. Setting `window.RETRO3D = { ... }` before the module loads overrides it, for tuning in
the preview, whose number and letter keys play each action (see its top bar).

## Frame budget
All live Pokémon on the field render in one batch per frame: they draw side by side into one shared WebGL canvas
and are copied out after a single GPU flush. With many on the field, only as many as fit 6 ms re-render each frame
(the longest-waiting first, one whose action just started jumps the queue), the shadow re-renders every other time,
and a Pokémon far off screen waits. An 8-Pokémon Battle Royale measured 59.5-59.7 fps on Intel Iris Xe.
