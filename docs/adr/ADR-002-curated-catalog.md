# ADR‑002 — Curated 144‑emoji catalog instead of the full Unicode set

**Status:** accepted · **Date:** 2026‑09‑05

## Context
The brief suggested "the complete catalog of everyday emojis" (~3 800 glyphs).

## Decision
12 families × 12 = 144, with 96 exposed at launch and 48 in a visible "vault". Single code points only (plus 2 curated ZWJ sequences that Noto ships as single PNGs).

## Rationale
- 3 800² / 2 ≈ 7 M recipe pairs cannot be authored; players would experience 99.99 % "nothing happens".
- Legibility at 44 px demands visually distinct glyphs.
- Completionism (Zeigarnik) only motivates when 100 % is reachable in ~6–8 weeks.
- 12 tiles per family fill a 3×4 mobile grid with no gaps.

## Consequences
Content validator enforces counts, uniqueness and reachability in CI.
