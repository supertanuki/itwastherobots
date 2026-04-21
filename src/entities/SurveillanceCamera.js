import Phaser from 'phaser';

/**
 * SurveillanceCamera — hanging camera with a sweeping spotlight beam.
 *
 * Container origin = top of the camera housing (world x, y).
 * Positive Y goes down (Phaser convention).
 *
 * Beam: 45° sector with true radial gradient (canvas texture), center at lens,
 * radius 150 px. Rotates -80°↔+80° in sync with the lens sweep.
 * When the robot head enters the visible sector, the beam tints red for 1 s.
 */
export default class SurveillanceCamera extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);

    const HOUSING_R = 7;
    const HOUSING_Y = HOUSING_R;
    const LENS_R    = 3;
    const LENS_AMP  = HOUSING_R - LENS_R - 1; // = 3
    const BEAM_OY   = HOUSING_Y + 2;          // lens centre y = 9

    const R         = 150;
    const HALF_DEG  = 22.5;
    const MAX_DEG   = 80;

    // ── Spotlight beam — 45° sector, true radial gradient ─────────────────
    if (!scene.textures.exists('cam_beam')) {
      const size   = R * 2;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx    = canvas.getContext('2d');

      const grd = ctx.createRadialGradient(R, R, 0, R, R, R);
      grd.addColorStop(0, 'rgba(255,255,255,0.75)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');

      const half = HALF_DEG * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(R, R);
      ctx.arc(R, R, R, Math.PI / 2 - half, Math.PI / 2 + half);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();

      scene.textures.addCanvas('cam_beam', canvas);
    }

    const spotlight = scene.add.image(-LENS_AMP, BEAM_OY, 'cam_beam');
    spotlight.setOrigin(0.5, 0.5);
    spotlight.setAngle(MAX_DEG);
    this.add(spotlight);

    // ── Housing ───────────────────────────────────────────────────────────
    const housing = scene.add.arc(0, HOUSING_Y, HOUSING_R, 0, 360, false, 0xffffff);
    this.add(housing);

    // ── Lens — sweeps left ↔ right ────────────────────────────────────────
    const lens = scene.add.arc(0, HOUSING_Y + 2, LENS_R, 0, 360, false, 0x111111);
    this.add(lens);

    scene.tweens.add({
      targets:  lens,
      x:        { from: -LENS_AMP, to: LENS_AMP },
      duration: 4000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      onUpdate: () => {
        spotlight.setPosition(lens.x, BEAM_OY);
        spotlight.setAngle(-(lens.x / LENS_AMP) * MAX_DEG);
      },
    });

    // Store refs needed for head detection
    this._lens      = lens;
    this._spotlight = spotlight;
    this._lensAmp   = LENS_AMP;
    this._beamOY    = BEAM_OY;
    this._beamR     = R - 50;
    this._halfRad   = HALF_DEG * (Math.PI / 180);
    this._maxDeg    = MAX_DEG;
    this._alerted   = false;
  }

  /**
   * Call every frame with the robot head's world position.
   * Tints the beam red for 1 s when the head enters the visible sector.
   */
  checkHead(headX, headY) {
    if (this._alerted) return;

    // Apex = lens world position
    const ax = this.x + this._lens.x;
    const ay = this.y + this._beamOY;
    const dy = headY - ay;
    const dx = headX - ax;

    if (dy <= 0) return; // beam goes downward only
    if (Math.abs(dy) > this._beamR || Math.abs(dx) > this._beamR) return; // beyond beam length

    // At depth dy, beam spans horizontally around its center angle
    const theta   = (this._lens.x / this._lensAmp) * this._maxDeg * (Math.PI / 180);
    const centerX = ax + dy * Math.tan(theta);
    const halfW   = dy * Math.tan(this._halfRad);

    if (headX < centerX - halfW || headX > centerX + halfW) return;

    this._alerted = true;
    this._spotlight.setTint(0xff2200);
    this.scene.time.delayedCall(200, () => {
      this._spotlight.clearTint();
      this._alerted = false;
    });
  }
}
