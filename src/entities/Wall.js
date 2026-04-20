import Phaser from 'phaser';

/**
 * Wall — static striped-hazard wall prop.
 * Black/white 45° stripes with a white outline.
 * Scale ×3 to match the rest of the world.
 * Container origin = ground level.
 */
export default class Wall extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x       world x (virtual pixels)
   * @param {number} groundY world y of the ground surface
   */
  constructor(scene, x, groundY) {
    super(scene, x, groundY);
    scene.add.existing(this);

    // Wall bounds in world space (×3 — no container scale): x 15→33, y -102→0
    const WX = 15, WY = -102, WW = 18, WH = 102, PERIOD = 4;

    const g = scene.add.graphics();
    this.add(g);

    // Black base
    g.fillStyle(0x000000, 1);
    g.fillRect(WX, WY, WW, WH);

    // White 45° diagonal stripes — 1 px wide, drawn directly in world space
    g.fillStyle(0xffffff, 1);
    for (let dy = 0; dy < WH; dy++) {
      for (let dx = 0; dx < WW; dx++) {
        const phase = ((dx - dy) % PERIOD + PERIOD) % PERIOD;
        if (phase < PERIOD / 2) g.fillRect(WX + dx, WY + dy, 1, 1);
      }
    }

    // White outline — 1 px, same as ground plates
    g.lineStyle(1, 0xdddddd, 1);
    g.strokeRect(WX, WY, WW, WH);
  }
}
