import Phaser from 'phaser';

/**
 * Robot — a container of rectangles representing a broken robot.
 *
 * Body parts:
 *   head       — 6x6
 *   torso      — 8x10
 *   upperArmR  — 4x7   (right arm, present)
 *   lowerArmR  — 3x6
 *   armL_stub  — 3x3   (left arm stub — missing)
 *   upperLegR  — 4x8   (right leg, present)
 *   lowerLegR  — 3x7
 *   legL_stub  — 4x3   (left leg stub — missing)
 *
 * All coordinates are in the virtual pixel space (before x4 zoom).
 *
 * The container origin is at the robot's feet center.
 * Positive Y = down (Phaser convention).
 *
 * Later: swap each this.add.rectangle() for a this.scene.add.sprite()
 * pointing to a spritesheet frame — no other change needed.
 */

// Robot states
export const RobotState = {
  LYING:       'lying',       // starts flat on the ground
  GETTING_UP:  'getting_up',  // slow, struggling rise
  STANDING:    'standing',    // upright but swaying
  WALKING:     'walking',     // limping forward
  STUMBLING:   'stumbling',   // losing balance
  RECOVERING:  'recovering',  // catching itself
};

export default class Robot extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x  world x (virtual pixels)
   * @param {number} y  world y (virtual pixels) — feet position
   */
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);

    // Add physics body to the container via a separate invisible body rectangle
    // (Containers can't have physics directly — we use a proxy sprite)
    this.body_proxy = scene.physics.add.existing(
      scene.add.rectangle(x, y - 12, 40, 22, 0x000000, 0),
    );
    this.body_proxy.body.setCollideWorldBounds(true);
    this.body_proxy.setDepth(10);

    this.state = RobotState.LYING;
    this.facingRight = true;

    // Movement intent from input
    this._moveIntent = 0; // -1, 0, +1

    // Stumble accumulator
    this._stumbleChance = 0;
    this._stumbleTimer = 0;

    // Per-part tween handles (so we can cancel them)
    this._tweens = [];

    this._buildParts();
    this._initSparks();
    this._poseLying();

    // Start dormant — eye gray, blink suspended until activate() is called
    this._dormant = true;
    this.eye.setFillStyle(0x444444);
    this._scheduleBlink();
    // Scale x3 so the robot fills ~half the virtual screen height (31 local px × 3 = 93px ≈ VH/2)
    this.setScale(3, 3);

    // Sync container position to physics proxy each frame
    scene.events.on('update', this._syncToProxy, this);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Called by scene update with left/right intent (-1, 0, 1) */
  setMoveIntent(intent) {
    this._moveIntent = intent;
  }

  /** Trigger the get-up sequence */
  getUp() {
    if (this.state !== RobotState.LYING) return;
    this.state = RobotState.GETTING_UP;
    // Switch physics proxy to upright size
    this.body_proxy.body.setSize(30, 84);
    this.body_proxy.setPosition(this.body_proxy.x, this.body_proxy.y - 30);
    this._animateGetUp();
  }

  update(delta) {
    this._syncToProxy();

    switch (this.state) {
      case RobotState.LYING:
        this._updateCrawling(delta);
        this._applyMovement(this._moveIntent);
        break;

      case RobotState.STANDING:
        this._updateStanding(delta);
        this._applyMovement(this._moveIntent);
        break;

      case RobotState.WALKING:
        this._updateWalking(delta);
        this._applyMovement(this._moveIntent);
        break;

      case RobotState.STUMBLING:
      case RobotState.RECOVERING:
      case RobotState.GETTING_UP:
        this._applyMovement(0);
        break;
    }

    // Keep arm and leg chains connected for all upright states
    if (this.state !== RobotState.LYING) {
      this._syncChain();
    }

    // Eye always follows head position
    this.eye.setPosition(this.head.x + 2, this.head.y + 1);
    this.eye.setAngle(this.head.angle);

    // Mirror parts when facing left (preserve the x3 base scale)
    this.setScale(this.facingRight ? 3 : -3, 3);
  }

  // ─── Eye blink ────────────────────────────────────────────────────────────

  _scheduleBlink() {
    this.scene.time.delayedCall(Phaser.Math.Between(2000, 3000), () => {
      if (this._dormant) return;                                // suspended while dormant
      this.eye.setFillStyle(0x222222);                          // dim
      this.scene.time.delayedCall(120, () => {
        if (this._dormant) return;
        this.eye.setFillStyle(0xff2200);                        // reopen
        this._scheduleBlink();                                  // reschedule
      });
    });
  }

  /** Flash the eye red for 100 ms then back to gray (dormant wake-up hint). */
  flickerEye() {
    this.eye.setFillStyle(0xff2200);
    this.scene.time.delayedCall(100, () => {
      if (this._dormant) this.eye.setFillStyle(0x444444);
    });
  }

  /** Wake the robot up: eye stays red, normal blink cycle resumes. */
  activate() {
    this._dormant = false;
    this.eye.setFillStyle(0xff2200);
    this._scheduleBlink();
  }

  // ─── Sparks ───────────────────────────────────────────────────────────────

  _initSparks() {
    // 1×1 white pixel texture, created once and reused
    if (!this.scene.textures.exists('pixel_spark')) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 1, 1);
      g.generateTexture('pixel_spark', 1, 1);
      g.destroy();
    }

    this._sparks = this.scene.add.particles(0, 0, 'pixel_spark', {
      speed:    { min: 40,  max: 130 },
      angle:    { min: 200, max: 340 },   // upper arc (270° = straight up)
      scale:    { start: 4, end: 1 },
      alpha:    { start: 1, end: 0 },
      lifespan: { min: 700, max: 1400 },
      gravityY: 30,                       // weak gravity — sparks climb high
      emitting: false,
    }).setDepth(50);

    // Trigger first burst immediately on the first crawl frame
    this._sparkTimer = 0;
  }

  // ─── Build parts ──────────────────────────────────────────────────────────

  _buildParts() {
    const add = (w, h, color) => {
      const r = this.scene.add.rectangle(0, 0, w, h, color);
      this.add(r);
      return r;
    };

    // Colors
    const METAL     = 0xffffff;
    const METAL_DRK = 0xffffff;
    const JOINT     = 0xffffff;
    const EYE       = 0xff2200;
    const STUB      = 0xffffff; // missing-limb stub color

    // Torso
    this.torso       = add(8,  7, METAL);

    // Right arm
    this.upperArmR   = add(2,  7, METAL);
    this.lowerArmR   = add(2,  5, METAL);

    // Left arm stub
    this.armLStub    = add(3,  3, METAL);

    // Right leg
    this.upperLegR   = add(4,  8, METAL);
    this.lowerLegR   = add(3,  7, METAL);
    this.footR       = add(4,  2, METAL);

    // Left leg stub
    this.legLStub    = add(4,  3, METAL);

    // ── Connectors — small blocks that fill the gaps between limbs ────────
    this.neck        = add(4,  3, METAL); // head ↔ torso
    this.shoulderR   = add(3,  4, METAL); // torso ↔ upper arm right
    this.elbowR      = add(2,  1, METAL); // upper arm ↔ lower arm right
    this.hipR        = add(4,  3, METAL); // torso ↔ upper leg right
    this.kneeR       = add(3,  3, METAL); // upper leg ↔ lower leg right
    this.shoulderL   = add(3,  3, METAL); // torso ↔ arm stub left
    this.hipL        = add(3,  3, METAL); // torso ↔ leg stub left

    // Head and eye last — always on top
    this.head        = add(6,  6, METAL);
    this.eye         = add(2,  2, EYE);
  }

  // ─── Poses — sets each part's x/y/angle within the container ─────────────

  /**
   * Upright standing pose.
   * Container origin = feet center, Y grows upward in our mental model
   * but Phaser Y grows DOWN, so "above feet" = negative Y.
   */
  _poseStanding() {
    // Torso — height 7, bottom kept at -14 so hips stay connected
    this.torso.setPosition(0, -18);      // center of torso (was -19 with height 10)

    // Head (above torso)
    this.head.setPosition(0, -26);

    // Right arm — inverted V (Λ): upper arm angles out, forearm angles back in
    this.upperArmR.setPosition(6, -19);
    this.upperArmR.setAngle(18);
    this.elbowR.setPosition(7, -16);
    this.elbowR.setAngle(5);
    this.lowerArmR.setPosition(6, -13);
    this.lowerArmR.setAngle(-12);
    this.shoulderR.setPosition(5, -21);
    this.shoulderR.setAngle(12);
    // Left arm stub — shoulder level
    this.armLStub.setPosition(-6, -21);
    this.armLStub.setAngle(-15);

    // Right leg
    this.upperLegR.setPosition(2, -9);
    this.upperLegR.setAngle(0);
    this.lowerLegR.setPosition(2, -1);
    this.lowerLegR.setAngle(0);
    this.footR.setPosition(2, 3);
    this.footR.setAngle(0);

    // Left leg stub — hip level
    this.legLStub.setPosition(-3, -8);
    this.legLStub.setAngle(10);

    // Connectors
    this.neck.setPosition(0, -22);      this.neck.setAngle(0);
    this.shoulderR.setPosition(5, -21); this.shoulderR.setAngle(5);
    this.elbowR.setPosition(8, -16);    this.elbowR.setAngle(8);
    this.hipR.setPosition(2, -13);      this.hipR.setAngle(0);
    this.kneeR.setPosition(2, -5);      this.kneeR.setAngle(0);
    this.shoulderL.setPosition(-5, -21); this.shoulderL.setAngle(-10);
    this.hipL.setPosition(-3, -13);     this.hipL.setAngle(5);

    // Reset main angles
    this.torso.setAngle(0);
    this.head.setAngle(0);
  }

  /** Flat on ground — all parts collapsed. */
  _poseLying() {
    this.torso.setPosition(0, -4);
    this.torso.setAngle(0);

    this.head.setPosition(9, -5);
    this.head.setAngle(0);

    // Arms splayed — kept above ground (local y <= 0)
    this.upperArmR.setPosition(5, -2);
    this.upperArmR.setAngle(55);
    this.lowerArmR.setPosition(9, -2);
    this.lowerArmR.setAngle(45);

    this.armLStub.setPosition(-4, -2);
    this.armLStub.setAngle(-20);

    // Legs flat
    this.upperLegR.setPosition(-3, -3);
    this.upperLegR.setAngle(-80);
    this.lowerLegR.setPosition(-9, -3);
    this.lowerLegR.setAngle(-75);
    this.footR.setPosition(-13, -3);

    this.legLStub.setPosition(-5, -1);
    this.legLStub.setAngle(-30);

    // Connectors — flat, close to adjacent parts
    this.neck.setPosition(5,  -5);     this.neck.setAngle(0);
    this.shoulderR.setPosition(5, -2); this.shoulderR.setAngle(50);
    this.elbowR.setPosition(8,  -2);   this.elbowR.setAngle(45);
    this.hipR.setPosition(-2,  -3);    this.hipR.setAngle(-80);
    this.kneeR.setPosition(-7,  -3);   this.kneeR.setAngle(-75);
    this.shoulderL.setPosition(-3, -2); this.shoulderL.setAngle(-20);
    this.hipL.setPosition(-4,  -2);    this.hipL.setAngle(-25);
  }

  // ─── Animations ───────────────────────────────────────────────────────────

  _animateGetUp() {
    const T = this.scene.tweens;

    // Phase 1 — robot stirs, head rises first (600ms)
    T.add({ targets: this.head,  y: -10, angle: 15, duration: 600, ease: 'Sine.easeOut' });

    // Phase 2 — torso lifts (after 500ms, takes 800ms) — struggle
    this.scene.time.delayedCall(500, () => {
      T.add({ targets: this.torso, y: -10, angle: -20, duration: 500, ease: 'Sine.easeOut' });
      T.add({ targets: this.torso, y: -14, angle: -5,  duration: 400, ease: 'Sine.easeIn', delay: 500 });
    });

    // Phase 3 — right leg pushes (after 1000ms)
    this.scene.time.delayedCall(1000, () => {
      T.add({ targets: this.upperLegR, angle: -40, y: -6, duration: 500 });
      T.add({ targets: this.lowerLegR, angle: -20,        duration: 500 });

      // Left leg stub flails
      T.add({ targets: this.legLStub, angle: 20, duration: 200, yoyo: true, repeat: 2 });
    });

    // Phase 4 — almost standing but stumbles (after 1800ms)
    this.scene.time.delayedCall(1800, () => {
      // Fake-stand then lurch forward
      T.add({ targets: this.torso, y: -18, angle: 15, duration: 400, ease: 'Back.easeOut' });
      T.add({ targets: this.head,  y: -26, angle: 10, duration: 400 });
      T.add({ targets: this.upperLegR, angle: 0, y: -9, duration: 400 });
      T.add({ targets: this.lowerLegR, angle: 0,        duration: 400 });

      // Right arm flings out for balance
      T.add({ targets: this.upperArmR, angle: -60, duration: 250, yoyo: true });
    });

    // Phase 5 — settle into standing (after 2500ms)
    this.scene.time.delayedCall(2500, () => {
      this._tweenToStanding(() => {
        this.state = RobotState.STANDING;
        this._startSway();
      });
    });
  }

  _tweenToStanding(onComplete) {
    const dur = 350;
    const ease = 'Sine.easeOut';

    // Kill any lingering tweens on every part first — prevents position conflicts
    [this.torso, this.head, this.upperArmR, this.lowerArmR, this.armLStub,
     this.upperLegR, this.lowerLegR, this.footR, this.legLStub,
     this.neck, this.shoulderR, this.elbowR, this.hipR,
     this.kneeR, this.shoulderL, this.hipL].forEach(p => {
      this.scene.tweens.killTweensOf(p);
    });

    // Parts tweened freely (position + angle) — NOT managed by _syncChain
    const free = [
      { t: this.torso,     x: 0,   y: -18, a: 0 },
      { t: this.head,      x: 0,   y: -26, a: 0 },
      { t: this.upperArmR, x: 6,   y: -19, a: 18 },
      { t: this.armLStub,  x: -6,  y: -21, a: -15 },
      { t: this.upperLegR, x: 2,   y: -9,  a: 0 },
      { t: this.footR,     x: 2,   y: 3,   a: 0 },
      { t: this.legLStub,  x: -3,  y: -8,  a: 10 },
      { t: this.neck,      x: 0,   y: -22,   a: 0 },
      { t: this.shoulderR, x: 5,   y: -21,   a: 12 },
      { t: this.hipR,      x: 2,   y: -13,   a: 0 },
      { t: this.shoulderL, x: -5,  y: -21,   a: -10 },
      { t: this.hipL,      x: -3,  y: -13,   a: 5 },
    ];

    // Chain-managed parts — angle ONLY (_syncChain handles their positions every frame)
    // lowerArmR angle is derived from upperArmR inside _syncChain — not tweened separately
    const chainAngles = [
      { t: this.lowerLegR, a: 0 },
    ];

    const total = free.length + chainAngles.length;
    let done = 0;
    const cb = () => { done++; if (done === total && onComplete) onComplete(); };

    free.forEach(({ t, x, y, a }) => {
      this.scene.tweens.add({ targets: t, x, y, angle: a, duration: dur, ease, onComplete: cb });
    });
    chainAngles.forEach(({ t, a }) => {
      this.scene.tweens.add({ targets: t, angle: a, duration: dur, ease, onComplete: cb });
    });
  }

  /** Gentle side-to-side sway while standing still. */
  _startSway() {
    this._stopTweens();
    const T = this.scene.tweens;
    this._swayTween = T.add({
      targets: this.torso,
      angle: { from: -3, to: 3 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Head lags slightly
    this._swayHeadTween = T.add({
      targets: this.head,
      angle: { from: -2, to: 4 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 150,
    });
    // Left leg stub drifts passively
    T.add({
      targets: this.legLStub,
      angle: { from: 8, to: 13 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      repeatDelay: 1000,
    });
    // Arm stub — slow passive drift, no spasm
    T.add({
      targets: this.armLStub,
      angle: { from: -18, to: -10 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      repeatDelay: 800,
    });
  }

  /** Crawl cycle — robot drags itself with one arm and one leg. */
  _updateCrawling(delta) {
    // Freeze pose when idle — resume from the same point on next valid key press
    if (this._moveIntent === 0) return;

    this._crawlTime = (this._crawlTime || 0) + delta;
    const cycle = (this._crawlTime % 900) / 900; // 0..1 per crawl step
    const phase = Math.sin(cycle * Math.PI * 2);   // -1..1

    // Random spark bursts — fire from the robot's torso area in world space
    this._sparkTimer -= delta;
    if (this._sparkTimer <= 0) {
      const sx = this.x + this.torso.x * Math.abs(this.scaleX);
      const sy = this.y + this.torso.y * this.scaleY;
      this._sparks.explode(Phaser.Math.Between(8, 16), sx, sy);
      this._sparkTimer = Phaser.Math.Between(300, 1000);
    }

    // Right arm: reach forward then pull — chained like _syncChain
    this.upperArmR.setAngle(40 + phase * 30);       // 10°..70°

    // Elbow: center pushed half its height below upper arm tip, same angle
    // Shifted 10 virtual px left (÷3 scale) so the arm trails behind during crawl
    const elbow = this._tipOf(this.upperArmR);
    const eArad = this.upperArmR.angle * Math.PI / 180;
    this.elbowR.setPosition(
      elbow.x + (this.elbowR.height / 2) * Math.sin(eArad) - 10 / 3,
      Math.min(elbow.y + (this.elbowR.height / 2) * Math.cos(eArad), 0),
    );
    this.elbowR.setAngle(this.upperArmR.angle);

    // Forearm locks to upper arm (same −30° offset as upright states)
    const lAAngle = this.upperArmR.angle - 30;
    this.lowerArmR.setAngle(lAAngle);
    const lArad = lAAngle * Math.PI / 180;
    const elbowTip = this._tipOf(this.elbowR);
    this.lowerArmR.setPosition(
      elbowTip.x + (this.lowerArmR.height / 2) * Math.sin(lArad),
      Math.min(elbowTip.y + (this.lowerArmR.height / 2) * Math.cos(lArad), 0),
    );

    // Right leg: pushes backward to propel
    this.upperLegR.setAngle(-70 + phase * 20);       // -90°..-50°
    this.lowerLegR.setAngle(-60 + phase * 15);

    // Foot follows the tip of lowerLegR — stays connected, touches the ground
    const footPos = this._tipOf(this.lowerLegR);
    this.footR.setPosition(footPos.x, Math.min(footPos.y, 0));
    this.footR.setAngle(this.lowerLegR.angle);

    // Body shifts slightly with effort — no rocking angle (would disconnect left shoulder)
    const smoothAbs = phase * phase; // 0→1→0 per half-cycle, no derivative discontinuity
    this.torso.setAngle(0);
    this.torso.setY(-4 - smoothAbs * 1.5);           // lifts slightly, never positive

    // Head tries to lift to look ahead
    this.head.setAngle(10 - smoothAbs * 8);
    this.head.setX(9 - phase * 1);
    this.head.setY(-5);                              // locked above ground

    // Stubs drag passively — opposite phase (inertia)
    this.armLStub.setY(-2);
    this.armLStub.setAngle(-20 - phase * 6);
    this.legLStub.setY(-1);
    this.legLStub.setAngle(-28 + phase * 6);

    // Connectors — positioned as midpoints between adjacent parts, y clamped above ground
    const clampY = (y) => Math.min(y, -1);
    this.neck.setPosition(
      (this.head.x + this.torso.x) / 2,
      clampY((this.head.y + this.torso.y) / 2)
    );
    this.neck.setAngle(this.torso.angle);
    this.shoulderR.setPosition(
      (this.torso.x + this.upperArmR.x) / 2 + 1,
      clampY((this.torso.y + this.upperArmR.y) / 2)
    );
    this.shoulderR.setAngle(this.upperArmR.angle * 0.5);
    // elbowR and lowerArmR are already chained above — skip midpoint for these
    this.hipR.setPosition(
      (this.torso.x + this.upperLegR.x) / 2,
      clampY((this.torso.y + this.upperLegR.y) / 2)
    );
    this.hipR.setAngle(this.upperLegR.angle * 0.5);
    this.kneeR.setPosition(
      (this.upperLegR.x + this.lowerLegR.x) / 2,
      clampY((this.upperLegR.y + this.lowerLegR.y) / 2)
    );
    this.kneeR.setAngle(this.lowerLegR.angle);
    this.shoulderL.setPosition(
      (this.torso.x + this.armLStub.x) / 2,
      clampY((this.torso.y + this.armLStub.y) / 2)
    );
    this.shoulderL.setAngle(this.armLStub.angle * 0.5);
    this.hipL.setPosition(
      (this.torso.x + this.legLStub.x) / 2,
      clampY((this.torso.y + this.legLStub.y) / 2)
    );
    this.hipL.setAngle(this.legLStub.angle * 0.5);
  }

  /** Walk cycle for the broken robot. */
  _updateWalking(delta) {
    // Walk cycle time
    this._walkTime = (this._walkTime || 0) + delta;
    const t = this._walkTime;

    // Limp: right leg takes a normal step, left stub just drags
    const cycle = (t % 600) / 600; // 0..1
    const legPhase = Math.sin(cycle * Math.PI * 2);

    // Right leg swings
    this.upperLegR.setAngle(legPhase * 18);
    this.lowerLegR.setAngle(Math.max(0, legPhase) * 12);

    // Left leg stub barely moves — drag effect
    this.legLStub.setAngle(8 + legPhase * 4);

    // Body bobs slightly — smooth squared phase avoids derivative discontinuity
    const smoothAbs = legPhase * legPhase;
    this.torso.setY(-18 + smoothAbs * 1.5);
    this.neck.setY(-22 + smoothAbs * 1.5);
    this.head.setY(-26 + smoothAbs * 1.5);
    // Keep left shoulder tracking torso vertical motion
    this.shoulderL.setY(-21 + smoothAbs * 1.5);

    // Right arm swings opposite to leg — lowerArmR locks to upperArmR via _syncChain
    this.upperArmR.setAngle(18 - legPhase * 14);

    // Left arm stub flails a bit
    this.armLStub.setAngle(-15 + legPhase * 8);
  }

  _updateStanding(_delta) {
    // Sync left shoulder connector with torso sway so it doesn't visually disconnect
    this.shoulderL.setAngle(-10 + this.torso.angle * 0.8);
  }

  // ─── Stumble system ───────────────────────────────────────────────────────

  _scheduleStumble() {
    // Random delay 2–5 seconds before next possible stumble
    const delay = Phaser.Math.Between(2000, 5000);
    this.scene.time.delayedCall(delay, () => {
      if (this.state === RobotState.STANDING || this.state === RobotState.WALKING) {
        this._doStumble();
      } else {
        this._scheduleStumble(); // try again later
      }
    });
  }

  _doStumble() {
    this.state = RobotState.STUMBLING;
    this._stopTweens();

    const T = this.scene.tweens;

    // Pick a random stumble type
    const type = Phaser.Math.Between(0, 2);

    if (type === 0) {
      // Forward lurch — almost falls
      T.add({ targets: this.torso, angle: 35, y: -14, duration: 300, ease: 'Sine.easeIn' });
      T.add({ targets: this.head,  angle: 25, y: -22, duration: 300 });
      T.add({ targets: this.upperArmR, angle: -80, duration: 200 }); // arm flings out
      // Catch self
      this.scene.time.delayedCall(350, () => this._recover());

    } else if (type === 1) {
      // Knee buckle — right leg gives out
      T.add({ targets: this.upperLegR, angle: -30, duration: 200 });
      T.add({ targets: this.lowerLegR, angle:  40, duration: 200 });
      T.add({ targets: this.torso,     y: -13, angle: 10, duration: 250 });
      this.scene.time.delayedCall(300, () => this._recover());

    } else {
      // Shoulder spasm — arm stub jerks violently
      T.add({ targets: this.armLStub, angle: { from: -30, to: 20 }, duration: 80, yoyo: true, repeat: 4 });
      T.add({ targets: this.torso, angle: { from: -8, to: 8 }, duration: 120, yoyo: true, repeat: 3 });
      this.scene.time.delayedCall(600, () => this._recover());
    }
  }

  _recover() {
    this.state = RobotState.RECOVERING;
    this._tweenToStanding(() => {
      this.state = RobotState.STANDING;
      this._startSway();
    });
  }

  // ─── Physics / movement ───────────────────────────────────────────────────

  _applyMovement(intent) {
    const speed = this.state === RobotState.LYING ? 18 : 30; // crawl slower
    if (intent !== 0) {
      this.body_proxy.body.setVelocityX(intent * speed);
      this.facingRight = intent > 0;
      if (this.state === RobotState.STANDING) {
        this.state = RobotState.WALKING;
        this._walkTime = 0;
        if (this._swayTween) this._swayTween.stop();
        if (this._swayHeadTween) this._swayHeadTween.stop();
      }
    } else {
      this.body_proxy.body.setVelocityX(0);
      // Don't reset _crawlTime when lying — animation keeps running between pulses
      if (this.state !== RobotState.LYING) this._crawlTime = 0;
      if (this.state === RobotState.WALKING) {
        this.state = RobotState.STANDING;
        this._tweenToStanding(() => this._startSway());
      }
    }
  }

  _syncToProxy() {
    if (!this.body_proxy) return;
    // offset = proxy half-height, so container origin (feet) aligns with proxy bottom (ground)
    const offset = (this.state === RobotState.LYING || this.state === RobotState.GETTING_UP)
      ? 11 : 42;
    this.setPosition(this.body_proxy.x, this.body_proxy.y + offset);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Returns the position of the bottom tip of a rotated rectangle child. */
  _tipOf(part) {
    const DEG = Math.PI / 180;
    return {
      x: part.x + (part.height / 2) * Math.sin(part.angle * DEG),
      y: part.y + (part.height / 2) * Math.cos(part.angle * DEG),
    };
  }

  /**
   * Keeps limb chains rigid every frame.
   * - Elbow snaps to the tip of upperArmR; forearm extends from elbow.
   * - Knee snaps to the tip of upperLegR; lower leg extends from knee.
   * Only called for upright states (not LYING).
   */
  _syncChain() {
    const DEG = Math.PI / 180;

    // ── Arm ───────────────────────────────────────────────────────────────
    // lowerArmR locks to upperArmR with a fixed −30° offset (Λ shape stays rigid)
    this.lowerArmR.setAngle(this.upperArmR.angle - 30);

    // Place elbowR so its top edge overlaps the bottom of upperArmR
    // Shifted 8 virtual px left (÷3 scale) so the elbow trails behind the shoulder
    const elbow = this._tipOf(this.upperArmR);
    const eA = this.upperArmR.angle * DEG;
    this.elbowR.setPosition(
      elbow.x + (this.elbowR.height / 2) * Math.sin(eA) - 8 / 3,
      elbow.y + (this.elbowR.height / 2) * Math.cos(eA),
    );
    this.elbowR.setAngle(this.upperArmR.angle);

    // lowerArmR top flush with elbowR bottom
    const elbowTip = this._tipOf(this.elbowR);
    const fA = this.lowerArmR.angle * DEG;
    this.lowerArmR.setPosition(
      elbowTip.x + (this.lowerArmR.height / 2) * Math.sin(fA),
      elbowTip.y + (this.lowerArmR.height / 2) * Math.cos(fA),
    );

    // ── Leg ───────────────────────────────────────────────────────────────
    const knee = this._tipOf(this.upperLegR);
    this.kneeR.setPosition(knee.x, knee.y);
    this.kneeR.setAngle(this.upperLegR.angle * 0.4);

    const lA = this.lowerLegR.angle * DEG;
    this.lowerLegR.setPosition(
      knee.x + (this.lowerLegR.height / 2) * Math.sin(lA),
      knee.y + (this.lowerLegR.height / 2) * Math.cos(lA),
    );
  }

  _stopTweens() {
    if (this._swayTween) { this._swayTween.stop(); this._swayTween = null; }
    if (this._swayHeadTween) { this._swayHeadTween.stop(); this._swayHeadTween = null; }
  }

  destroy(fromScene) {
    this.scene.events.off('update', this._syncToProxy, this);
    if (this.body_proxy) this.body_proxy.destroy();
    if (this._sparks) this._sparks.destroy();
    super.destroy(fromScene);
  }
}
