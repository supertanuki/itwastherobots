import Phaser from 'phaser';
import Robot, { RobotState } from '../entities/Robot.js';

/**
 * TestScene — movement test for the broken robot.
 *
 * Virtual resolution: 320x180 (zoomed x4 = 1280x720 on screen).
 *
 * Controls:
 *   ← / → / A / D / Q / D  — move (once standing)
 *   SPACE                   — trigger get-up (when lying)
 *   F1                      — toggle physics debug
 */
export default class TestScene extends Phaser.Scene {
  constructor() {
    super('TestScene');
  }

  create() {
    // ── Virtual world dimensions ──────────────────────────────────────────
    const VW = 320;
    const VH = 180;
    // Ground surface flush with screen bottom
    const GROUND_Y = VH;

    // ── Camera zoom x4 — 1 virtual pixel = 4 screen pixels ───────────────
    this.cameras.main.setZoom(4);
    this.cameras.main.centerOn(VW / 2, VH / 2);

    // World bounds slightly taller than screen so the physics ground body fits below
    this.physics.world.setBounds(0, 0, VW, VH + 40);

    // ── Background ────────────────────────────────────────────────────────
    this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000);

    // ── Ground ────────────────────────────────────────────────────────────
    // Physics body sits just below the screen — top surface at GROUND_Y = VH
    const ground = this.physics.add.staticImage(VW / 2, GROUND_Y + 10, '__DEFAULT');
    ground.setDisplaySize(VW, 20);
    ground.setVisible(false);
    ground.refreshBody();

    // Visible ground line — 2px at very bottom of screen
    this.add.rectangle(VW / 2, VH - 1, VW, 2, 0xffffff);

    // ── Debug label (top-left, in screen space — scrollFactor 0) ─────────
    this.debugLabel = this.add.text(4, 4, '', {
      fontFamily: 'monospace',
      fontSize: '4px',        // tiny in virtual space — looks normal at x4
      color: '#556677',
    }).setScrollFactor(0).setDepth(100);

    // ── Hint label ────────────────────────────────────────────────────────
    this.hintLabel = this.add.text(VW / 2, VH - 8, 'SPACE — get up  |  ← → move', {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#44ff88',
    }).setOrigin(0.5, 1).setDepth(100);
    // Fade out after a few seconds
    this.time.delayedCall(4000, () => {
      this.tweens.add({ targets: this.hintLabel, alpha: 0, duration: 1000 });
    });

    // ── Robot — starts lying on the ground ───────────────────────────────
    // Spawn at feet position: x = near left, y = ground surface
    this.robot = new Robot(this, 60, GROUND_Y);

    // Collide robot physics proxy with ground
    this.physics.add.collider(this.robot.body_proxy, ground);

    // ── Input ─────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyF1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);

    this.keyF1.on('down', () => {
      this.physics.world.drawDebug = !this.physics.world.drawDebug;
      if (!this.physics.world.drawDebug) this.physics.world.debugGraphic.clear();
    });
  }

  update() {
    const r = this.robot;

    // ── Get-up trigger ────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      if (r.state === RobotState.LYING) {
        r.getUp();
        this.hintLabel.setAlpha(0);
      }
    }

    // ── Movement input (crawl + walk) ────────────────────────────────────
    const canMove = r.state === RobotState.LYING ||
                    r.state === RobotState.STANDING ||
                    r.state === RobotState.WALKING;

    if (canMove) {
      const left  = this.cursors.left.isDown  || this.keyA.isDown || this.keyQ.isDown;
      const right = this.cursors.right.isDown || this.keyD.isDown;

      if (left && !right)       r.setMoveIntent(-1);
      else if (right && !left)  r.setMoveIntent(1);
      else                      r.setMoveIntent(0);
    } else {
      r.setMoveIntent(0);
    }

    // ── Update robot ──────────────────────────────────────────────────────
    r.update(this.game.loop.delta);

    // ── Debug label ───────────────────────────────────────────────────────
    this.debugLabel.setText(
      `state: ${r.state}  |  facing: ${r.facingRight ? '→' : '←'}  |  F1: physics debug`
    );
  }
}
