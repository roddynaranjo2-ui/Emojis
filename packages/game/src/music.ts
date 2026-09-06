/**
 * MusicEngine — procedural, generative background music (Web Audio, zero files).
 * One theme per world: a chord progression + arpeggio + soft pad, all in the same
 * key family so transitions are smooth. Loops forever, ducks under big SFX.
 *
 * Design: research on Candy Crush's audio criticised its repetitive loop; we avoid
 * fatigue with (1) a slow 8-bar progression, (2) randomised arpeggio order, and
 * (3) a pentatonic melody that changes every bar — the pattern is familiar but never identical.
 */
interface Theme { bpm: number; root: number; progression: number[][]; wave: OscillatorType; padGain: number; arpGain: number; bright: number }

// intervals in semitones from root (major-ish chords for joy, minor for melancholy/fear…)
const THEMES: Record<number, Theme> = {
  1: { bpm: 96, root: 261.63, progression: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], wave: 'triangle', padGain: 0.08, arpGain: 0.06, bright: 1.0 },  // C major, I IV V I
  2: { bpm: 78, root: 220.0, progression: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [-2, 2, 5]], wave: 'sine', padGain: 0.09, arpGain: 0.045, bright: 0.7 },       // A minor
  3: { bpm: 112, root: 196.0, progression: [[0, 3, 7], [0, 3, 7], [6, 10, 13], [5, 8, 12]], wave: 'sawtooth', padGain: 0.05, arpGain: 0.05, bright: 1.2 },   // G minor, driving
  4: { bpm: 66, root: 174.61, progression: [[0, 4, 7, 11], [5, 9, 12], [2, 5, 9], [7, 11, 14]], wave: 'sine', padGain: 0.1, arpGain: 0.04, bright: 0.6 },   // F maj7 dreamy
  5: { bpm: 84, root: 164.81, progression: [[0, 3, 6], [0, 3, 7], [-1, 3, 6], [0, 3, 6]], wave: 'triangle', padGain: 0.07, arpGain: 0.05, bright: 0.8 },     // E dim/min, eerie
  6: { bpm: 90, root: 293.66, progression: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], wave: 'sine', padGain: 0.09, arpGain: 0.055, bright: 0.9 },   // D major warm
  7: { bpm: 104, root: 246.94, progression: [[0, 4, 7], [2, 6, 9], [4, 8, 11], [-3, 0, 4]], wave: 'triangle', padGain: 0.08, arpGain: 0.06, bright: 1.1 },  // B lydian-ish wonder
};
const PENTA = [0, 2, 4, 7, 9, 12, 14];

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private timer: number | null = null;
  private world = 1; private step = 0; private nextTime = 0;
  private enabled = true; private started = false;
  volume = 0.5;

  attach(ctx: AudioContext): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    this.out.connect(lp).connect(ctx.destination);
  }

  setEnabled(v: boolean): void { this.enabled = v; if (!v) this.fadeTo(0); else if (this.started) this.fadeTo(this.volume); }
  setWorld(w: number): void { if (this.world !== w) { this.world = w; this.step = 0; } }

  start(world: number): void {
    if (!this.ctx || !this.out) return;
    this.setWorld(world); this.started = true;
    if (this.timer !== null) { this.fadeTo(this.enabled ? this.volume : 0); return; }
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 200);
    this.fadeTo(this.enabled ? this.volume : 0);
  }

  stop(): void { this.fadeTo(0); if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } this.started = false; }

  /** duck under big explosions */
  duck(ms = 400): void {
    if (!this.out || !this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime; const g = this.out.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(this.volume * 0.35, t + 0.05); g.linearRampToValueAtTime(this.volume, t + ms / 1000);
  }

  private fadeTo(v: number): void {
    if (!this.out || !this.ctx) return;
    const t = this.ctx.currentTime; this.out.gain.cancelScheduledValues(t); this.out.gain.setValueAtTime(this.out.gain.value, t); this.out.gain.linearRampToValueAtTime(v, t + 0.8);
  }

  private hz(semis: number, root: number): number { return root * Math.pow(2, semis / 12); }

  private schedule(): void {
    if (!this.ctx || !this.out) return;
    const th = THEMES[this.world] ?? THEMES[1]!;
    const beat = 60 / th.bpm;
    while (this.nextTime < this.ctx.currentTime + 0.6) {
      const bar = Math.floor(this.step / 8) % th.progression.length;
      const chord = th.progression[bar]!;
      const t = this.nextTime;
      // pad: on bar start, hold 8 eighths
      if (this.step % 8 === 0) for (const semi of chord) this.voice(this.hz(semi, th.root / 2), t, beat * 4, th.padGain, th.wave, 0.3);
      // arpeggio: eighth notes, randomised order over the chord
      const note = chord[Math.floor(Math.random() * chord.length)]! + (Math.random() < 0.3 ? 12 : 0);
      this.voice(this.hz(note, th.root), t, beat * 0.45, th.arpGain, 'triangle', 0.005);
      // melody: every other eighth, pentatonic step, brighter with world.bright
      if (this.step % 2 === 1 && Math.random() < 0.7) {
        const m = PENTA[Math.floor(Math.random() * PENTA.length)]! + chord[0]!;
        this.voice(this.hz(m, th.root * 2), t, beat * 0.5, th.arpGain * 0.7 * th.bright, 'sine', 0.01);
      }
      // soft kick on beats 1 & 3 for worlds with drive
      if (th.bpm >= 96 && this.step % 4 === 0) this.kick(t);
      this.nextTime += beat / 2;
      this.step++;
    }
  }

  private voice(freq: number, at: number, dur: number, gain: number, type: OscillatorType, attack: number): void {
    const o = this.ctx!.createOscillator(), g = this.ctx!.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(gain, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.out!); o.start(at); o.stop(at + dur + 0.05);
  }
  private kick(at: number): void {
    const o = this.ctx!.createOscillator(), g = this.ctx!.createGain();
    o.frequency.setValueAtTime(120, at); o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    g.gain.setValueAtTime(0.12, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g).connect(this.out!); o.start(at); o.stop(at + 0.2);
  }
}

export const music = new MusicEngine();
