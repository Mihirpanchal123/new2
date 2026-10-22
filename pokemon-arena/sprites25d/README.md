# 2.5D sprite sheets (prototype)

Pre-rendered from the 3D models (Pokémon 3D API asset collection, https://github.com/Pokemon-3D-api/assets)
by `tools/bake-25d.mjs`. The collection's repository is MIT-licensed, but its README states the models are
property of Nintendo / Creatures Inc. / GAME FREAK inc.; these derived images carry the same rights situation
as the rest of this fan project's Pokémon assets (non-commercial, personal use).

Each `<species>.png` has one row per animation (see `manifest.json`: frame size, foot anchor, rows, frame
counts, fps). Re-bake or add species with:

    MODELS_REV=b596552 node tools/bake-25d.mjs bulbasaur grovyle mewtwo dragonite

(`b596552` is the last commit that still contains `models/`.) A species without a sheet uses its normal sprite.
