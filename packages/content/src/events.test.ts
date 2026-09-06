import { describe, it, expect } from 'vitest';
import { EVENTS, EVENT_LEVELS, eventNextTier, liveEvent, eventForEmoji, EVENT_WEEK_MS, eventLevels } from './events';
import { VAULT_EMOJIS, EMOJI_BY_ID } from './emojis';
import { LevelRunner, DEFAULT_RULES } from '@emojiverse/core';

describe('vault events', () => {
  it('cover all 48 vault emojis exactly once, from launch bases', () => {
    const seen = new Map<string, string>();
    for (const ev of EVENTS) for (const chain of ev.chains) {
      expect(EMOJI_BY_ID[chain[0]!]?.status).toBe('launch');
      for (const id of chain) if (EMOJI_BY_ID[id]?.status === 'vault') { expect(seen.has(id)).toBe(false); seen.set(id, ev.id); }
    }
    expect(seen.size).toBe(VAULT_EMOJIS.length);
    for (const v of VAULT_EMOJIS) expect(eventForEmoji(v.id)?.id).toBe(seen.get(v.id));
  });
  it('produce 8 stages per event with reachable goals', () => {
    expect(EVENT_LEVELS.length).toBe(EVENTS.length * 8);
    for (const lv of EVENT_LEVELS) {
      const nt = eventNextTier(EVENTS.find((e) => e.id === lv.event)!);
      const reach = new Set(lv.spawnPool); let grew = true;
      while (grew) { grew = false; for (const e of [...reach]) { const n = nt[e]; if (n && !reach.has(n)) { reach.add(n); grew = true; } } }
      for (const o of lv.objectives) expect(reach.has(o.target!)).toBe(true);
      expect(lv.world).toBe(0); expect(lv.number).toBeGreaterThanOrEqual(1000);
    }
  });
  it('rotate weekly and deterministically', () => {
    const a = liveEvent(0), b = liveEvent(EVENT_WEEK_MS), c = liveEvent(EVENT_WEEK_MS * EVENTS.length);
    expect(a.event.id).not.toBe(b.event.id); expect(c.event.id).toBe(a.event.id);
    expect(a.endsAt).toBe(EVENT_WEEK_MS);
  });
  it('stages can be played with event rules (vault pieces evolve)', () => {
    const lv = eventLevels('mythic')[0]!;
    const runner = new LevelRunner(lv, { ...DEFAULT_RULES, nextTier: eventNextTier(EVENTS[2]!) });
    let evolvedVault = false;
    for (let i = 0; i < 40 && runner.status === 'playing'; i++) { const m = runner.hint(); if (!m) break; const r = runner.tryMove(m); if (r?.events.some((e) => e.type === 'evolve' && EMOJI_BY_ID[e.to]?.status === 'vault')) evolvedVault = true; }
    expect(evolvedVault).toBe(true);
  });
});
