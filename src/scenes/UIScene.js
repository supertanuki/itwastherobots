import Phaser from 'phaser';
import i18n from '../i18n.js';

/**
 * UIScene — overlay scene for HUD / subtitles.
 *
 * Runs on top of GameScene. No zoom, no follow camera.
 * Coordinates are raw canvas pixels (1280 × 720).
 *
 * Events received on this.game.events:
 *   'subtitle-show'  { text }  — show text in the subtitle band
 *   'subtitle-hide'            — fade the band out
 */
export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
  }

  preload() {
    this.load.bitmapFont(
      'subtitle',
      'fonts/FreePixel-16.png',
      'fonts/FreePixel-16.xml',
    );
  }

  create() {
    const W  = 1280;
    const H  = 720;
    const BW = W * 0.8;  // 80% of screen width = 1024px
    const BH = 80;       // band height

    // Instruction band: ~1/3 from top. Speech band: near bottom with margin.
    const BY       = 240;
    const SPEECH_Y = H - BH / 2 - 24;  // bottom-aligned, 24px margin

    // ── Vignette — radial gradient transparent→black, covers full screen ─
    // Large enough so all four corners of 1280×720 are fully black.
    // (max corner distance from center ≈ 724 px; use 800px radius to be safe)
    const vigR   = 800;
    const vigSz  = vigR * 2;
    const canvas = document.createElement('canvas');
    canvas.width  = vigSz;
    canvas.height = vigSz;
    const ctx  = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(vigR, vigR, 0, vigR, vigR, vigR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vigSz, vigSz);
    this.textures.addCanvas('vignette', canvas);
    // Robot sits at roughly (560, 480) on screen (camera follow offset –80)
    this.add.image(560, 480, 'vignette');

    // ── Instruction band — black bg, white text (shown from the start) ───
    this._instrBg = this.add.rectangle(W / 2, BY, BW, BH, 0x000000)
      .setOrigin(0.5, 0.5);

    // 32px instruction text
    this._instrText = this.add.bitmapText(W / 2, BY, 'subtitle', i18n.instructionStart, 32)
      .setOrigin(0.5, 0.5)
      .setTint(0xffffff)
      .setVisible(false)
      .setMaxWidth(BW - 40);

    this.time.delayedCall(2000, () => this._instrText.setVisible(true));

    // ── Speech band — white bg, black text (hidden until robot speaks) ───
    this._bg = this.add.rectangle(W / 2, SPEECH_Y, BW, BH, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setAlpha(0);

    // 32px subtitle text
    this._text = this.add.bitmapText(W / 2, SPEECH_Y, 'subtitle', '', 32)
      .setOrigin(0.5, 0.5)
      .setTintFill(0x000000)
      .setMaxWidth(BW - 40)
      .setAlpha(0);

    // ── Events ────────────────────────────────────────────────────────────
    // Initial instruction fade-out on wake-up
    this.game.events.on('instruction-hide', () => {
      this.tweens.add({
        targets: [this._instrBg, this._instrText],
        alpha: 0,
        duration: 400,
      });
    }, this);

    // Dynamic instruction band (dialogue prompts)
    this.game.events.on('instr-show', ({ text }) => {
      this._instrText.setText(text);
      this.tweens.killTweensOf([this._instrBg, this._instrText]);
      this._instrBg.setAlpha(1);
      this._instrText.setAlpha(1);
    }, this);

    this.game.events.on('instr-hide', () => {
      this.tweens.add({
        targets:  [this._instrBg, this._instrText],
        alpha:    0,
        duration: 500,
      });
    }, this);

    this.game.events.on('subtitle-show', ({ text }) => {
      this._text.setText(text);
      this._bg.setAlpha(1);
      this._text.setAlpha(1);
    }, this);

    this.game.events.on('subtitle-hide', () => {
      this.tweens.add({
        targets: [this._bg, this._text],
        alpha: 0,
        duration: 800,
      });
    }, this);
  }
}
