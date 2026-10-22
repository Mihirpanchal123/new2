# Pokémon Arena — Professional 2D Animation, Camera Direction, and Battle Visual Upgrade

## Your Role

Act as a senior 2D game-engine engineer, gameplay animator, pixel-art technical artist, VFX artist, and technical director.

You are working inside my EXISTING Pokémon Arena repository. Your task is to turn the current Retro 2D battle mode into a polished, cinematic, highly responsive monster-battling experience.

I do not want a new game, a redesigned mockup, or a document that merely explains what I should do. I want you to inspect the real codebase, implement improvements, run the game, test the changes, and report the results.

Reference video for the desired movement and camera presentation:
https://www.instagram.com/reel/DegS8T-BvFU/?vrfl=MWJtcnVlZWZhcHlwMA==

If the video is accessible in your environment, analyze its camera motion, character movement, framing, transitions, and impact timing. If it is inaccessible, do not claim to have watched it. Use the requirements below as the implementation target.

---

# 1. Understand the Existing Game Before Changing Anything

Read the existing README and inspect the complete source code.

The existing project is documented as having:

- Retro 2D pixel-art battles in a browser.
- A separate Three.js-based 3D battle mode.
- Hundreds of Pokémon, evolution forms, Mega Evolutions, moves, and existing Pokémon statistics.
- Real-time movement and attack cooldowns in Retro 2D battles.
- Pokémon that approach, circle, sprint, retreat, and attack.
- Type-specific visual effects and physical attack animations.
- Multiple battle arenas, battle formats, CPU opponents, and tournament functionality.
- Camera direction, screen shake, hit-stop, knockback, and recovery behavior.
- Health bars, damage numbers, battle notifications, and recording/Shorts functionality.
- Startup through start.bat and a local server at http://localhost:8080.

These are documented intended capabilities, not proof that every feature is correctly implemented. Verify the actual code.

## Audit the architecture

Identify:

1. The application entry points and startup flow.
2. The current rendering technology: Canvas 2D, WebGL, a custom renderer, an existing game framework, or another approach.
3. The main render loop and update loop.
4. Pokémon sprite loading, animation frames, sprite anchors, draw order, and asset formats.
5. Movement, steering, collision, attack cooldown, and targeting logic.
6. The current camera implementation, including zoom, tracking, shake, and screen-space versus world-space coordinates.
7. Move-effect creation, particle management, hit detection, damage calculation, and fainting.
8. Battle state transitions, turn/attack events, audio, and pause functionality.
9. How Retro 2D shares data and functionality with the 3D engine.
10. Available tests, build scripts, browser testing tools, and screenshot capabilities.

Find the real causes of weak visuals. Check whether animations are missing, use identical timing, lack anticipation, interrupt each other, run independently of the render loop, or are hidden behind other sprites or effects.

Distinguish between:
- Problems solvable through code.
- Problems caused by unsuitable sprite assets.
- Problems caused by rendering limitations.
- Features that already exist but need refinement.
- Missing or incorrectly connected behavior.

Write a brief prioritized audit in your final report, but do not stop after the audit.

---

# 2. Non-Negotiable Architecture Rules

- Preserve the current project architecture unless you demonstrate a technical reason to change it.
- Do not rewrite the battle system or replace the entire game with a different framework just to improve the visuals.
- Preserve existing game rules, official damage calculations, type effectiveness, move selection, switching, Mega Evolution, AI, battle formats, tournament logic, and recording functionality.
- Keep the Three.js engine lazy-loaded and separate from the Retro 2D rendering path.
- Do not make 3D dependencies load unnecessarily when playing Retro 2D.
- Do not duplicate damage calculation or attack resolution inside animation components.
- Do not allow visual animations to apply damage more than once.
- Do not install libraries without first understanding whether the existing renderer can accomplish the task.
- Do not leave experimental implementations, duplicate render loops, unused dependencies, or temporary debug effects in the final code.

Implement incrementally and maintain a working game after each meaningful change.

---

# 3. Rendering Technology Decision

Evaluate the existing renderer before deciding whether a library is necessary.

## Preferred first approach

Improve the current renderer and animation system if they can achieve the required results. This minimizes regressions and protects the lightweight Retro 2D mode.

## Evaluate PixiJS if the current renderer is a limitation

