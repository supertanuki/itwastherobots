import Phaser from 'phaser';

/**
 * SurveillanceCamera — low ceiling strip + hanging camera.
 *
 * Container origin = bottom edge of the ceiling panel (world y = ceilBottom).
 * Positive Y goes down (Phaser convention).
 *
 * Visuals:
 *   - Ceiling strip: black/white diagonal-stripe hazard band above origin
 *   - Mount bracket: small rectangle below ceiling
 *   - Housing: white circle
 *   - Lens: smaller black circle that sweeps left↔right inside the housing
 */
export default class SurveillanceCamera extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x           world x centre of the ceiling strip
   * @param {number} ceilBottom  world y of the ceiling's bottom edge
   * @param {number} [ceilWidth=80]   horizontal extent of the ceiling strip
   * @param {number} [ceilHeight=20]  thickness of the ceiling strip
   */
  constructor(scene, x, ceilBottom, ceilWidth = 80, ceilHeight = 20) {
    super(scene, x, ceilBottom);
    scene.add.existing(this);

    const HALF = Math.floor(ceilWidth / 2);

    // ── Ceiling strip — diagonal hazard stripes ───────────────────────────
    const g = scene.add.graphics();
    this.add(g);

    const WX = -HALF, WY = -ceilHeight, WW = ceilWidth, WH = ceilHeight;
    const PERIOD = 4;

    g.fillStyle(0x000000, 1);
    g.fillRect(WX, WY, WW, WH);

    g.fillStyle(0xffffff, 1);
    for (let dy = 0; dy < WH; dy++) {
      for (let dx = 0; dx < WW; dx++) {
        const phase = ((dx - dy) % PERIOD + PERIOD) % PERIOD;
        if (phase < PERIOD / 2) g.fillRect(WX + dx, WY + dy, 1, 1);
      }
    }

    g.lineStyle(1, 0xdddddd, 1);
    g.strokeRect(WX, WY, WW, WH);

    // ── Mount bracket — small rectangle below ceiling ─────────────────────
    g.fillStyle(0xffffff, 1);
    g.fillRect(-2, 0, 4, 6);

    // ── Camera housing — white circle ─────────────────────────────────────
    const HOUSING_R = 7;
    const HOUSING_Y = 5 + HOUSING_R;   // just below the bracket

    const housing = scene.add.arc(0, HOUSING_Y, HOUSING_R, 0, 360, false, 0xffffff);
    this.add(housing);

    // ── Lens — dark circle, sweeps left ↔ right inside housing ───────────
    const LENS_R   = 3;
    const LENS_AMP = HOUSING_R - LENS_R - 1;   // max displacement from centre

    const lens = scene.add.arc(0, HOUSING_Y + 2, LENS_R, 0, 360, false, 0x111111);
    this.add(lens);

    scene.tweens.add({
      targets:  lens,
      x:        { from: -LENS_AMP, to: LENS_AMP },
      duration: 2000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }
}
