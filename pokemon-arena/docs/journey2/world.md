# Journey II — World build plan (Meridia)

The contract every chapter is built to. Story: [story.md](story.md).

Journey II runs on the same engine as Journey 1 (`journey.js`), as a second **world** with its own maps, story and save
(`pokemon-arena-journey2-v1`). Journey 1 (Valoria: `jmaps.js`, `jstory.js`, `jch3-8.js`) is never touched by chapter work.

## Files

| File | Global | Owner | What |
|---|---|---|---|
| `m2maps.js` | `MMaps` | core | the map kit (same as `JMaps`: `M, L, def, grid, center, mart, doorsOf, solidGrid`), the people's looks, the Prologue + Chapter 1 maps |
| `m2story.js` | `MStory` | core | items, badges, starters, generic talks (nurse, clerk, PCs, TV, signs, Echo shrine...), the Prologue + Chapter 1 story; `on`, `chapter`, `CLUES` |
| `mch2.js` ... `mch12.js` | — | chapter | one file per chapter: its maps (`def`), people, trainers, items and story (`on`), and `chapter({...})` |

A chapter file starts like Journey 1's `jch3.js`:

```js
(() => {
  const { def, grid, L, center, mart, M } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;
  Object.assign(L, { ... new looks ... });
  ...
  for (const id of [...this chapter's map ids]) M[id].chapter = N;
  chapter({ n: N, title: '...', start: { map, x, y }, level: L, badge: 'id' | null, goals: [... flags, ending with 'chN+1'] });
})();
```

Check a chapter with `node tools/test-journey.mjs --world=meridia --chapter=N` and the whole world with
`node tools/test-journey.mjs --world=meridia`. Both must print `all good`.

## Building blocks

**Tiles** (`JArt.KIND`): `.` grass · `,` path · `:` sand · `~` water (solid; surfable) · `;` tall grass · `*` flowers ·
`v` ledge (jump down only) · `f` fence · `T` tree · `B` bush · `r` rock · `p` pine · `X` cuttable tree (not used in Meridia) ·
`#` wall · `_` wood floor · `+` tile floor · `R` rug · `m` door mat (the exit of an inside map) · `<` `>` stairs ·
`g` gym floor · `V` vine wall · `k` void · `c` cave floor · `C` cave wall · `n` snow · `i` ice · `o` ash · `L` lava ·
`h` metal floor · `P` psychic floor · **new for Meridia:** `u` cobblestone street · `=` rail track (walkable) ·
`b` boardwalk/pier planks.

