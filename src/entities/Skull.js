import Phaser from 'phaser';

/**
 * Skull — human skull with an Arcade physics body.
 *
 * Visual size: ~16×18 virtual pixels (matches robot head at scale 3).
 * Container origin is at the skull base (ground level).
 * Physics body proxy is 14×16 px centred 8 virtual px above ground.
 *
 * Call skull.push(strength) to knock it away.
 */
export default class Skull extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x        world x (virtual pixels)
   * @param {number} groundY  world y of the ground surface
   */
  constructor(scene, x, groundY) {
    super(scene, x, groundY);
    scene.add.existing(this);

    // ── Visuals ───────────────────────────────────────────────────────────
    const g = scene.add.graphics();
    this._drawSkull(g);
    this.add(g);

    // ── Arcade physics body proxy (same pattern as Robot.body_proxy) ──────
    // Center is 8 px above ground so the body base aligns with groundY
    this._proxy = scene.add.rectangle(x, groundY - 8, 14, 16, 0x000000, 0);
    scene.physics.add.existing(this._proxy);
    const body = this._proxy.body;
    body.setCollideWorldBounds(true);
    body.setDragX(150);       // friction — skull slides then stops
    body.setBounce(0, 0.2);   // slight bounce off ground only

    // Sync container to physics proxy every frame
    scene.events.on('update', this._sync, this);
  }

  // ─── Physics proxy accessor (for colliders in GameScene) ─────────────────

  get proxy() { return this._proxy; }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  _sync() {
    // proxy.x/y is the game-object centre; container origin = ground level
    this.setPosition(this._proxy.x, this._proxy.y + 8);
  }

  // ─── Push ─────────────────────────────────────────────────────────────────

  /**
   * Knock the skull away to the right with a physical impulse.
   * @param {number} [strength=1]
   */
  push(strength = 1) {
    // Horizontal kick + small upward component
    // Cast: physics.add.existing() without true = dynamic body, setVelocity exists
    /** @type {Phaser.Physics.Arcade.Body} */ (this._proxy.body).setVelocity(70 * strength, -35 * strength);

    // Visual tumble — Arcade has no angular velocity, so use a tween
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets:  this,
      angle:    50,
      duration: 500,
      ease:     'Sine.easeOut',
    });
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────

  _drawSkull(g) {
    // ── White parts ──
    g.fillStyle(0xffffff, 1);

    // Cranium — oval, 16 wide × 12 tall, centre y = -12
    g.fillEllipse(0, -12, 16, 12);

    // Jaw — rectangle 8×4 just below the cranium
    g.fillRect(-4, -7, 8, 4);

    // ── Black holes ──
    g.fillStyle(0x000000, 1);

    // Left eye socket  (3×4)
    g.fillRect(-5, -15, 3, 4);

    // Right eye socket (3×4)
    g.fillRect(2, -15, 3, 4);

    // Nose cavity      (2×2)
    g.fillRect(-1, -10, 2, 2);

    // Teeth gaps — three vertical black slits at the bottom of the jaw
    g.fillRect(-3, -6, 1, 2);   // left
    g.fillRect(-1, -6, 2, 2);   // centre
    g.fillRect(2,  -6, 1, 2);   // right
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy(fromScene) {
    this.scene.events.off('update', this._sync, this);
    if (this._proxy) this._proxy.destroy();
    super.destroy(fromScene);
  }
}