Investigate PixiJS v8 as a possible replacement for the 2D rendering layer if the current system cannot efficiently handle scene organization, sprite management, particle effects, camera composition, and high-quality visual effects.

Official documentation:
https://pixijs.com/8.x/guides/getting-started/intro
https://pixijs.com/8.x/guides/concepts/render-loop
https://pixijs.com/8.x/guides/components/filters

If PixiJS is justified:
- Use it for rendering, display objects, visual layers, and appropriate rendering effects.
- Preserve the existing battle rules and simulation logic wherever possible.
- Integrate it incrementally and test its compatibility with the current startup system.
- Use the project's existing package and module conventions.
- Check installed versions and actual API compatibility before installing dependencies.
- Keep the HUD and world rendering separated.
- Benchmark loading time, memory, frame rate, and browser compatibility.
- Preserve the existing lightweight-mode requirement wherever practical.
- Document any unavoidable change to the current no-WebGL design.

Do not migrate solely because PixiJS is available.

## Phaser is an alternative, not an additional dependency

Consider Phaser only if the audit demonstrates that moving the entire 2D mode to a game framework is justified by the project's long-term requirements.

Do not install Phaser and PixiJS together.

## Animation timelines

First prefer the existing engine's animation and update systems. If needed, implement a lightweight, centralized animation timeline driven by the game's update loop.

GSAP may be considered for appropriate visual choreography or UI transitions, but do not add another animation clock without a clear reason. Visual timelines must synchronize with game pauses, hit reactions, state transitions, and existing timing.

Make the final technology decision based on evidence from the repository, not assumptions.

---

# 4. Create a Professional Battle Animation System

Build on the existing animation architecture. Introduce new components only where they improve separation of concerns.

A suitable conceptual structure, adapted to the existing code, would contain:

- BattleAnimationDirector: coordinates complete attack sequences.
- PokémonMotionController: handles individual character movement and reaction animation.
- CameraDirector: selects and blends camera behaviors.
- MoveEffectRegistry: maps specific moves and move categories to appropriate effects.
- VFXManager: manages particle creation, layering, lifetime, and object reuse.
- BattleEventCoordinator: connects existing battle events to their corresponding visual and audio moments.

These are conceptual responsibilities, not mandatory new filenames. Reuse existing modules wherever appropriate.

## Required animation behavior

Every important attack should have a clear sequence:

1. Anticipation: the Pokémon prepares and communicates its intention.
2. Acceleration: movement begins with believable timing and increasing speed.
3. Action: the character performs the attack or releases its projectile.
4. Impact: hit-stop, contact effects, or camera feedback emphasize the strike.
5. Reaction: the target responds according to impact strength and move type.
6. Follow-through: the attacker completes its movement or attack pose.
7. Recovery: the attacker and target smoothly return to their normal behavior.

Not every move needs all seven stages with equal intensity. A very fast move and a heavy move must feel different.

Use controlled easing, meaningful acceleration, appropriate movement arcs, anticipation, follow-through, and carefully restrained squash-and-stretch.

Avoid linear robotic movement, constant bouncing, identical attack durations, and repetitive visual patterns.

## Different Pokémon personalities

Adapt movement according to characteristics such as speed, size, weight, and movement style.

- Fast Pokémon: quick acceleration, sharp changes of direction, rapid recovery, brief afterimages when suitable.
- Heavy Pokémon: grounded movement, weighty anticipation, slower stops, powerful impacts, limited knockback.
- Flying Pokémon: vertical movement, banking or diving where appropriate, hovering, and readable landing or take-off.
- Small Pokémon: shorter steps, quick turns, small hops, and agile movement.
- Large or powerful Pokémon: broader attack arcs and stronger impact reactions when justified.

Respect available sprite artwork. If there are no animation frames for wings, legs, tails, eyes, or facial expressions, do not pretend those body parts can be animated independently. Use appropriate pose changes, frame animation, and restrained whole-sprite movement until better assets are available.

---

# 5. Upgrade the Camera Direction

The camera should be an active part of the battle presentation, not a permanently fixed observer.

Implement a reusable CameraDirector with smooth transitions between camera behaviors.

## Camera behaviors

### A. Establishing shot
Frame both Pokémon and enough of the arena to communicate distance and direction.

### B. Movement tracking
Follow meaningful movement while keeping the attacker, target, and action readable.

