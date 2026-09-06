# EMOJIVERSE — Game Design Document (v0.2, Phase 0)

Owner: Fable 5.1 · Status: **approved** (decisions §1–§4) + addendum (§6–§9)

---

## 1. Pillars

1. **Everything is an emoji.** Pieces, HUD, currency, alerts. Google Noto Color Emoji only, pre‑rasterised so every player sees the same glyphs.
2. **Two verbs, two spaces.** *Evolve* on the board (identical → next tier, turn‑limited). *Discover* in the Laboratory (A+B=C, no pressure).
3. **Positive frustration.** Failure always informs (echo hints, "here was a 4"), never humiliates (no red screens, near‑miss never costs a life).
4. **Completionism as the engine.** A finite, visible 144‑slot Emoji‑dex with silhouettes, echoes, rarity frames and "11/12" family bars.

## 2. Catalog — 144 emojis, 12 families × 12

| # | Family | Role | Status |
|---|---|---|---|
| 1 | 🌱 Elements | base pieces (tier 0) | launch |
| 2 | ☁️ Sky & Weather | logical results of Elements | launch |
| 3 | 🌿 Flora | long evolution chains | launch |
| 4 | 🐾 Fauna | metamorphosis | launch |
| 5 | 🍎 Food | intuitive cross recipes | launch |
| 6 | 😀 Emotions I | **USP** – psychological recipes | launch |
| 7 | 🏠 Objects | obstacles / tools | launch |
| 8 | ✨ Cosmic | top‑tier reward | launch |
| 9 | 🎭 Emotions II | event 1 | vault |
| 10 | 🎃 Festive | seasonal FOMO | vault |
| 11 | 🐉 Mythic | event 2, legendaries | vault |
| 12 | 🔮 Arcane | end‑game secrets | vault |

Why 144 and not 3 800: combinatorial chaos (7 M pairs), 44 px legibility, and the psychology of completion only works when 100 % is reachable in 6–8 weeks. 48 vault slots are visible‑but‑locked from day one to create deliberate incompleteness tension.

Rarity: ⚪ common 48 · 🟢 rare 48 · 🟣 epic 36 · 🟡 legendary 12 → frame colour, idle animation, haptic pattern, share card.

## 3. Board rules (implemented in `packages/core`)

- Grid 7×8, swap adjacent, row 0 = top.
- **3 identical** → consumed, spawn **next tier** at the swapped cell (`chains.ts`). Apex tier → 3×3 burst instead.
- **4 in line** → next tier + 🚀 rocket oriented perpendicular to the line.
- **5 in line** → 🌟 wild.
- **L / T / cross** → next tier + 💣 bomb at the intersection.
- **Specials**: 💣 3×3 · 🚀 row or column · 🌟 swapped with X clears all X.
- **Synergies** (swap two specials):
  - 💣+🚀 → **MEGA CROSS**: rocket carries bomb to board centre → 5×5 blast + 3‑wide row & column sweep (magnitude 1.0).
  - 💣+💣 → 5×5 at swap point · 🚀+🚀 → row + column · 🌟+💣 / 🌟+🚀 → most common emoji becomes that special and fires · 🌟+🌟 → board wipe.
- Specials caught inside any blast **chain‑react**.
- **Blockers**: 🪨 rock (1 hp), 🧊 ice (2 hp). Matches damage adjacent blockers; specials damage blockers inside their area. Blockers act as floors for gravity.
- Cascades multiply score: ×(1 + 0.5·depth). Leftover moves on win → +100 each.
- Dead board → auto‑shuffle (no match, ≥1 move).

## 4. Laboratory & recipes

71 recipes at launch: **physical 38 %** (💧+🔥=💨, ☁️+⚡=⛈️, ☀️+🌧️=🌈), **metamorphic 32 %** (🐛+🌿=🦋, 🥚+🔥=🐣), **psychological 30 %** (😢+😡=🥺, 😀+😢=🥲, 😡+💧=😌, 😢+☀️=🌈). Commutative, deterministic. Each has 3 echo hints (family → ingredient → almost‑answer). CI asserts every launch emoji is reachable from tier‑0 pieces.

**UI**: every piece evolved on a board goes to the lab inventory. The cauldron ⚗️ takes two ingredients (A + B) → *Mix*. A valid recipe consumes 1 + 1, adds the result, records the recipe and discovers the emoji in the dex. An invalid mix costs nothing and reveals an Echo hint. The Emoji‑dex shows silhouettes for unknown emojis, rarity frames, family tabs and lets the player buy the next Echo for 🪙 40.

## 5. UI system — 100 % emoji without visual fatigue

