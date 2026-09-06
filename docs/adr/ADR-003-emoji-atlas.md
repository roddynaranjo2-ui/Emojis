# ADR‑003 — Pre‑rasterised Noto atlas instead of text rendering

**Status:** accepted · **Date:** 2026‑09‑05

## Context
Rendering emoji as text uses the OS font (Apple/Samsung/Google differ); iOS does not reliably render Noto's CBDT bitmap font; text glyphs cannot be GPU‑batched like sprites.

## Decision
`tools/build-atlas.ts` downloads the exact PNGs from `googlefonts/noto-emoji` (Apache‑2.0) and packs @1x/@2x atlases + Phaser JSON + CSS sprite classes at build time. Alias frames cover UI reuse (e.g. 🪨 as piece and as blocker).

## Consequences
+ Identical visuals on every device, batching, offline PWA caching.
− Adding an emoji requires a rebuild (seconds, cached in CI).