### C. Anticipation push-in
Gently move closer to the attacker during major wind-ups.

### D. Attack tracking
Follow a dash or projectile when doing so improves readability. Do not make the viewer lose track of the target.

### E. Impact camera
Use a short controlled camera punch-in and impact shake according to the move's actual strength.

### F. Heavy-hit emphasis
Briefly increase visual intensity for critical hits, major moves, and powerful knockback.

### G. Recovery transition
Ease back into a useful composition once the action has resolved.

### H. Arena overview
Pull back for repositioning, multiple simultaneous battles, and moments when spatial awareness matters.

### I. Cinematic finish
Use stronger framing for a decisive knockout or battle-ending move, while retaining the existing battle rules and replay functionality.

### Camera angle and perspective

Where the existing renderer allows it, create a cinematic sense of changing angle through framing, camera offsets, layered arena elements, parallax, controlled zoom, and appropriate screen-space composition.

Small camera rotations or perspective-like effects may be tested where they improve the scene, but must not distort pixel art or make the battle harder to read.

Do not describe a 2D pan or zoom as a real 3D camera orbit. True orbiting requires appropriate geometry or layered assets.

## Camera quality rules

- Use smooth damped transitions instead of abrupt snapping.
- Support transitions between concurrent attack events.
- Avoid oscillating between two competing camera targets.
- Give major moves camera priority over ordinary movement.
- Apply camera bounds where necessary.
- Use stronger camera movement sparingly.
- Keep the HUD, health bars, text overlays, and menus fixed in screen space.
- Ensure damage numbers and world-anchored labels remain correctly positioned relative to their Pokémon.
- Make camera behavior responsive to viewport size and aspect ratio.
- Handle pause/resume, battle completion, and scene transitions correctly.
- Prevent zoom, shake, or camera offsets from remaining stuck after a cancelled animation.

Camera movement must add drama without making the game disorienting.

---

# 6. Preserve and Improve Pixel-Art Rendering

The visual goal is polished retro pixel art, not blurred modern graphics placed over pixel sprites.

Audit the current logical resolution and scaling strategy.

Implement or preserve:
- Nearest-neighbor texture sampling where appropriate.
- Consistent sprite dimensions, pixel density, and anchors.
- A well-defined logical rendering resolution.
- Crisp scaling of sprites and the final rendered canvas.
- Appropriate integer-pixel positioning and rounding to prevent shimmer.
- Correct depth sorting and sprite overlap.
- Consistent outlines and visual contrast.
- Responsive rendering at different browser sizes.

Smooth camera motion and pixel-perfect rendering require careful coordination. Calculate camera movement smoothly when useful, but quantize final sprite and camera positions appropriately when rendering at a pixel-art resolution.

Test zoom, movement, shake, and scaling on actual sprites. Do not assume that setting image-rendering: pixelated alone solves every rendering problem.

If a cinematic filter makes the original sprites blurry, disable it or adjust it. Prefer crisp pixel-style shockwaves, pixel particles, palette-aware flashes, and stylized effects over indiscriminate blur and bloom.

Keep important silhouettes readable against the arena.

---

# 7. Build Distinct Move Effects

Do not use one generic projectile or flash for every move.

Create a reusable effect system with move-specific implementations or data-driven effect definitions where appropriate.

## Elemental attacks

### Fire
- Traveling fireballs or flame streams.
- Uneven flame tongues, glowing cores, sparks, embers, and expanding bursts.
- Impact flashes, flame trails, and temporary scorched ground.
- Larger, longer-lasting visuals for suitably powerful moves.

### Water
- Directed streams, water projectiles, curved splash arcs, and droplets.
- A readable impact splash and brief ground ripples.
- Water effects should feel fluid, not like orange-style explosions recolored blue.

### Electric
- Fast directional bolts with branching arcs.
- Brief white-blue flashes, contact sparks, and rapid impact feedback.
- Strong contrast and rapid timing without excessive screen flashing.

### Grass
- Leaves, seeds, vines, organic arcs, and natural swirling movements.
- Vine Whip, Leaf Blade, and Leaf Storm should not all look identical.

### Ice
- Crystals and shards with sharp silhouettes.
- Frost bursts, freezing particles, and appropriate temporary ground effects.
- Use a readable freezing or shattering moment for relevant moves.

