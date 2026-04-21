import Phaser from 'phaser';

/**
 * SurveillanceCamera — low ceiling strip + hanging camera + spotlight beam.
 *
 * Container origin = bottom edge of the ceiling panel (world y = ceilBottom).
 * Positive Y goes down (Phaser convention).
 *
 * Beam: 45° sector with true radial gradient (canvas texture), center at lens,
 * radius reaching the floor surface. Rotates -80°↔+80° in sync with the lens.
 */
export default class SurveillanceCamera extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x           world x centre of the ceiling strip
   * @param {number} ceilBottom  world y of the ceiling's bottom edge
   * @param {number} [ceilWidth=80]
   * @param {number} [ceilHeight=20]
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

    // ── Mount bracket ─────────────────────────────────────────────────────
    g.fillStyle(0xffffff, 1);
    g.fillRect(-2, 0, 4, 6);

    // ── Geometry constants ────────────────────────────────────────────────
    const HOUSING_R = 7;
    const HOUSING_Y = 5 + HOUSING_R;          // = 12
    const LENS_R    = 3;
    const LENS_AMP  = HOUSING_R - LENS_R - 1; // = 3
    const BEAM_OY   = HOUSING_Y + 2;          // lens centre y = 14

    // Radius: extends past the floor so the gradient is still visible at ground level.
    // Floor local y = GROUND_Y(120) - ceilBottom(8) = 112. Lens at 14 → floor dist = 98.
    // R > 98 so the gradient has non-zero opacity at the floor surface.
    const R = 150;

    // ── Spotlight beam — 45° sector, true radial gradient ─────────────────
    if (!scene.textures.exists('cam_beam')) {
      const size   = R * 2;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx    = canvas.getContext('2d');

      // White-centre → transparent-edge radial gradient
      const grd = ctx.createRadialGradient(R, R, 0, R, R, R);
      grd.addColorStop(0,   'rgba(255,255,255,0.75)');
      grd.addColorStop(1,   'rgba(255,255,255,0)');

      // 45° sector pointing downward (canvas +y = down, angle π/2)
      const half = 22.5 * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(R, R);
      ctx.arc(R, R, R, Math.PI / 2 - half, Math.PI / 2 + half);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();

      scene.textures.addCanvas('cam_beam', canvas);
    }

    // Image pivot = canvas centre = lens world position
    const spotlight = scene.add.image(-LENS_AMP, BEAM_OY, 'cam_beam');
    spotlight.setOrigin(0.5, 0.5);
    spotlight.setAngle(80); // initial: lens at far-left → beam tilts right (inverted)
    this.add(spotlight);     // before housing → renders behind it

    // ── Housing ───────────────────────────────────────────────────────────
    const housing = scene.add.arc(0, HOUSING_Y, HOUSING_R, 0, 360, false, 0xffffff);
    this.add(housing);

    // ── Lens — sweeps left ↔ right ────────────────────────────────────────
    const lens = scene.add.arc(0, HOUSING_Y + 2, LENS_R, 0, 360, false, 0x111111);
    this.add(lens);

    scene.tweens.add({
      targets:  lens,
      x:        { from: -LENS_AMP, to: LENS_AMP },
      duration: 2000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      onUpdate: () => {
        spotlight.setPosition(lens.x, BEAM_OY);
        spotlight.setAngle(-(lens.x / LENS_AMP) * 80);
      },
    });
  }
}
