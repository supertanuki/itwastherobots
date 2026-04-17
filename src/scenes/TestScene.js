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

  preload() {
    this.load.image('wall', '/img/sketch-wall-texture_1409-10961.jpg');
  }

  create() {
    // ── Virtual world dimensions ──────────────────────────────────────────
    const VW = 320;
    const VH = 180;
    // Ground surface — 20px strip visible at screen bottom (5× original 4px)
    const GROUND_Y = VH - 20;

    // ── Camera zoom x4 — 1 virtual pixel = 4 screen pixels ───────────────
    this.cameras.main.setZoom(4);
    this.cameras.main.centerOn(VW / 2, VH / 2);

    // World bounds slightly taller than screen so the physics ground body fits below
    this.physics.world.setBounds(0, 0, VW, VH + 40);

    // ── Background ────────────────────────────────────────────────────────
    this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000);

    // ── Ground ────────────────────────────────────────────────────────────
    // Physics ground — static body, top surface at GROUND_Y
    const groundBody = this.add.rectangle(VW / 2, GROUND_Y + 10, VW, 20, 0x000000, 0);
    this.physics.add.existing(groundBody, true); // true = static

    // ── Ground plates — metal panels with white outline + bolt rivets ────
    const gfx = this.add.graphics();
    const GH  = 20;       // plate height = ground height
    // Plate widths that sum exactly to VW=320, varying for an industrial look
    const plateWidths = [40, 54, 36, 62, 44, 38, 46];
    let px = 0;
    for (const pw of plateWidths) {
      // Black fill
      gfx.fillStyle(0x000000, 1);
      gfx.fillRect(px, GROUND_Y, pw, GH);
      // White 1px outline
      gfx.lineStyle(1, 0xffffff, 1);
      gfx.strokeRect(px, GROUND_Y, pw, GH);
      // Bolt rivets — 4 corners (radius 1.5 virtual px = 6 screen px)
      gfx.fillStyle(0xffffff, 1);
      const bx1 = px + 5;
      const bx2 = px + pw - 5;
      const by1 = GROUND_Y + 5;
      const by2 = GROUND_Y + GH - 5;
      gfx.fillCircle(bx1, by1, 1.5);
      gfx.fillCircle(bx2, by1, 1.5);
      gfx.fillCircle(bx1, by2, 1.5);
      gfx.fillCircle(bx2, by2, 1.5);
      px += pw;
    }

    // ── Robot — starts lying on the ground ───────────────────────────────
    // Spawn at feet position: x = near left, y = ground surface
    this.robot = new Robot(this, 60, GROUND_Y);

    // Collide robot physics proxy with ground
    this.physics.add.collider(this.robot.body_proxy, groundBody);

    // ── Wall texture overlay — added after robot so it renders above ──────
    this.add.image(VW / 2, VH / 2, 'wall')
      .setDisplaySize(VW, VH)
      .setAlpha(0.1);

    // ── Debug label (top-left, in screen space — scrollFactor 0) ─────────
    this.debugLabel = this.add.text(4, 4, '', {
      fontFamily: 'monospace',
      fontSize: '4px',        // tiny in virtual space — looks normal at x4
      color: '#ffffff',
    }).setScrollFactor(0).setDepth(500);

    // ── Hint label ────────────────────────────────────────────────────────
    this.hintLabel = this.add.text(VW / 2, VH - 8, 'SPACE — get up  |  ← → move', {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#44ff88',
    }).setOrigin(0.5, 1).setDepth(500);
    // Fade out after a few seconds
    this.time.delayedCall(4000, () => {
      this.tweens.add({ targets: this.hintLabel, alpha: 0, duration: 1000 });
    });

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