### Psychic
- Expanding energy rings, pulses, floating particles, and stylized distortion.
- Suspensions, lifts, slams, or energy bursts for suitable signature moves.

### Physical and fighting moves
- Distinct slashes, claws, punches, kicks, bites, tails, wing strikes, dust trails, and impact waves.
- Quick Attack should have readable acceleration and afterimages.
- Bite and Crunch should communicate contact and follow-through.
- Multi-hit moves should visually communicate their multiple impacts without applying damage twice.

## Existing and signature moves

Inspect the current move definitions and effect logic.

Maintain unique implementations for supported signature moves where present, including Solar Beam, Earthquake, Rock Slide, Stone Edge, Vine Whip, Leaf Storm, Moonblast, Future Sight, Close Combat, and Body Slam.

Preserve the intended behavior of two-turn moves and recharge moves. Their visual sequences must not bypass their existing battle-state rules.

Use data-driven configurations for reusable parameters such as travel duration, color palette, particle count, impact strength, and recovery duration. Use custom effect implementations when a signature move requires a distinct animation.

Do not flatten every move into a single type-based template.

---

# 8. Particles, Lighting, Arena Damage, and Impact

Improve the relationship between the attack and the battlefield.

Add or refine:
- Directional projectile trails.
- Short-lived impact particles.
- Dust from sprints and heavy landings.
- Ground shockwaves.
- Type-appropriate lighting or flashes.
- Afterimages for rapid movement.
- Decals and arena damage where already supported.
- Knockback trails for major impacts.
- Secondary particles that decay naturally rather than disappearing abruptly.

Make effect strength respond to actual battle outcomes where appropriate.

For example, a powerful hit should generally create a stronger reaction than a resisted, low-damage hit. An immune target should not show a normal successful-hit reaction. Continue to use the existing damage calculation as the source of truth.

Object-pool high-frequency particles if profiling shows repeated allocations are expensive. Reuse textures and graphics where practical.

Support scenes containing multiple active Pokémon. Keep the existing limit on simultaneous attacks and major cinematic events unless there is a tested reason to change it.

Do not spawn unlimited particles or accumulate abandoned effects.

---

# 9. Battle Timeline and State Safety

Create one reliable source of truth for battle logic and animation timing.

The current battle system must remain responsible for:
- Damage and type calculations.
- HP updates and knockout decisions.
- Priority, speed, cooldowns, and targeting.
- Switching and move legality.
- Two-turn move states and recharge.
- Mega Evolution and battle pauses.

Visual components should respond to battle events instead of independently recalculating battle outcomes.

Coordinate events such as:
- attack start,
- anticipation complete,
- projectile launch,
- impact,
- damage presentation,
- recoil,
- knockout,
- recovery complete.

The exact event names should follow the existing architecture.

Handle cancellation, switching, fainting, Mega Evolution, battle resets, and scene changes safely.

Prevent:
- overlapping animations on the same Pokémon;
- sprites left at temporary coordinates;
- permanent squash, tint, opacity, or scale changes;
- stale timers and animation callbacks;
- projectiles continuing after a battle has ended;
- camera shake or zoom persisting between battles;
- repeated damage caused by replaying an animation;
- audio or visual effects triggered multiple times for one impact.

A cancelled animation must clean up its temporary effects and return the actor and camera to a valid state.

---

# 10. Implementation Order

Do not attempt to rewrite everything in one pass.

## Phase A — Audit and baseline
Document the current architecture, likely causes of the visual weakness, relevant source files, baseline performance, and available test commands.

## Phase B — One complete attack
Choose Quick Attack as the initial vertical slice if the existing move implementation supports it.

Implement and verify:
- anticipation,
- acceleration and movement,
- afterimages where appropriate,
- target impact,
- impact feedback,
- target recoil,
- follow-through,
- recovery,
- camera behavior,
- audio and battle-state synchronization.

If Quick Attack is unsuitable because of a technical limitation, choose the closest representative move and explain why.

Do not proceed by merely changing durations or adding a screen shake. The complete sequence must improve the perceived quality of the battle.

## Phase C — Camera director
Build and test smooth transitions between overview, attack tracking, impact, and recovery.

## Phase D — Reusable animation architecture
Extract only the reusable behavior justified by the working vertical slice.

