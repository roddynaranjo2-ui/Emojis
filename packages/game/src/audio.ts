/**
 * SfxEngine — 100 % procedural Web Audio synthesis. No audio files, zero load
 * time, infinitely tweakable. Every action has a distinct voice; combos climb a
 * pentatonic ladder so cascades *sound* like a reward escalating.
 *
 * Voices:
 *   tap       short sine blip
 *   drag      filtered noise "whoosh"
 *   swapBad   descending two-tone buzz
 *   match     pentatonic pluck (pitch = ladder[combo])
 *   evolve    ascending two-note chime + shimmer
 *   special   bomb: low boom + noise; rocket: rising sweep; wild: arpeggio
 *   mega      sub-bass drop + wide noise + 4-note fanfare
 *   discover  rising major arpeggio with delay tail
 *   win       fanfare I–IV–V–I
 *   lose      soft descending minor
 */

// C major pentatonic across 2 octaves — combo index 0..9
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

export class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture on iOS/Safari. Idempotent. */
  unlock(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    // gentle compressor so stacked cascades never clip
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
    this.master.connect(comp).connect(this.ctx.destination);
    // 1s white noise buffer for percussive layers
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.onUnlock?.(this.ctx);
  }

  /** hook for the music engine to attach to the same context */
  onUnlock: ((ctx: AudioContext) => void) | null = null;
  get context(): AudioContext | null { return this.ctx; }

  setMuted(m: boolean): void { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.55; }

  private get t(): number { return this.ctx!.currentTime; }
  private ok(): boolean { return !!this.ctx && !!this.master && !this.muted; }

  private tone(freq: number, opts: { type?: OscillatorType; at?: number; dur?: number; gain?: number; slideTo?: number; attack?: number } = {}): void {
    if (!this.ok()) return;
    const { type = 'sine', at = 0, dur = 0.15, gain = 0.5, slideTo, attack = 0.005 } = opts;
    const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, this.t + at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.t + at + dur);
    g.gain.setValueAtTime(0, this.t + at);
    g.gain.linearRampToValueAtTime(gain, this.t + at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + at + dur);
    o.connect(g).connect(this.master!);
    o.start(this.t + at); o.stop(this.t + at + dur + 0.02);
  }

  private noise(opts: { at?: number; dur?: number; gain?: number; hp?: number; lp?: number; lpSlideTo?: number } = {}): void {
    if (!this.ok() || !this.noiseBuf) return;
    const { at = 0, dur = 0.2, gain = 0.3, hp = 80, lp = 8000, lpSlideTo } = opts;
    const src = this.ctx!.createBufferSource(); src.buffer = this.noiseBuf;
    const hpF = this.ctx!.createBiquadFilter(); hpF.type = 'highpass'; hpF.frequency.value = hp;
    const lpF = this.ctx!.createBiquadFilter(); lpF.type = 'lowpass'; lpF.frequency.setValueAtTime(lp, this.t + at);
    if (lpSlideTo) lpF.frequency.exponentialRampToValueAtTime(lpSlideTo, this.t + at + dur);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(gain, this.t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + at + dur);
    src.connect(hpF).connect(lpF).connect(g).connect(this.master!);
    src.start(this.t + at); src.stop(this.t + at + dur + 0.02);
  }

  // ── Public voices ────────────────────────────────────────────────────────
  tap(): void { this.tone(880, { dur: 0.05, gain: 0.25 }); }

  drag(): void { this.noise({ dur: 0.12, gain: 0.12, hp: 600, lp: 3000, lpSlideTo: 900 }); }

  swapBad(): void {
    this.tone(220, { type: 'square', dur: 0.09, gain: 0.18 });
    this.tone(180, { type: 'square', at: 0.09, dur: 0.12, gain: 0.18 });
  }

  /** combo: 0-based cascade index. familyPitch: optional base multiplier from content (1 = neutral) */
  match(combo: number, size = 3): void {
    const f = PENTA[Math.min(combo, PENTA.length - 1)]!;
    this.tone(f, { type: 'triangle', dur: 0.18, gain: 0.45 });
    this.tone(f * 2, { dur: 0.12, gain: 0.15, at: 0.01 });
    if (size >= 4) this.tone(f * 1.5, { type: 'triangle', at: 0.06, dur: 0.16, gain: 0.3 });
    this.noise({ dur: 0.06, gain: 0.08, hp: 2000 });
  }

  evolve(combo: number): void {
    const f = PENTA[Math.min(combo + 2, PENTA.length - 1)]!;
    this.tone(f, { dur: 0.12, gain: 0.35 });
    this.tone(f * 1.5, { at: 0.08, dur: 0.22, gain: 0.4 });
    this.tone(f * 3, { at: 0.1, dur: 0.3, gain: 0.08, type: 'sine' }); // shimmer
  }

  apex(): void {
    this.tone(196, { type: 'sawtooth', dur: 0.25, gain: 0.3, slideTo: 98 });
    this.noise({ dur: 0.3, gain: 0.3, lp: 1500, lpSlideTo: 200 });
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, { at: 0.05 + i * 0.05, dur: 0.25, gain: 0.25 }));
  }

  spawnSpecial(): void {
    [659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, { at: i * 0.04, dur: 0.14, gain: 0.25 }));
  }

  bomb(magnitude = 0.35): void {
    this.tone(110, { type: 'sine', dur: 0.35, gain: 0.7 * magnitude + 0.2, slideTo: 40 });
    this.noise({ dur: 0.35, gain: 0.45, lp: 2500, lpSlideTo: 150 });
  }

  rocket(): void {
    this.tone(300, { type: 'sawtooth', dur: 0.32, gain: 0.25, slideTo: 1800 });
    this.noise({ dur: 0.32, gain: 0.25, hp: 400, lp: 6000, lpSlideTo: 9000 });
  }

  wild(): void {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, { at: i * 0.05, dur: 0.3, gain: 0.25, type: 'triangle' }));
    this.noise({ dur: 0.4, gain: 0.1, hp: 3000 });
  }

  mega(): void {
    this.tone(60, { type: 'sine', dur: 0.8, gain: 0.9, slideTo: 30 });
    this.noise({ dur: 0.7, gain: 0.6, lp: 4000, lpSlideTo: 100 });
    this.noise({ at: 0.1, dur: 0.5, gain: 0.3, hp: 2000 });
    [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, { at: 0.25 + i * 0.09, dur: 0.4, gain: 0.35, type: 'triangle' }));
    this.tone(1567.98, { at: 0.6, dur: 0.6, gain: 0.25 });
  }

  blockerHit(broken: boolean): void {
    if (broken) { this.noise({ dur: 0.18, gain: 0.35, hp: 300, lp: 5000, lpSlideTo: 800 }); this.tone(150, { type: 'square', dur: 0.1, gain: 0.2, slideTo: 80 }); }
    else this.tone(1200, { type: 'square', dur: 0.05, gain: 0.15 });
  }

  discover(rarity: 0 | 1 | 2 | 3 = 0): void {
    const root = [523.25, 587.33, 659.25, 783.99][rarity]!;
    [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(root * m, { at: i * 0.11, dur: 0.5, gain: 0.35, type: 'triangle' }));
    this.tone(root * 4, { at: 0.45, dur: 0.9, gain: 0.1 });
    this.noise({ at: 0.4, dur: 0.6, gain: 0.08, hp: 4000 });
  }

  win(): void {
    const seq = [523.25, 698.46, 783.99, 1046.5];
    seq.forEach((f, i) => { this.tone(f, { at: i * 0.16, dur: 0.35, gain: 0.35, type: 'triangle' }); this.tone(f / 2, { at: i * 0.16, dur: 0.35, gain: 0.2 }); });
    this.tone(1046.5, { at: 0.7, dur: 1.2, gain: 0.2 });
  }

  lose(): void {
    [392, 349.23, 311.13].forEach((f, i) => this.tone(f, { at: i * 0.22, dur: 0.45, gain: 0.3, type: 'triangle' }));
  }

  fall(): void { this.noise({ dur: 0.05, gain: 0.06, hp: 1500, lp: 6000 }); }
}

export const sfx = new SfxEngine();
