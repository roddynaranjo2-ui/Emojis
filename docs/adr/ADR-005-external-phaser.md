# ADR‑005 — Ship Phaser as an external vendored module

**Status:** accepted · **Date:** 2026‑09‑05

## Context
Bundling Phaser through Rollup/esbuild peaked > 1 GB RAM and was OOM‑killed in the 1 GB development sandbox.

## Decision
Mark `phaser` as external; copy `phaser.esm.min.js` to `dist/vendor/` with a default‑export shim; wire it via `output.paths` and an import map.

## Consequences
+ Build < 1 s, < 500 MB; Phaser cached separately from app releases.
− One extra request on first load (precached by the service worker afterwards).
