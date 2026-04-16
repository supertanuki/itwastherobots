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
      scene.add.rectangle(x, y - 42, 30, 84, 0x000000, 0),
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
    this._poseLying();
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
    this._animateGetUp();
  }

  update(delta) {
    this._syncToProxy();

    switch (this.state) {
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
      case RobotState.LYING:
        this._applyMovement(0);
        break;
    }

    // Mirror parts when facing left (preserve the x3 base scale)
    this.setScale(this.facingRight ? 3 : -3, 3);
  }

  // ─── Build parts ──────────────────────────────────────────────────────────

  _buildParts() {
    const add = (w, h, color) => {
      const r = this.scene.add.rectangle(0, 0, w, h, color);
      this.add(r);
      return r;
    };

    // Colors
    const METAL     = 0x7a8fa6;
    const METAL_DRK = 0x4a6278;
    const JOINT     = 0x2a3a4a;
    const EYE       = 0xff2200;
    const STUB      = 0x3a4a5a; // missing-limb stub color

    // Torso (origin of container = feet, so torso center is at -14 to -24)
    this.torso      = add(8, 10, METAL);

    // Head
    this.head       = add(6,  6,  METAL_DRK);
    this.eye        = add(2,  2,  EYE);       // single eye

    // Right arm (has it)
    this.upperArmR  = add(4,  7,  METAL);
    this.lowerArmR  = add(3,  6,  METAL_DRK);
    this.handR      = add(3,  3,  JOINT);

    // Left arm STUB (missing — short stump with sparks implied)
    this.armLStub   = add(3,  3,  STUB);

    // Right leg (has it — but it's the damaged one, will drag)
    this.upperLegR  = add(4,  8,  METAL);
    this.lowerLegR  = add(3,  7,  METAL_DRK);
    this.footR      = add(4,  2,  JOINT);

    // Left leg STUB
    this.legLStub   = add(4,  3,  STUB);
  }

  // ─── Poses — sets each part's x/y/angle within the container ─────────────

  /**
   * Upright standing pose.
   * Container origin = feet center, Y grows upward in our mental model
   * but Phaser Y grows DOWN, so "above feet" = negative Y.
   */
  _poseStanding() {
    // Torso
    this.torso.setPosition(0, -19);      // center of torso

    // Head (above torso)
    this.head.setPosition(0, -28);
    this.eye.setPosition(2, -27);

    // Right arm — hangs beside torso, slightly angled
    this.upperArmR.setPosition(7, -21);
    this.upperArmR.setAngle(8);
    this.lowerArmR.setPosition(9, -14);
    this.lowerArmR.setAngle(10);
    this.handR.setPosition(10, -9);

    // Left arm stub — shoulder level
    this.armLStub.setPosition(-6, -23);
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

    // Reset all angles
    this.torso.setAngle(0);
    this.head.setAngle(0);
  }

  /** Flat on ground — all parts collapsed. */
  _poseLying() {
    this.torso.setPosition(0, -4);
    this.torso.setAngle(0);

    this.head.setPosition(9, -5);
    this.head.setAngle(0);
    this.eye.setPosition(11, -4);

    // Arms splayed
    this.upperArmR.setPosition(5, -1);
    this.upperArmR.setAngle(70);
    this.lowerArmR.setPosition(8, 3);
    this.lowerArmR.setAngle(60);
    this.handR.setPosition(10, 6);

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
  }

  // ─── Animations ───────────────────────────────────────────────────────────

  _animateGetUp() {
    const T = this.scene.tweens;

    // Phase 1 — robot stirs, head rises first (600ms)
    T.add({ targets: this.head,  y: -10, angle: 15, duration: 600, ease: 'Sine.easeOut' });
    T.add({ targets: this.eye,   y: -9,             duration: 600 });

    // Phase 2 — torso lifts (after 500ms, takes 800ms) — struggle
    this.scene.time.delayedCall(500, () => {
      T.add({ targets: this.torso, y: -10, angle: -20, duration: 500, ease: 'Sine.easeOut' });
      T.add({ targets: this.torso, y: -14, angle: -5,  duration: 400, ease: 'Sine.easeIn', delay: 500 });
    });

    // Phase 3 — right leg pushes (after 1000ms)
    this.scene.time.delayedCall(1000, () => {
      T.add({ targets: this.upperLegR, angle: -40, y: -6,  duration: 500 });
      T.add({ targets: this.lowerLegR, angle: -20, y: -1, duration: 500 });

      // Left leg stub flails
      T.add({ targets: this.legLStub, angle: 20, duration: 200, yoyo: true, repeat: 2 });
    });

    // Phase 4 — almost standing but stumbles (after 1800ms)
    this.scene.time.delayedCall(1800, () => {
      // Fake-stand then lurch forward
      T.add({ targets: this.torso, y: -19, angle: 15, duration: 400, ease: 'Back.easeOut' });
      T.add({ targets: this.head,  y: -28, angle: 10, duration: 400 });
      T.add({ targets: this.upperLegR, angle: 0, y: -9, duration: 400 });
      T.add({ targets: this.lowerLegR, angle: 0, y: -1, duration: 400 });

      // Right arm flings out for balance
      T.add({ targets: this.upperArmR, angle: -60, duration: 250, yoyo: true });
    });

    // Phase 5 — settle into standing (after 2500ms)
    this.scene.time.delayedCall(2500, () => {
      this._tweenToStanding(() => {
        this.state = RobotState.STANDING;
        this._startSway();
        this._scheduleStumble();
      });
    });
  }

  _tweenToStanding(onComplete) {
    const T = this.scene.tweens;
    const parts = [
      { t: this.torso,     x: 0,   y: -19, a: 0 },
      { t: this.head,      x: 0,   y: -28, a: 0 },
      { t: this.eye,       x: 2,   y: -27, a: 0 },
      { t: this.upperArmR, x: 7,   y: -21, a: 8 },
      { t: this.lowerArmR, x: 9,   y: -14, a: 10 },
      { t: this.handR,     x: 10,  y: -9,  a: 0 },
      { t: this.armLStub,  x: -6,  y: -23, a: -15 },
      { t: this.upperLegR, x: 2,   y: -9,  a: 0 },
      { t: this.lowerLegR, x: 2,   y: -1,  a: 0 },
      { t: this.footR,     x: 2,   y: 3,   a: 0 },
      { t: this.legLStub,  x: -3,  y: -8,  a: 10 },
    ];

    let done = 0;
    parts.forEach(({ t, x, y, a }) => {
      this.scene.tweens.add({
        targets: t, x, y, angle: a,
        duration: 350, ease: 'Sine.easeOut',
        onComplete: () => { done++; if (done === parts.length && onComplete) onComplete(); },
      });
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
    // Left leg stub twitches occasionally
    T.add({
      targets: this.legLStub,
      angle: { from: 8, to: 14 },
      duration: 200,
      yoyo: true,
      repeat: -1,
      repeatDelay: 1200,
    });
    // Arm stub spasms
    T.add({
      targets: this.armLStub,
      angle: { from: -18, to: -8 },
      y: { from: -23, to: -20 },
      duration: 80,
      yoyo: true,
      repeat: 3,
      repeatDelay: 2500,
    });
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

    // Body bobs slightly
    this.torso.setY(-19 + Math.abs(legPhase) * 1.5);
    this.head.setY(-28 + Math.abs(legPhase) * 1.5);

    // Right arm swings opposite to leg
    this.upperArmR.setAngle(8 - legPhase * 14);

    // Left arm stub flails a bit
    this.armLStub.setAngle(-15 + legPhase * 8);
  }

  _updateStanding(delta) {
    // nothing extra — sway tween handles it
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
      this._scheduleStumble();
    });
  }

  // ─── Physics / movement ───────────────────────────────────────────────────

  _applyMovement(intent) {
    const speed = 30; // virtual pixels/s
    if (intent !== 0) {
      this.body_proxy.body.setVelocityX(intent * speed);
      this.facingRight = intent > 0;
      if (this.state === RobotState.STANDING) {
        this.state = RobotState.WALKING;
        this._walkTime = 0;
        // Stop the sway tween when walking starts
        if (this._swayTween) this._swayTween.stop();
        if (this._swayHeadTween) this._swayHeadTween.stop();
      }
    } else {
      this.body_proxy.body.setVelocityX(0);
      if (this.state === RobotState.WALKING) {
        this.state = RobotState.STANDING;
        this._tweenToStanding(() => this._startSway());
      }
    }
  }

  _syncToProxy() {
    if (!this.body_proxy) return;
    this.setPosition(this.body_proxy.x, this.body_proxy.y + 42);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _stopTweens() {
    if (this._swayTween) { this._swayTween.stop(); this._swayTween = null; }
    if (this._swayHeadTween) { this._swayHeadTween.stop(); this._swayHeadTween = null; }
  }

  destroy(fromScene) {
    this.scene.events.off('update', this._syncToProxy, this);
    if (this.body_proxy) this.body_proxy.destroy();
    super.destroy(fromScene);
  }
}
