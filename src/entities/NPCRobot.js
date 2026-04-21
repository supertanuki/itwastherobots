import Phaser from 'phaser';
import Robot, { RobotState } from './Robot.js';

/**
 * NPCRobot — fully intact robot NPC (blue eye, both legs, armed arm).
 *
 * Patrols 100 px left of its spawn point then turns around.
 * When the player enters within 100 px it stops and raises its armed arm.
 *
 * The armed-arm marker is a 1 px blue line baked into a sub-container that
 * replaces upperArmR.  The sub-container holds:
 *   • armRect  — 3×10 white rectangle (the arm itself)
 *   • armStripe — 1×10 blue rectangle at the left column of the arm
 * Both children rotate together with the container, so the stripe is always
 * solidary with the arm.  When the arm is raised to -90° the "left column"
 * becomes the topmost row → the blue line appears on top.
 */
export default class NPCRobot extends Robot {
  constructor(scene, x, y) {
    super(scene, x, y);

    // Kill any tweens started by the parent constructor (lying-pose animations)
    [this.torso, this.head, this.neck, this.upperArmR, this.armLStub,
     this.upperLegR, this.lowerLegR, this.footR, this.legLStub,
     this.upperLegL, this.lowerLegL, this.footL,
     this.hipR, this.hipL, this.kneeR, this.kneeL,
    ].forEach(p => scene.tweens.killTweensOf(p));

    // Show full left leg (NPC is intact)
    this.legLStub.setVisible(false);
    this.hipL.setVisible(true);
    this.upperLegL.setVisible(true);
    this.kneeL.setVisible(true);
    this.lowerLegL.setVisible(true);
    this.footL.setVisible(true);

    // ── Replace upperArmR with a sub-container holding arm + stripe ──────────
    // The original Rectangle upperArmR was the last child — remove it.
    this.remove(this.upperArmR, true);

    // Arm body (same geometry as the original Rectangle)
    const armRect   = scene.add.rectangle(0, 0, 3, 10, 0xffffff);
    armRect.setOrigin(0.5, 0);  // pivot at top-center, body hangs down

    // 1 px blue stripe — occupies the leftmost column of the arm (x -1.5→-0.5).
    // In arm-local space this column is the "top row" when the arm is horizontal.
    const armStripe = scene.add.rectangle(1, 5, 1, 10, 0x4499ff);
    armStripe.setOrigin(0.5, 0.5);

    // Sub-container: pivot at (0,0) = top-center of arm, same as setOrigin(0.5,0)
    const armCont = scene.add.container(0, 0);
    armCont.add([armRect, armStripe]);  // stripe on top

    this.add(armCont);          // added last → highest z-order
    this.upperArmR = armCont;  // all existing code (tweens, setAngle…) targets this

    // Standing pose + correctly sized physics proxy
    this._poseStanding();
    this._syncChain();
    this.state = RobotState.STANDING;
    this.body_proxy.body.setSize(30, 84);
    this.body_proxy.setPosition(x, y - 42);

    // Blue eye, active
    this._dormant = false;
    this.eye.setFillStyle(0x0088ff);

    // Face left toward the approaching player
    this.facingRight = false;

    this._startSway();

    // Patrol state
    this._patrolOrigin = x;
    this._patrolDir    = -1;
    this._armRaised    = false;
  }

  // ── Override blink to keep blue eye instead of red ────────────────────────
  _scheduleBlink() {
    this.scene.time.delayedCall(Phaser.Math.Between(2000, 3000), () => {
      if (this._dormant) return;
      this.eye.setFillStyle(0x222222);
      this.scene.time.delayedCall(120, () => {
        if (this._dormant) return;
        this.eye.setFillStyle(0x0088ff);
        this._scheduleBlink();
      });
    });
  }

  // ── No sparks (fully functional robot) ───────────────────────────────────
  _initSparks() {
    this._sparks = { explode: () => {}, destroy: () => {} };
  }

  // ── Called every frame from GameScene ────────────────────────────────────
  npcUpdate(delta, playerX) {
    const dist = Math.abs(this.x - playerX);

    if (dist < 100) {
      this.facingRight = playerX > this.x;
      if (!this._armRaised) {
        this._armRaised = true;
        this.scene.time.delayedCall(260, () => this._raiseArm());
      }
      this.setMoveIntent(0);
    } else {
      if (this._armRaised) this._lowerArm();
      const leftBound  = this._patrolOrigin - 100;
      const rightBound = this._patrolOrigin;
      if (this.x <= leftBound)  this._patrolDir = 1;
      if (this.x >= rightBound) this._patrolDir = -1;
      this.setMoveIntent(this._patrolDir);
    }

    this.update(delta);
  }

  _raiseArm() {
    this.scene.tweens.killTweensOf(this.upperArmR);
    this.scene.tweens.add({
      targets:  this.upperArmR,
      angle:    -90,
      duration: 400,
      ease:     'Sine.easeOut',
    });
  }

  _lowerArm() {
    this._armRaised = false;
    this.scene.tweens.killTweensOf(this.upperArmR);
    this.scene.tweens.add({
      targets:  this.upperArmR,
      angle:    5,
      duration: 400,
      ease:     'Sine.easeOut',
    });
  }
}
