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
    const BW = W * 0.9;   // 1024px

    // ── Speech (dialogue) band — slightly raised, reduced height ─────────
    const BH_DLG   = 50;
    const SPEECH_Y = H - 110;   // center of dialogue band (≈ 610)

    // ── Instruction band — black bg, just below dialogue ─────────────────
    const BH_INSTR = 66;
    const INSTR_Y  = SPEECH_Y + BH_DLG / 2 + 4 + BH_INSTR / 2;

    // ── Vignette — radial gradient transparent→black, covers full screen ─
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
    this.add.image(560, 480, 'vignette');

    // ── Speech band — white bg, black text ───────────────────────────────
    this._bg = this.add.rectangle(W / 2, SPEECH_Y, BW, BH_DLG, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setAlpha(0);

    this._text = this.add.bitmapText(W / 2, SPEECH_Y, 'subtitle', '', 32)
      .setOrigin(0.5, 0.5)
      .setTintFill(0x000000)
      .setMaxWidth(BW - 20)
      .setAlpha(0);

    // ── Instruction band — black bg, white text, below dialogue ──────────
    this._instrBg = this.add.rectangle(W / 2, INSTR_Y, BW, BH_INSTR, 0x000000)
      .setOrigin(0.5, 0.5)
      .setDepth(11)
      .setAlpha(0);

    this._instrText = this.add.bitmapText(W / 2, INSTR_Y, 'subtitle', i18n.instructionStart, 32)
      .setOrigin(0.5, 0.5)
      .setTint(0xffffff)
      .setVisible(false)
      .setDepth(11)
      .setMaxWidth(BW - 10);

    this.time.delayedCall(2000, () => this._instrText.setVisible(true));

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

    // ── Title card ("It was the robots") ─────────────────────────────────
    this._titleOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000)
      .setAlpha(0).setDepth(10);

    this._titleText = this.add.bitmapText(W / 2, H / 2, 'subtitle', '', 128)
      .setOrigin(0.5, 0.5)
      .setTint(0xffffff)
      .setAlpha(0)
      .setDepth(11)
      .setCenterAlign();

    this.game.events.on('title-card-show', ({ text }) => {
      this._titleText.setText(text);
      this.tweens.killTweensOf([this._titleOverlay, this._titleText]);
      this.tweens.add({ targets: this._titleOverlay, alpha: 0.88, duration: 1500, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: this._titleText,    alpha: 1,    duration: 3000, ease: 'Sine.easeIn' });
    }, this);

    this.game.events.on('title-card-hide', () => {
      this.tweens.killTweensOf([this._titleOverlay, this._titleText]);
      this.tweens.add({
        targets:  [this._titleOverlay, this._titleText],
        alpha:    0,
        duration: 800,
        ease:     'Sine.easeOut',
      });
    }, this);
  }
}