1. One emoji = one verb; optional 11 px uppercase label.
2. Muted world gradient (saturate 0.75) so emojis are the only saturated elements.
3. Four sizes only: 20 / 28 / 44 / 96 px.
4. Glass capsules (`rgba(255,255,255,.12)` + blur 12).
5. ≤ 7 interactive emojis outside the board (HUD: ❤️ 🪙 🎯 👣 ⭐ ⏸️ 💡 🔊 — pause/hint/sound collapse into a drawer in F1).
6. Numbers in rounded Nunito 800, 85 % white, tabular.
7. States by transform (pressed 0.92, disabled 35 % + grayscale), never by colour.
8. Five alert semantics: ✅ ⚠️ ❌ 💡 🔒.

## 6. Living Emojis (addendum §1)

- **Idle**: per‑piece breath (scaleX 1.04 / scaleY 0.97), ±4° tilt, random phase; 12 % chance per loop of a 70 ms "blink squash".
- **Specials** pulse 1.0→1.1 continuously.
- **Drag**: rubber‑band toward the finger (28 % of a cell), stretch along drag axis (+32 %), squash across (−22 %), tilt up to ±14°. Snap‑back with `Back.easeOut`.
- **Landing**: bounce ease + 60 ms squash on every fall.
- **Evolve**: shockwave + family particles + `Back.easeOut` 0→1.35→1.

## 7. Audio (addendum §3) — fully procedural

Web Audio synthesis, unlocked on first tap (iOS). Master → compressor so cascades never clip.

| Event | Voice |
|---|---|
| tap / drag | 880 Hz blip / filtered noise whoosh |
| bad swap | descending square buzz |
| **match** | triangle pluck at **pentatonic[combo]** (C‑maj pentatonic across 2 octaves) + octave shimmer |
| evolve | two ascending notes, root = pentatonic[combo+2] |
| apex burst | saw sweep down + noise + major triad |
| 💣 | 110→40 Hz sine + low‑passed noise, gain ∝ magnitude |
| 🚀 | 300→1800 Hz saw sweep + rising noise |
| 🌟 | 5‑note arpeggio |
| **mega cross** | 60→30 Hz sub, wide noise, 4‑note fanfare, high sparkle |
| discover | major arpeggio, root rises with rarity |
| win / lose | I–IV–V–I fanfare / soft descending minor |

## 8. VFX & impact (addendum §4)

- 8 themed emitters from procedurally generated textures: fire 🔥, water 💧, sparkle ✨, star 🌌, leaf 🌿, petal 🌸, heart 💗, smoke 🌫️ — chosen by the emoji's family.
- Emoji confetti (atlas frames) on win.
- Shockwave ring, rocket laser streak, full‑screen flash (≥ 0.6 magnitude).
- **Dynamic screen shake**: intensity = 0.002 + m²·0.028, duration = 80 + 420·m ms. A 3‑match nudges, a bomb thumps, mega cross rattles.

## 9. Progression & retention

- Saga map of **7 emotional worlds** (😀 😢 😡 😴 😱 🥰 🤯) × 20 levels; every 5th is an "echo level", level 20 is an emotional boss.
- ⭐⭐⭐ per level; 3★ on a whole world unlocks a secret emoji.
- **Dynamic mercy**: after 3 consecutive losses, spawn weight of the objective's base ingredient ×1.08 per extra loss (invisible).
- **Near‑miss**: losing with all objectives ≥ 70 % never costs a ❤️ (retry is free) and offers **+5 moves for 🪙 90** — the offer keeps the same board, matching the genre's "almost win" moment.
- ❤️ 5 lives, 1 per 20 min (visible countdown on the map). Lives are spent when a level *starts*; quitting from pause keeps the life spent (Candy Crush rule).
- 🪙 coins: first clear reward (30–60 by world) + 5 per ⭐ + streak bonus (4 × streak, max 5). Replays pay 25 %. Shop: 🔨 120 · 🔄 80 · 🚀 150 · 💣 200 · 🌟 350 · ❤️ 60. No hard currency at launch; ads opt‑in only.
- 🎁 **Daily gift**: 7‑day ladder 50 → 200 coins with boosters on days 3/5/7; streak resets when a day is missed.
- **Tutorials**: one mechanic per card, shown once, right before the first level that introduces it (W1: swap, rocket, bomb · W2 rocks · W3 ice, odd boards · W4 dust · W5 cages · W6 wild · W7 synergies). Level 1 also shows a 👆 hand on the first legal move.
- **Difficulty rhythm** per world: easy · easy · normal · hard · breather (echo), mid‑boss at 10 and boss at 20 (8×9 board, two collect goals). Objectives grow gently inside a world (×1.0 → ×1.6).
- Balance is enforced by simulation and auto‑tuning: `tools/tune.ts` adjusts every level's move budget until the GreedyBot lands in its band (levels 1–3 ≥ 80 %, easy 65–85 %, normal 50–70 %, hard 35–55 %, boss 30–50 %); `tools/simulate.ts` verifies the wider human‑safety bands in CI.
