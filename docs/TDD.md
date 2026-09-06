# EMOJIVERSE — Technical Design Document (Phase 0)

## 1. Architecture

```
┌──────────────┐   LevelConfig / RulesConfig   ┌──────────────┐
│  content     │ ───────────────────────────▶ │    core      │  pure TS, no DOM, no Phaser
│ emojis 144   │                               │ Board        │  deterministic (seeded RNG)
│ chains       │                               │ Resolver     │  Move → ResolveEvent[]
│ recipes      │                               │ LevelRunner  │  objectives, moves, mercy
│ levels       │                               │ GreedyBot    │  balance simulation
└──────────────┘                               └──────┬───────┘
                                                      │ ResolveEvent[] (ordered log)
                       ┌──────────────────────────────┴──────────────┐
                       │  game (Phaser)                              │
                       │  BoardScene: replays events → tweens        │
                       │  Vfx (particles, shake) · SfxEngine · Haptics│
                       └──────────────┬──────────────────────────────┘
                                      │ HudBridge (state, combo, level end, discover)
                       ┌──────────────┴──────────────┐
                       │  ui (DOM)  Hud · modals     │  tokens.css design system
                       └──────────────┬──────────────┘
                                      │
                       ┌──────────────┴──────────────┐
                       │  app  main.ts · Vite · PWA · Capacitor │
                       └─────────────────────────────┘
```

**Invariant:** no rule lives in `game/` or `ui/`. The renderer is a dumb replayer of `ResolveEvent[]`; this is what makes 10 000‑game CI simulations and deterministic replays possible.

## 2. Event log (core → renderer)

`swap · match · evolve · apex_burst · spawn_special · synergy · special_fire · blocker_hit · clear · score · gravity · refill · collect · shuffle · level_end` — see `packages/core/src/types.ts`. Every event carries `cascade` (depth) so SFX pitch and shake scale with it; `special_fire` carries `magnitude ∈ [0,1]`.

## 3. Resolve pipeline (`Resolver.applyMove`)

