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

  create() {
    const W  = 1280;
    const H  = 720;
    const BW = W * 0.8;  // 80% of screen width = 1024px
    const BH = 80;       // band height

    // Ground occupies screen y 480–720 (60 virtual px × zoom 4).
    // Place the band at its vertical midpoint: y = (480 + 720) / 2 = 600.
    const BY = 600;

    // White band centred on the ground strip
    this._bg = this.add.rectangle(W / 2, BY, BW, BH, 0xffffff)
      .setOrigin(0.5, 0.5);

    // Text centred inside the band
    this._text = this.add.text(W / 2, BY, 'Test...', {
      fontSize: '24px',
      color: '#000000',
      wordWrap: { width: BW - 40 },
    }).setOrigin(0.5, 0.5);

    // Listen for events from GameScene
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
