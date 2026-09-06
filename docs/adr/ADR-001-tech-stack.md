# ADR‑001 — Tech stack: TypeScript + Phaser 3 + Capacitor (over Godot / Flutter / Unity)

**Status:** accepted · **Date:** 2026‑09‑05

## Context
2D mobile match‑3 whose entire visual language is emoji glyphs; must build from GitHub Actions; needs instant web playtests and eventual store builds.

## Decision
Once emojis are pre‑rasterised into a texture atlas (ADR‑003), the "font rendering" advantage of Flutter disappears and the engine choice reduces to 2D performance, UI ergonomics and CI friendliness. Phaser 3 + TypeScript wins on: zero‑licence CI on ubuntu runners, sub‑second builds, playable link per PR, PWA distribution without stores, HTML/CSS for the emoji HUD, and Capacitor for native haptics/store packaging.

## Consequences
+ Trivial CI, tiny bundles, web‑first virality.
− iOS web audio needs a user gesture (handled); haptics on iOS only via Capacitor (handled).
