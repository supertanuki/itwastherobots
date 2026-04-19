import Phaser from 'phaser';

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

    // Ground occupies screen y 480–720 (60 virtual px × zoom 4).
    // Place the band at its vertical midpoint: y = (480 + 720) / 2 = 600.
    const BY = 600;

    // ── Instruction band — black bg, white text (shown from the start) ───
    this._instrBg = this.add.rectangle(W / 2, BY, BW, BH, 0x000000)
      .setOrigin(0.5, 0.5);

    // 32px instruction text
    this._instrText = this.add.bitmapText(W / 2, BY, 'subtitle', 'Presser la touche espace plusieurs fois', 32)
      .setOrigin(0.5, 0.5)
      .setTint(0xffffff)
      .setMaxWidth(BW - 40);

    // ── Speech band — white bg, black text (hidden until robot speaks) ───
    this._bg = this.add.rectangle(W / 2, BY, BW, BH, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setAlpha(0);

    // 32px subtitle text
    this._text = this.add.bitmapText(W / 2, BY, 'subtitle', '', 32)
      .setOrigin(0.5, 0.5)
      .setTintFill(0x000000)
      .setMaxWidth(BW - 40)
      .setAlpha(0);

    // ── Events ────────────────────────────────────────────────────────────
    this.game.events.on('instruction-hide', () => {
      this.tweens.add({
        targets: [this._instrBg, this._instrText],
        alpha: 0,
        duration: 400,
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
