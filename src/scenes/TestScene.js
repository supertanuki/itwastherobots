import Phaser from 'phaser';
import Robot, { RobotState } from '../entities/Robot.js';

/**
 * TestScene — movement test for the broken robot.
 *
 * Virtual resolution: 320x180 (zoomed x4 = 1280x720 on screen).
 *
 * Controls:
 *   ← / → / A / D / Q / D  — move
 *   SPACE                   — trigger get-up (when lying)
 */
export default class TestScene extends Phaser.Scene {
  constructor() {
    super('TestScene');
  }

  create() {
    // ── Virtual world dimensions ──────────────────────────────────────────
    const VW      = 320;
    const VH      = 180;
    const WORLD_W = 3000;   // scrollable world width
    const GROUND_Y = VH - 20;

    // ── Camera zoom x4 — 1 virtual pixel = 4 screen pixels ───────────────
    this.cameras.main.setZoom(4);
    // Camera bounds = world bounds (camera won't scroll past edges)
    this.cameras.main.setBounds(0, 0, WORLD_W, VH);

    // Physics world bounds
    this.physics.world.setBounds(0, 0, WORLD_W, VH + 40);

    // ── Background (full world width) ─────────────────────────────────────
    this.add.rectangle(WORLD_W / 2, VH / 2, WORLD_W, VH, 0x000000);

    // ── Ground ────────────────────────────────────────────────────────────
    // Physics ground — static body spanning the full world
    const groundBody = this.add.rectangle(WORLD_W / 2, GROUND_Y + 10, WORLD_W, 20, 0x000000, 0);
    this.physics.add.existing(groundBody, true);

    // ── Ground plates — metal panels, tiled across the full world ─────────
    const gfx = this.add.graphics();
    const GH  = 20;
    const platePattern = [40, 54, 36, 62, 44, 38, 46]; // base pattern (sums 320)
    let gx = 0;
    let pi = 0;
    while (gx < WORLD_W) {
      const pw = Math.min(platePattern[pi % platePattern.length], WORLD_W - gx);
      gfx.fillStyle(0x000000, 1);
      gfx.fillRect(gx, GROUND_Y, pw, GH);
      gfx.lineStyle(1, 0xffffff, 1);
      gfx.strokeRect(gx, GROUND_Y, pw, GH);
      gfx.fillStyle(0xffffff, 1);
      if (pw >= 20) {
        gfx.fillCircle(gx + 5,      GROUND_Y + 5,      1.5);
        gfx.fillCircle(gx + pw - 5, GROUND_Y + 5,      1.5);
        gfx.fillCircle(gx + 5,      GROUND_Y + GH - 5, 1.5);
        gfx.fillCircle(gx + pw - 5, GROUND_Y + GH - 5, 1.5);
      }
      gx += platePattern[pi % platePattern.length];
      pi++;
    }

    // ── Robot — starts lying on the ground ───────────────────────────────
    this.robot = new Robot(this, 200, GROUND_Y);
    this.physics.add.collider(this.robot.body_proxy, groundBody);

    // ── Camera follows the robot ──────────────────────────────────────────
    this.cameras.main.startFollow(this.robot, true);
    // Negative offset → camera leads right, robot appears ~1/4 from left
    this.cameras.main.setFollowOffset(-80, 0);

    // ── Input ─────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyQ    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyF1   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
  }

  update() {
    const r = this.robot;

    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      if (r.state === RobotState.LYING) r.getUp();
    }

    const canMove = r.state === RobotState.LYING    ||
                    r.state === RobotState.STANDING  ||
                    r.state === RobotState.WALKING;

    if (canMove) {
      const left  = this.cursors.left.isDown  || this.keyA.isDown || this.keyQ.isDown;
      const right = this.cursors.right.isDown || this.keyD.isDown;
      if (left && !right)      r.setMoveIntent(-1);
      else if (right && !left) r.setMoveIntent(1);
      else                     r.setMoveIntent(0);
    } else {
      r.setMoveIntent(0);
    }

    r.update(this.game.loop.delta);
  }
}