**Buildings** (outdoor, door on the bottom row): `house` `house2` `house3` (5×4) · `lab` (7×5) · `center` (6×5) ·
`mart` (5×4) · `gym` (8×6, `variant` 0-7 = colour) · `museum` (8×5) · **new:** `lighthouse` (5×7, `variant` 0-7 = band
colour; a Warden's gym) · `tower` (8×8, the Lumen sky tower / the Great Lantern) · `station` (8×5, a railway station).

**Furniture** (inside): bed table tv pc shelf plant counter healer martshelf fridge stove sofa desk machine statue chair
ballstand boxes.

**Props** (outdoor, 1×1, solid): `mailbox` `lamp` `shard` `shrine` (an Echo Shrine) `lumenlamp` (a Lumen lantern) and
`bigtree` (3×3).

## Engine features for Meridia

- **Echo maps.** A real map names its twin with `echo: 'id'`; the twin names it back with `echoOf: 'id'`. The twin is
  drawn grey. **Echo Shrines**: `shrines: [{ x, y }]` on BOTH maps at the same tile, with the shrine prop drawn there
  automatically. Facing a shrine and pressing A (once the flag `echo` is set) moves you to the twin map at the same
  spot. Use this for paths that only exist in one world (a broken bridge that still stands in the Echo).
- **Surf.** Flag `ride.surf` (Chapter 6). Face water, press A: you ride Lapras; water is walkable, land ends the ride.
  Water edges between maps work while surfing. Wild Pokémon on water: `encounters: { water: { rate, min, max, table } }`.
- **Fly.** Flag `ride.fly` (Chapter 9). A town with `fly: { x, y }` (a free tile) is added to the Fly list once
  visited; MENU › FLY takes you to any of them.
- **Clue notebook.** Key item `notebook`. `MStory.CLUES = { flag: 'text' }`; when a flag is set its clue shows in
  MENU › NOTEBOOK. Add clues per chapter with `Object.assign(CLUES, {...})`.
- **Guards (stealth).** An NPC with `watch: 'eventId'` (and optional `sight: n`, default 4) runs that event when the
  player walks into their line of sight (like a trainer spotting you). Use it in the heist: the event sends the player
  back to the start of the floor (`J.warp(map, x, y, dir)`).
- **The Long Night.** While flag `longnight` is set and `dawn` is not, every outdoor map is drawn grey (Chapter 9-11).
- **J commands** (story scripts): `say(text|[texts], who)` · `ask(text, options, who)` → index · `flag(k)` ·
  `set(k)` · `unset(k)` · `give(item, n)` · `has(item)` · `take(item, n)` · `money(n)` · `badges()` · `heal()` ·
  `healCenter()` · `battle(trainerId | {name, look, team}, npc)` → 'win'/'lose' · `walk(npcId, [dir, n])` ·
  `face(npcId, dir)` · `emote(npcId, '!')` · `playerWalk(dir, n)` · `showNpc(id)` · `hideNpc(id)` (gone for good) ·
  `fade(fn)` · `refresh()` (re-reads `show`/`needs` after flags change) · `addMon(species, level, o)` ·
  `pickStarter()` · `badge(id)` · `chapter(title, sub)` · `travel(map, x, y, dir)` (fade + move: boats, trains,
  psychic lifts) · `warp(map, x, y, dir)` · `pc()` · `shop()` · `wait(ms)` · `pick(array)` · `dname(species)`.
  `who` is an npc id on this map, or `{ name, look }` for someone off-screen. `{NAME}` and `{RIVAL}` (Juno) are
  filled in.
- **Meta.** `on(id, { needs: [flags], sets: [flags], travel: [{ map, needs }] }, async (J, npc) => ...)`. The checker
  plays the story forward from these, so **every flag a script sets must be listed in `sets`**, and a talk with
  `needs` only runs when those flags are set. NPCs: `show: ['flag', '!flag']`. Buildings and edges: `needs: [...]`
  (a locked building also names a `locked` event). Zones (tripwires across a path): `zones: [{ x, y, w, h, event,
  block?, needs? }]` — a zone must span the whole path (the checker fails one you can walk around).
- **Trainers** (`TRAINERS[id]`): `team: [[species, level]...]`, `pay`, `theme` (battle background: `forest` `city`
  `stadium` `beach` `icecave` `volcano`), `before`, `lose`, `after`, optional `look`, `name`, `gym`, `onWin`, `sight`.
  Trainer ids are prefixed by chapter (`m3...`). Only species in `window.POKEDEX` (481 of them; check).

## Region layout

```
                        [Frostcrown 1-2] - [Great Lantern summit]                (ch9; lantern floors ch11)
                              |
           [Frost Pass] - [Highwatch] ---------- [Ashen Coast] - [Emberlight] - [Victory Strand] - [Council]   (ch8 | ch12)
                              |
                         [Coldfields]                                              (ch8)
                              |
 [Mossgrove]-[Wildheart]-[Ochre]   [Brassport N] - [Railyard] - [Old Rail Line]   (ch4 | ch2 | ch3)
       \___________________________________________________________/  (Old Rail Line north -> Mossgrove)
                              |
 [Canal Road] ----------- [Brassport S]                                            (ch2)
      |                       |
 [Sunward Path]          [Sunken Road] - [Saltmere] ~~sea~~ [Sea Lanes] - [Drowned Isles]   (ch6 | ch7)
      |   \
 [Tidemark] [Driftwood Cove]                                                       (ch1)
```

### Links between chapters (both sides must match exactly)

Edges: a map's `edges.n = { to, dx }` puts the player at `x + dx` on the other map's bottom row (`s` likewise, top
row); `edges.e/w = { to, dy }`. The other map has the opposite edge with the negated offset. Borders listed here are
gaps in the map's outer wall (tile columns / rows, inclusive).

| From (owner) | Side, gap | To (owner) | Side, gap | Needs |
|---|---|---|---|---|
| `sunpath` 20×40 (ch1) | n, x 9-11, dx 0 | `canalroad` 40×22 (ch2) | s, x 9-11, dx 0 | `ch2` |
| `canalroad` (ch2) | e, y 9-11, dy 0 | `brassport_s` 40×30 (ch2) | w, y 9-11, dy 0 | — |
| `brassport_s` (ch2) | n, x 18-21, dx 0 | `brassport_n` 40×30 (ch2) | s, x 18-21, dx 0 | — |
| `brassport_n` (ch2) | e, y 12-14, dy 0 | `railyard` 30×24 (ch3) | w, y 12-14, dy 0 | `ch3` |
| `oldrail` 20×44 (ch3) | n, x 9-11, dx 0 | `mossgrove` 30×26 (ch4) | s, x 9-11, dx 0 | `ch4` |
| `brassport_s` (ch2) | s, x 30-32, dx -24 | `sunkenroad` 24×40 (ch6) | n, x 6-8, dx 24 | `ch6` |
| `saltmere` 30×28 (ch6) | e, y 10-16 (water `~`), dy 0 | `sealane1` 40×24 (ch7) | w, y 10-16 (water), dy 0 | surf |
| `brassport_n` (ch2) | n, x 18-20, dx 0 | `coldfields` 40×30 (ch8) | s, x 18-20, dx 0 | `ch8` |
| `frostpass` 20×36 (ch8) | n, x 9-11, dx 0 | `frostcrown1` 30×30 (ch9) | s, x 9-11, dx 0 | `ch9` |
| `highwatch` 30×26 (ch8) | e, y 12-14, dy 0 | `ashencoast` 40×22 (ch12) | w, y 12-14, dy 0 | `ch12` |

Inside links across chapters: `greatlantern` (ch9, outdoor summit) has a `tower` building → `lantern1` (ch11),
`needs: ['ch11']`, `locked: 'm9lanternLocked'`; ch11 defines `lantern1` with `outside: 'greatlantern'` and
`arrive`.

The owner of the *earlier* map writes the gap in its wall and the edge (with `needs`) even though the next map is not
written yet; the checker only warns about a missing map while a chapter is checked on its own.

## Chapters

Levels are the player's party level when the chapter starts. Every chapter's `goals` ends with the flag that opens the
next one (`chN+1`), set in its final scene together with `J.chapter('Chapter N complete!', 'Next: ...')`.

### 0-1 · Prologue & The Day That Didn't Happen (core) — Lv 5
Maps: `tidemark` (town 30×26; Okafor's field lab heals), `home1f` `home2f` `junohouse` `oklab` `tmhouse` `tmstore`,
`tidelight1` `tidelight2` (the Tidemark lighthouse: Warden Mara's gym), `sunpath` (route 20×40), `driftwood` (cave).
Flags: `intro` `festival` `starter` `lostday` `notebook` `clue.*` `juno1` `cove` `crystal` `relit1` `badge.beacon`
`ch2`. Starter: the 27 starters of Journey 1. Juno's starter beats yours (`rivalStarter`).

### 2 · City of a Thousand Lamps — Lv 14
Maps: `canalroad`, `brassport_s`, `brassport_n` (+ Center, Mart, houses, café, Lumen showroom, `brasslight1-2` Warden
Gideon's lighthouse gym, Steel). Cassius's speech in the plaza (`speech`); the canal reflection at night
(`nellglimpse`); Juno rival battle 2; courier races start (side: Juno's crew). Badge `gear`. Ends `ch3`.

### 3 · The Ghost Train — Lv 20
Maps: `railyard` (+ `station` inside), `oldrail` (route), `echo_oldrail` (Echo twin), `ghosttrain1-2` (the train's
cars, inside). The midnight train (`c3train`); first Echo crossing; flag `echo` (shrines work from now on); meet Nell
(`nellmet`). Side: the Ghost Train's Last Passenger starts; first Echo letter (The Last Mail Route). Ends `ch4`.

### 4 · The Wildheart — Lv 24
Maps: `mossgrove` (forest town), `wildheart` (big forest), `echo_wildheart`, `ochre` (ruins town), `lanternruins1-2`
(dungeon). Gyms: `mossgym` (Warden Ilse, Bug; badge `moss`), `ochregym` (Warden Bastian, Rock; badge `ochre`). Teo
starts fading (`teofade`); Lantern-folk lore (`ruinslore`). Side: the Lighthouse Kids Club. Ends `ch5`.

### 5 · The Gala — Lv 30
Maps: Brassport sky tower (a `tower` in `brassport_n`, needs `ch5`): `sky1` lobby, `sky2` gala hall, `sky3` archive,
`sky4` roof. Disguise from a tailor (`disguise`), guards with `watch`, the archive (`lanternsecret`), the photo
(`photo`), escape battle with Director Hask. Ends `ch6`.

### 6 · What the Professor Buried — Lv 33
Maps: `sunkenroad`, `saltmere` (coast town, Okafor's institute), `lastlight` (the Lamplighter's lighthouse, inside),
`saltgym` (Warden Celeste, Fairy; badge `pearl`). Okafor's confession (`okconfess`), Lapras (`ride.surf`). Side: The
Garden That Remembers. Ends `ch7`.

### 7 · The Drowned Archive — Lv 37
Maps: `sealane1-2` (water routes, swimmers), `archway` (island town; `veilgym` Warden Corin, Ghost; badge `veil`),
`gullwing` (small isle), `archive1-3` (dungeon; parts only in the Echo via shrines). Flags `archivelore`
`wardenlore`. Side: the Ghost Train mystery solved; Echo letters. Ends `ch8`.

### 8 · Juno's Choice — Lv 41
Maps: `coldfields`, `highwatch` (mountain town, inn, `crowngym` Warden Rhoswen, Dragon; badge `crown`), `frostpass`.
Juno takes your lighthouse key at the inn (`junobetray`); the rain battle (`junofight`). Side: The Forgotten Champion
starts in Highwatch. Ends `ch9`.

### 9 · The Long Night — Lv 45
Maps: `frostcrown1-2` (cave climb), `greatlantern` (summit, outdoor). Cassius lights the Great Lantern (`longnight`);
the world turns grey; Corviknight (`ride.fly`). Ends `ch10`.

### 10 · Everyone's Best Day — Lv 48
Few new maps (an `echo_tidemark` for Juno and Teo's afternoon, memory rooms if needed). Wake the Wardens in their
towns (`wake.mara` ... `wake.rhoswen`); Teo's echo; Juno returns (`junoback`); tag battle with Juno (`tagwin`).
Ends `ch11`.

### 11 · The Lantern at the End of the World — Lv 52
Maps: `lantern1-3`, `lanterntop` (inside the Great Lantern). Cassius (`cassius`), Nell's goodbye (`nellbye`), the
Warden of the Veil (Golurk, `veilcalm`), `dawn` (the Long Night ends). Ends `ch12`.

### 12 · The Council of Lights — Lv 56
Maps: `ashencoast`, `emberlight` (town, `embergym` Warden Solenne, Fire; badge `ember`), `victorystrand`, `council`
(League grounds), `council1-4` (the Council of Lights: Psychic, Dark, Fighting, Electric), `championroom` (the
Lamplighter), `hallofflight`, the epilogue. Post-game: `rift1-3` (Echo Rifts: fossils, rare encounters), rematches.
Goals end with `end`.

## Building a chapter: the rules that bite

Read `m2maps.js` and `m2story.js` (the Prologue + Chapter 1) first: they are the pattern. Journey 1's `jch3.js`...`jch8.js`
are more examples of whole chapters.

- **Only edit your own `mchN.js` files.** Never edit the engine (`journey.js`, `jart.js`, `jmaps.js`), the core files
  (`m2maps.js`, `m2story.js`), the tools or Journey 1. If you need an engine feature, say so in your report.
  You *may* change earlier maps from your file at load time (`M.tidemark.npcs.push(...)`), guarded with `if (M.id)`.
- **Check your chapters alone:** `node tools/test-journey.mjs --world=meridia --chapter=N --files=mch2.js,mch3.js`
  (list your files and the earlier chapters' files you depend on). Warnings about maps of chapters not written yet are
  fine; every FAIL is yours to fix. Also keep `node tools/test-journey.mjs` (Journey 1) at `all good`.
- **A talk's `needs` are for the checker only.** The engine runs a talk whenever you press A on the person, so a
  script must check its own flags (`if (!J.flag('x')) return J.say(...)`). `needs` says when its `sets` can happen.
- **Every flag a script sets goes in `sets`.** A flag set but not listed is invisible to the checker, and a chapter
  goal that depends on it fails.
- **One talk has one `needs`.** For a person whose story moves on (first a clue, later a battle), use several NPC
  records on the same tile with exclusive `show` lists and different ids (see `mara` / `mara2`, `okafor` / `okafor2`).
- `hideNpc(id)` is permanent for that id on that map. To bring someone back later, give the new appearance a new id.
- **Zones** must cut the whole path (flank it with trees or walls), or the checker fails them.
- The tile **below a building's door** must be free; an inside map needs a door mat `m` on its bottom row, an `arrive`
  tile, and `outside` naming the town (and the town a building with `to` naming it).
- Visible items never sit on a solid tile; hidden items sit on a free tile. NPCs stand on free tiles.
- **Edges** link both ways with negated offsets, and the border gaps line up tile for tile (table above).
- **Prefix everything** with your chapter: trainers `m4ilse...`, events `m4...`, new looks `L.m4hermit`, new items
  `ITEMS['m4...']` (shared TMs: `ITEMS['tm:x'] = ITEMS['tm:x'] || {...}` like `jch3.js`).
- Towns: `center(id, town)` and `mart(id, town, stock)` build a Pokémon Center and a Mart; give the town `fly: { x, y }`.
- **Echo twins:** `MMaps.echoTwin(realId, twinId, [{ x, y }], { name, npcs, items, chapter }, B => { ...patch B... })`
  copies a map into a grey twin (buildings become shut decorations) and puts linked shrines on both. Use the patch to
  make the twin differ (a bridge that still stands, a path that is only open in the past). Shrines only work once the
  flag `echo` is set (Chapter 3).
- **Warden spots:** a chapter that builds a Warden's town adds `MMaps.SPOTS.<warden> = { map, x, y, dir }`, a free,
  reachable tile in that town where the Warden stands during the Long Night (Chapter 10 puts them there).
- Wild levels follow the chapter level (routes a few levels under it); gym teams top out about 4 over it.
- Dialogue: short lines (a text box holds about two sentences), warm, funny where it can be, no Pokémon-game plot
  copies. `{NAME}` and `{RIVAL}` are filled in.

### Recurring battles

- **Juno** (`look: 'juno'`, name `Juno`, `canLose` only in friendly fights): her starter is
  `J.get('rivalStarter')`, grown with `J.grown(rs, level)`. Her team by chapter: Ch2 `[rs 17, electrike 15,
  starly 15]` · Ch4 (optional) `[rs 25, electrike 24, staravia 24, riolu 23]` · Ch8 rain battle `[rs 44, manectric 42,
  staraptor 42, lucario 43, sharpedo 41]` · Ch10 she fights beside you · Ch12 last race `[rs 62, manectric 59,
  staraptor 59, lucario 60, sharpedo 58, togekiss 59]`.
- **Lumen Company:** Lightkeepers (`keeper` / `keeperf`) use Litwick, Zubat, Golbat, Murkrow, Croagunk, Houndour,
  Magnemite, Honedge; agents (`agent`) are a little stronger; **Director Hask** (`hask`, Ch5) `[magneton, honedge→doublade,
  houndoom, lampent]` around Lv 33; **Cassius** (`cassius`, Ch11) `[chandelure 56, aegislash 56, metagross 57,
  mismagius 55, dusknoir 55, gardevoir 57]`.
- **The Warden of the Veil** (Ch11): a wild Golurk Lv 60 (`J.battle({ name: 'Warden of the Veil', team: [['golurk', 60]],
  wild: true ... })` or a scripted fight).
- **The Lamplighter / Champion Ada** (Ch12): `[lapras 64, florges 63, hydreigon 64, gardevoir 63, chandelure 64,
  dragonite 66]`.

## People (looks in `MMaps.L`)

`juno` `teo` `cassius` `nell` `okafor` `ada` (the Lamplighter) `keeper` (Lightkeeper: white coat) `agent` (Lumen
agent) `hask` (Director Hask) and the Wardens `mara` `gideon` `ilse` `bastian` `celeste` `corin` `rhoswen` `solenne`,
plus every Journey 1 look (`man`, `woman`, `kid`, `oldman`, `oldlady`, `sailor`, `fisher`, `hiker`, `swimmer`,
`nurse`, `clerk`, `worker`...).

Badges: `beacon` (Mara, Water) · `gear` (Gideon, Steel) · `moss` (Ilse, Bug) · `ochre` (Bastian, Rock) · `pearl`
(Celeste, Fairy) · `veil` (Corin, Ghost) · `crown` (Rhoswen, Dragon) · `ember` (Solenne, Fire).