## Phase E — Representative effect families
Implement distinct fire, water, electric, grass, ice, psychic, and physical effect patterns.

## Phase F — Movement and reactions
Improve locomotion styles, approach behavior, turning, hit reactions, knockback, fainting, and transitions to idle.

## Phase G — Integration and regression testing
Verify the system across the existing battle modes, arenas, Pokémon sizes, and supported browser viewport sizes.

Make incremental changes and verify them before continuing. Do not stop after presenting the plan: continue into implementation during the same task.

---

# 11. Testing and Visual Verification

Run the actual application using the existing startup procedure.

Use any available browser automation, screenshots, or browser developer tools to inspect the rendered game.

Test at minimum:
- Quick Attack against a valid target.
- A heavy physical hit.
- At least one fire, water, and electric move.
- A resisted or immune move.
- A knockout and the return/replacement behavior.
- Fast and heavy Pokémon.
- Camera transitions at different distances.
- Rapid consecutive attacks.
- Pause/resume and battle reset.
- A scene containing several Pokémon, including the existing Battle Royale or Team Brawl modes if available.
- Existing 3D mode loading and a basic 3D battle.
- Recording, HUD layout, and responsive viewport behavior where testable.

Look for pixel blur, camera jitter, incorrect draw order, clipped effects, unreadable action, stale particles, bad sprite anchors, and incorrect damage timing.

Run available automated tests and build/type/lint commands where the repository supports them.

Do not invent test results. Do not claim visual verification unless you actually inspected the running game's rendered output. If browser inspection is unavailable, clearly describe what was tested and what remains visually unverified.

---

# 12. Performance and Maintainability

Aim for smooth, stable playback on ordinary modern desktop and mobile hardware.

- Use a single existing or deliberately integrated animation/update loop.
- Avoid unnecessary render-loop allocations and excessive particle creation.
- Clean up destroyed display objects, event listeners, timers, and effects.
- Keep expensive filters limited to moments where they have real visual value.
- Measure frame rate and memory before and after major rendering changes.
- Maintain the lightweight Retro 2D loading path where practical.
- Avoid excessive per-frame DOM manipulation.
- Preserve accessible game controls and existing input handling.
- Ensure animation time is delta-time based or otherwise frame-rate independent.
- Handle background-tab throttling and resuming without teleporting sprites or instantly completing all pending animations.

Prefer clear code and explicit lifecycle management over a large collection of overlapping animations and special cases.

---

# 13. External Art Assets

Inspect the current sprite assets before deciding that new artwork is required.

Identify specifically whether the game needs:
- Additional idle or attack sprite frames.
- Directional movement frames.
- Better trainer or arena art.
- Custom projectile sheets.
- Special signature-move sprites.
- Pixel-art impact, smoke, fire, water, and lightning effects.

First create the best possible implementation using available assets and procedural pixel-style effects.

If external assets are required, provide a concise list that specifies the asset, desired dimensions or frame layout where known, required animation, expected file format, and destination folder.

Do not silently download unverified assets, use broken URLs, or claim to have generated artwork that does not exist.

Keep existing asset attribution and licensing information intact.

---

# 14. Required Final Report

When implementation and verification are complete, report:

1. Audit findings and the main causes of the visual problems.
2. The chosen renderer/library strategy and why it was appropriate.
3. Files added, changed, and removed.
4. The attack animation sequence implemented.
5. Camera behaviors implemented.
6. Effects and movement improvements completed.
7. New dependencies, their purpose, and any migration trade-offs.
8. Commands, tests, and builds executed, with actual results.
9. Whether the live rendered output was inspected, and how.
10. Known limitations, remaining bugs, and external artwork still required.

Separate completed work from planned or unverified work.

## Final acceptance criteria

The upgrade is successful only when:
- The actual Retro 2D battle visibly looks and feels better.
- The first complete attack sequence works from start to recovery.
- Camera movement responds meaningfully to the action without obscuring gameplay.
- Pixel art stays appropriately crisp.
- Different attack types have distinguishable visual identities.
- Existing game rules and battle outcomes remain intact.
- There are no major animation, camera, or state regressions.
- The project launches and the available tests run successfully.

Start by inspecting the repository, then implement the highest-value improvement. Do not stop at recommendations or a visual mockup. Modify the actual application and verify your work.