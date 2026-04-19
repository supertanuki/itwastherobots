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
    const W = 1280;
    const H = 720;
    const BH = 80; // band height

    // White band at the bottom
    this._bg = this.add.rectangle(W / 2, H, W, BH, 0xffffff)
      .setOrigin(0.5, 1);

    // Text centred inside the band
    this._text = this.add.text(W / 2, H - BH / 2, 'Test...', {
      fontSize: '24px',
      color: '#000000',
      wordWrap: { width: W - 40 },
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