1. Validate (adjacent ∧ (creates match ∨ involves special)).
2. Swap. If both specials → `fireSynergy`; if one → `fireSpecial` at its new cell (+ normal match on the other half); else `findMatches(preferOrigin = to)`.
3. Loop while `pendingClear` non‑empty:
   a. `chainSpecials` — specials inside the set detonate recursively.
   b. matches damage **adjacent** blockers; specials damage blockers **inside** area.
   c. clear pieces → `clear`, score ×(1+0.5·cascade) → `score`.
   d. place queued evolutions/specials (queued so the clear can't wipe them).
   e. `gravity` (blockers are floors) → `refill` (seeded spawner with mercy bias).
   f. `findMatches()` → next cascade.
4. `collect` summary; dead board → `shuffle`.

## 4. Emoji rendering strategy

Emoji **as text** is non‑deterministic across OSes and iOS cannot render Noto's CBDT font. We therefore rasterise at build time (`tools/build-atlas.ts`): 168 PNGs from `googlefonts/noto-emoji` (cached in `.noto-cache/`) → `emojis@1x.png` (64 px cells) and `emojis@2x.png` (128 px) + Phaser JSON‑hash + CSS sprite classes for the DOM HUD. Aliases (e.g. `bl_rock → rock`) are emitted as duplicate frames. The scene reads the real frame size at runtime so scaling is DPR‑independent.

## 5. Build & memory

Phaser (1.2 MB) is **not** bundled: `rollupOptions.external: ['phaser']`, copied verbatim to `dist/vendor/` with a 3‑line default‑export shim, and mapped via `output.paths` + an import map. Result: full build in **< 1 s** and **< 500 MB RAM** (works on 1 GB sandboxes), tiny app chunks, and Phaser cached independently of game releases.

## 6. Audio & haptics

`SfxEngine` builds oscillators/noise per event on a shared `AudioContext` (created on first pointerdown for iOS). `haptics.ts` prefers `@capacitor/haptics` when `Capacitor.isNativePlatform()`, falls back to `navigator.vibrate`, no‑op otherwise.

## 7. Testing strategy

| Layer | Tool | What |
|---|---|---|
| core | Vitest (35 specs) | shapes, specials, all synergies, chain reactions, blockers, gravity, refill, cascades, determinism, mercy, level end |
| content | `validate.ts` | counts, uniqueness, references, reachability, recipe ratio |
| balance | `simulate.ts` | GreedyBot win‑rate band (strict in CI) |
| integration | Playwright `smoke.py` | real pointer drags on the built PWA, zero page errors, screenshots |

## 8. Persistence

`GameState` (`packages/app/src/state.ts`) owns a versioned `Save` (v2) in `localStorage` key `emojiverse.save` with `migrate()` from v1. It holds unlocked level, stars/best per level, consecutive losses (mercy), lives + regeneration timestamp, coins, boosters, dex, echoes, lab inventory, recipes found, streak, daily‑gift state, settings and tutorials seen. Every mutation goes through a method that calls `commit()` (persist + notify subscribers) so screens re‑render from a single source of truth.

## 8b. Application layer

`main.ts` builds a `Router` (one `<section class="screen">` per screen, CSS transitions) and the seven screens. The level flow is a single async function: `openLevel(level)` → tick lives → *No lives* modal or *Level sheet* (goals, moves, pre‑boosters) → `spendLife()` → `router.go('game')` → `GameScreen.start()`. `GameScreen` owns the `Phaser.Game` lifecycle per attempt (created on start, destroyed when leaving to the map), the DOM HUD, the hammer/shuffle side bar, pause/win/lose modals and the `HudBridge` that maps scene events to state mutations. Music is a procedural `MusicEngine` attached to the SFX `AudioContext` on first user gesture (`sfx.onUnlock`) and ducked on level end/pause.

## 9. Native shell

`packages/app/android/` is a committed Capacitor 6 project (portrait lock, adaptive icon + splash generated from `public/icons/icon-512.png`, versionCode/Name). `npx cap sync android` copies `dist/` and wires the 4 plugins declared in `packages/app/package.json` (App, Haptics, SplashScreen, StatusBar). `src/native.ts` lazy‑imports the plugins only when `Capacitor.isNativePlatform()` so the PWA bundle is unaffected; it maps the Android back button to *close modal → pause → back to map → minimise*, hides the native splash after ours paints and stops music when the app goes to background (also on web via `visibilitychange`). `android.yml` (pending activation) builds `assembleDebug` + `bundleRelease` on `v*` tags; signing needs `KEYSTORE_*` secrets (F4). iOS: `npx cap add ios` on macOS.

## 10. Events

`content/events.ts` defines 4 `EventDef`s; `eventNextTier(ev)` overlays the event chains on `NEXT_TIER` and is passed as `RulesConfig.nextTier` when `level.event` is set, so the core engine needs no changes. Stage levels reuse `LevelDef` (`world: 0`, `number ≥ 1000`, `event` tag); `recordWin` ignores them for saga unlocking. `liveEvent(now)` derives the current event from the epoch week — no server, deterministic for everyone. Progress lives in `save.events[eventId] = { cleared, claimed, week }` and resets when `week` changes.

## 11. Localisation

`packages/app/src/i18n/` holds one flat dictionary per locale (`en.ts` is the typed source of truth; `es/pt/fr.ts` are `Record<keyof typeof en, string>` so a missing key is a compile error). `t(key, vars)` replaces `{var}` placeholders; `t2(key)` splits `Name|Description` pairs (achievements, worlds). `names.ts` localises the 144 emoji names and `levelNames.ts` the 140 level + 32 stage titles (ES). Locale = saved choice → `navigator.language` → `en`. The `ui` package stays locale‑agnostic: `Hud` receives a `HudLabels` object built by `app/hudLabels.ts`. Switching language reloads the app (all screens render their chrome once). `i18n.test.ts` enforces key parity, non‑empty strings and identical placeholders across locales.

## 12. Save backup

`backup.ts` serialises the `Save` to `EMV1.<crc32>.<base64url(deflate-raw(json))>` using `CompressionStream` (falls back to raw UTF‑8 where unavailable). Import verifies magic + checksum + shape before writing `localStorage` and reloading. Share uses `navigator.share` when present, else clipboard; download creates a `.txt` blob.
