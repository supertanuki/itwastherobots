/**
 * Chain — a hanging chain with Verlet integration physics.
 *
 * Each link stores current + previous position; gravity is applied each frame
 * and distance constraints between adjacent links are iteratively resolved.
 * The top link is fixed (static anchor).
 *
 * Each link is drawn as a hollow circle with a white 1-px outline.
 * Coordinates are in virtual world space (320×180).
 */
export default class Chain {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x     world x of the chain
   * @param {number} fromY world y of the ceiling anchor
   * @param {number} toY   world y where the chain ends
   */
  constructor(scene, x, fromY, toY) {
    const RADIUS  = 3;   // link radius in virtual px
    const SPACING = 7;   // rest length between consecutive link centres
    const count   = Math.max(2, Math.round((toY - fromY) / SPACING));

    this._scene   = scene;
    this._links   = [];
    this._gfx     = [];
    this._SPACING = SPACING;

    for (let i = 0; i < count; i++) {
      // Slight rightward offset on lower links → natural pendulum swing on start
      const xOff = (count - 1 - i) * 0.9;
      const lx = x + xOff;
      const ly = fromY + i * SPACING;

      this._links.push({
        x:  lx, y:  ly,   // current position
        px: lx, py: ly,   // previous position (Verlet)
        fixed: i === 0,
      });

      const g = scene.add.graphics();
      g.lineStyle(1, 0xffffff, 1);
      g.strokeCircle(0, 0, RADIUS);
      g.setDepth(5);
      this._gfx.push(g);
    }

    scene.events.on('update', this._update, this);
  }

  _update(_time, delta) {
    const dt       = Math.min(delta / 1000, 0.033); // seconds, capped at ~30 fps min
    const GRAVITY  = 180;  // virtual px / s²
    const DAMPING  = 0.985;
    const ITERS    = 8;    // constraint iterations per frame

    // ── Verlet step ───────────────────────────────────────────────────────
    for (const lk of this._links) {
      if (lk.fixed) continue;
      const vx = (lk.x - lk.px) * DAMPING;
      const vy = (lk.y - lk.py) * DAMPING;
      lk.px = lk.x;
      lk.py = lk.y;
      lk.x += vx;
      lk.y += vy + GRAVITY * dt * dt;
    }

    // ── Distance constraint relaxation ────────────────────────────────────
    const rest = this._SPACING;
    for (let iter = 0; iter < ITERS; iter++) {
      for (let i = 0; i < this._links.length - 1; i++) {
        const a = this._links[i];
        const b = this._links[i + 1];
        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const corr = (dist - rest) / dist * 0.5;
        if (!a.fixed) { a.x += dx * corr; a.y += dy * corr; }
        if (!b.fixed) { b.x -= dx * corr; b.y -= dy * corr; }
      }
    }

    // ── Sync graphics ─────────────────────────────────────────────────────
    for (let i = 0; i < this._links.length; i++) {
      this._gfx[i].setPosition(this._links[i].x, this._links[i].y);
    }
  }

  destroy() {
    this._scene.events.off('update', this._update, this);
    this._gfx.forEach(g => g.destroy());
  }
}
