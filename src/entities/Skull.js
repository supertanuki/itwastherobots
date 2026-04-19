import Phaser from 'phaser';

/**
 * Skull — decorative human skull sitting on the ground.
 *
 * Matches the robot head's rendered size: 18×18 virtual pixels
 * (robot head is 6×6 local × scale 3).
 *
 * The container origin is at the skull's base (ground level).
 * All drawing coordinates are negative Y = upward.
 */
export default class Skull extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x        world x (virtual pixels)
   * @param {number} groundY  world y of the ground surface
   */
  constructor(scene, x, groundY) {
    super(scene, x, groundY + 2);
    scene.add.existing(this);

    const g = scene.add.graphics();
    this._draw(g);
    this.add(g);
  }

  _draw(g) {
    // ── White parts ───────────────────────────────────────────────────────
    g.fillStyle(0xffffff, 1);

    // Cranium — oval, 16px wide × 12px tall, centre at y=-12
    g.fillEllipse(0, -12, 16, 12);

    // Jaw — rectangle 8×4 just below the cranium
    g.fillRect(-4, -7, 8, 4);

    // ── Black holes ───────────────────────────────────────────────────────
    g.fillStyle(0x000000, 1);

    // Left eye socket  (3px wide × 4px tall)
    g.fillRect(-5, -15, 3, 4);

    // Right eye socket (3px wide × 4px tall)
    g.fillRect(2, -15, 3, 4);

    // Nose cavity      (2px wide × 2px tall)
    g.fillRect(-1, -10, 2, 2);

    // Teeth gaps — three vertical black slits at the bottom of the jaw
    g.fillRect(-3, -5, 1, 2); // left
    g.fillRect(-1, -5, 2, 2); // centre
    g.fillRect(2, -5, 1, 2); // right
  }
}
