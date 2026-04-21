import DeadRobot from './DeadRobot.js';

/**
 * ArmedDeadRobot — variant of DeadRobot with a removable armed arm.
 * The arm has a blue stripe at its top (shoulder area) identifying it as the weapon arm.
 */
export default class ArmedDeadRobot extends DeadRobot {
  constructor(scene, x, groundY) {
    super(scene, x, groundY);

    const METAL    = 0xeeeeee;
    const ARM_BLUE = 0x4499ff;

    const addPart = (w, h, color) => {
      const rect = scene.add.rectangle(0, 0, w, h, color);
      this.add(rect);
      return rect;
    };

    // ── Armed arm — extends leftward from upper torso ─────────────────────
    const armUpper = addPart(3, 8, METAL);
    armUpper.setPosition(-5, -15);
    armUpper.setAngle(82);

    // 1 px blue line on the top face of the arm
    // Top of armUpper in container coords: rotate (0, -4) by 82° around (-5,-15)
    // → (-5 + 4*sin82°, -15 - 4*cos82°) ≈ (-1, -16)
    const armStripe = addPart(3, 1, ARM_BLUE);
    armStripe.setPosition(-1, -16);
    armStripe.setAngle(82);

    const armLower = addPart(3, 7, METAL);
    armLower.setPosition(-10, -12);
    armLower.setAngle(75);

    const armHand = addPart(4, 3, METAL);
    armHand.setPosition(-15, -11);
    armHand.setAngle(75);

    this._armParts = [armStripe, armUpper, armLower, armHand];
  }

  removeArm(onComplete) {
    this.scene.tweens.add({
      targets:    this._armParts,
      alpha:      0,
      duration:   600,
      ease:       'Sine.easeOut',
      onComplete: () => { if (onComplete) onComplete(); },
    });
  }
}
