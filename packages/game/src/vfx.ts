import Phaser from 'phaser';

export type ParticleTheme = 'fire' | 'water' | 'sparkle' | 'leaf' | 'heart' | 'star' | 'smoke' | 'petal';

/**
 * VFX — massive particle system + dynamic screen shake. Everything is drawn from
 * a handful of procedurally generated textures (no art assets) plus emoji frames
 * from the atlas for "emoji confetti".
 */
export class Vfx {
  private emitters: Partial<Record<ParticleTheme | 'confetti' | 'shock', Phaser.GameObjects.Particles.ParticleEmitter>> = {};
  private flash!: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: Phaser.Scene, private readonly atlasKey: string, private readonly atlasScale = 1) {}

  /** Generates soft circle, spark, drop, leaf textures on the fly. */
  static generateTextures(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // soft circle
    g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(16, 16, 16); g.generateTexture('p_circle', 32, 32);
    // spark (4-point star)
    g.clear(); g.fillStyle(0xffffff, 1);
    g.beginPath(); g.moveTo(16, 0); g.lineTo(20, 12); g.lineTo(32, 16); g.lineTo(20, 20); g.lineTo(16, 32); g.lineTo(12, 20); g.lineTo(0, 16); g.lineTo(12, 12); g.closePath(); g.fillPath();
    g.generateTexture('p_spark', 32, 32);
    // drop
    g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(16, 20, 10); g.fillTriangle(16, 2, 7, 18, 25, 18); g.generateTexture('p_drop', 32, 32);
    // leaf (ellipse)
    g.clear(); g.fillStyle(0xffffff, 1); g.fillEllipse(16, 16, 28, 14); g.generateTexture('p_leaf', 32, 32);
    // heart
    g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(10, 11, 8); g.fillCircle(22, 11, 8); g.fillTriangle(3, 15, 29, 15, 16, 30); g.generateTexture('p_heart', 32, 32);
    // ring (shockwave)
    g.clear(); g.lineStyle(6, 0xffffff, 1); g.strokeCircle(64, 64, 58); g.generateTexture('p_ring', 128, 128);
    g.destroy();
  }

  create(): void {
    const mk = (tex: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) =>
      this.scene.add.particles(0, 0, tex, { emitting: false, ...cfg }).setDepth(50);

    this.emitters.fire = mk('p_circle', {
      speed: { min: 60, max: 260 }, angle: { min: 200, max: 340 }, gravityY: -120,
      scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: { min: 350, max: 750 },
      tint: [0xffe066, 0xff9f1c, 0xff4d00, 0xffffff], blendMode: 'ADD',
    });
    this.emitters.water = mk('p_drop', {
      speed: { min: 80, max: 240 }, angle: { min: 220, max: 320 }, gravityY: 700,
      scale: { start: 0.55, end: 0.15 }, alpha: { start: 1, end: 0.2 }, lifespan: { min: 450, max: 800 },
      tint: [0x7dd3fc, 0x38bdf8, 0xbae6fd], rotate: { min: -30, max: 30 },
    });
    this.emitters.sparkle = mk('p_spark', {
      speed: { min: 40, max: 200 }, gravityY: 60, scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 300, max: 700 }, tint: [0xffffff, 0xfff3b0, 0xffe066], rotate: { start: 0, end: 180 }, blendMode: 'ADD',
    });
    this.emitters.star = mk('p_spark', {
      speed: { min: 60, max: 280 }, gravityY: 0, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 400, max: 900 }, tint: [0xc084fc, 0x818cf8, 0xf0abfc, 0xffffff], rotate: { start: 0, end: 360 }, blendMode: 'ADD',
    });
    this.emitters.leaf = mk('p_leaf', {
      speed: { min: 40, max: 160 }, gravityY: 250, scale: { start: 0.5, end: 0.2 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 500, max: 1000 }, tint: [0x4ade80, 0x22c55e, 0xa3e635], rotate: { start: 0, end: 540 },
    });
    this.emitters.petal = mk('p_leaf', {
      speed: { min: 30, max: 140 }, gravityY: 180, scale: { start: 0.45, end: 0.15 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 500, max: 1100 }, tint: [0xfbcfe8, 0xf9a8d4, 0xfda4af], rotate: { start: 0, end: 720 },
    });
    this.emitters.heart = mk('p_heart', {
      speed: { min: 40, max: 160 }, gravityY: -150, scale: { start: 0.55, end: 0.1 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 500, max: 900 }, tint: [0xfb7185, 0xf43f5e, 0xfda4af],
    });
    this.emitters.smoke = mk('p_circle', {
      speed: { min: 20, max: 90 }, gravityY: -80, scale: { start: 0.6, end: 1.4 }, alpha: { start: 0.5, end: 0 },
      lifespan: { min: 500, max: 1000 }, tint: [0x9ca3af, 0xd1d5db],
    });
    this.emitters.confetti = mk(this.atlasKey, {
      speed: { min: 150, max: 420 }, angle: { min: 230, max: 310 }, gravityY: 900,
      scale: { start: 0.45 * this.atlasScale, end: 0.3 * this.atlasScale }, alpha: { start: 1, end: 0.6 }, lifespan: { min: 900, max: 1500 },
      rotate: { start: 0, end: 360 }, frame: ['star', 'sparkles', 'happy', 'glowstar'],
    });
    this.emitters.shock = mk('p_ring', {
      speed: 0, scale: { start: 0.2, end: 2.4 }, alpha: { start: 0.9, end: 0 }, lifespan: 420, blendMode: 'ADD', tint: 0xffffff,
    });

    this.flash = this.scene.add.rectangle(0, 0, this.scene.scale.width * 2, this.scene.scale.height * 2, 0xffffff, 0).setDepth(90).setScrollFactor(0);
  }

  burst(theme: ParticleTheme, x: number, y: number, count = 14): void {
    this.emitters[theme]?.explode(count, x, y);
  }

  shockwave(x: number, y: number, tint = 0xffffff): void {
    const e = this.emitters.shock!; e.particleTint = tint; e.explode(1, x, y);
  }

  confetti(x: number, y: number, count = 30, frames?: string[]): void {
    const e = this.emitters.confetti!;
    if (frames) e.setEmitterFrame(frames);
    e.explode(count, x, y);
  }

  /** Full-screen white flash for big detonations. */
  flashScreen(alpha = 0.5, ms = 120): void {
    this.flash.setAlpha(alpha);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: ms, ease: 'Quad.easeOut' });
  }

  /**
   * Dynamic screen shake. magnitude 0..1 → intensity & duration scale non-linearly
   * so a 3-match barely nudges, a bomb thumps, a mega cross rattles the phone.
   */
  shake(magnitude: number): void {
    const m = Phaser.Math.Clamp(magnitude, 0, 1);
    if (m < 0.05) return;
    const intensity = 0.002 + m * m * 0.028;      // 0.002 … 0.03
    const duration = 80 + m * 420;                // 80 … 500 ms
    this.scene.cameras.main.shake(duration, intensity, true);
    if (m >= 0.6) this.flashScreen(0.25 + m * 0.35, 90 + m * 120);
  }

  /** Floating score text with pop-in. */
  floatText(x: number, y: number, text: string, color = '#ffffff', size = 22): void {
    const t = this.scene.add.text(x, y, text, { fontFamily: 'Nunito, system-ui, sans-serif', fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 4, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(80).setScale(0.4).setAlpha(0);
    this.scene.tweens.chain({ targets: t, tweens: [
      { scale: 1.15, alpha: 1, duration: 120, ease: 'Back.easeOut' },
      { y: y - 48, alpha: 0, scale: 0.9, duration: 520, ease: 'Quad.easeIn', delay: 120 },
    ], onComplete: () => t.destroy() });
  }
}
