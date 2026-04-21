import Phaser from 'phaser';
import Robot, { RobotState } from '../entities/Robot.js';
import Skull from '../entities/Skull.js';
import DeadRobot from '../entities/DeadRobot.js';
import Wall from '../entities/Wall.js';
import Chain from '../entities/Chain.js';
import Computer from '../entities/Computer.js';
import SurveillanceCamera from '../entities/SurveillanceCamera.js';
import ArmedDeadRobot from '../entities/ArmedDeadRobot.js';
import NPCRobot from '../entities/NPCRobot.js';
import i18n from '../i18n.js';

/**
 * GameScene — movement test for the broken robot.
 *
 * Virtual resolution: 320x180 (zoomed x4 = 1280x720 on screen).
 *
 * Controls (standing):
 *   ← / → / A / D / Q      — move
 *
 * Controls (lying / crawling):
 *   → then ← then → then ←  — crawl right (alternating left/right)
 *   SPACE                    — get up
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // ── Launch UI overlay (subtitles + instruction) ───────────────────────
    this.scene.launch('UIScene');

    // FadeIn
    this.cameras.main.fadeIn(2000, 0, 0, 0);

    // ── Virtual world dimensions ──────────────────────────────────────────
    const VW      = 320;
    const VH      = 180;
    const WORLD_W = 3000;   // scrollable world width
    const GH       = 60;          // ground height (3× original 20px)
    const GROUND_Y = VH - GH;    // = 120 — top of ground, robot stands here
    this._groundY = GROUND_Y;

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
    const groundBody = this.add.rectangle(WORLD_W / 2, GROUND_Y + GH / 2, WORLD_W, GH, 0x000000, 0);
    this.physics.add.existing(groundBody, true);

    // ── Ground plates — metal panels, tiled across the full world ─────────
    const gfx = this.add.graphics();
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
    this.robot.setDepth(10);
    this.physics.add.collider(this.robot.body_proxy, groundBody);

    // ── Dead robot + wall ─────────────────────────────────────────────────
    // Wall added first so it renders behind the robot body
    new Wall(this, 438, GROUND_Y);
    this._deadRobot = new DeadRobot(this, 440, GROUND_Y);

    // ── Chain — hangs from ceiling, reaches robot mid-height ──────────────
    // Robot head world y = GROUND_Y - 26*3 = 42 → mid-height y = (42+120)/2 = 81
    new Chain(this, 260, -180, GROUND_Y - 60, this.robot);
    new Chain(this, 290, -180, GROUND_Y - 60, this.robot);

    // ── Skull pyramid ─────────────────────────────────────────────────────
    this._skulls           = [];
    this._pyramidTriggered = false;
    this._buildSkullPyramid(600, GROUND_Y, groundBody);

    // ── Wide wall + computer terminal at mid-height ───────────────────────
    const COMP_WALL_H = 70;
    const COMP_X      = 750;
    new Wall(this, COMP_X, GROUND_Y, { width: 60, height: COMP_WALL_H, offsetX: 0 });
    this._computer = new Computer(this, COMP_X + 30, GROUND_Y - COMP_WALL_H / 2);
    this._computerState = null;  // null | 'active' | 'done'

    // ── Armed dead robot + wall ───────────────────────────────────────────
    new Wall(this, 1400, GROUND_Y);
    this._armedDeadRobot = new ArmedDeadRobot(this, 1400, GROUND_Y);

    // ── NPC robots ────────────────────────────────────────────────────────
    this._npcRobots = [1800, 2000, 2300].map(x => {
      const npc = new NPCRobot(this, x, GROUND_Y);
      this.physics.add.collider(npc.body_proxy, groundBody);
      return npc;
    });

    // ── Surveillance camera ───────────────────────────────────────────────
    this._surveillanceCams = [1100, 2600, 2700].map(x =>
      new SurveillanceCamera(this, x, -60, GROUND_Y)
    );

    // ── Ceiling wall — hangs from top, x 2640–2660, 20 px tall ──────────
    // Wall origin = bottom of wall (y=20), height=20 → draws up to y=0
    new Wall(this, 2630, 20, { width: 40, height: 10, offsetX: 0 }).setDepth(6);
    {
      const ceilBody = this.add.rectangle(2650, 10, 20, 20, 0x000000, 0);
      this.physics.add.existing(ceilBody, true);
      this.physics.add.collider(this.robot.body_proxy, ceilBody);
    }
    this.events.on('camera-hit', () => this._robotExplode());
    this.events.on('npc-fire', (npc, npcX, npcY, facingRight) => this._npcShoot(npc, npcX, npcY, facingRight));

    // ── Silent mode — ?nosounds in URL disables all audio ────────────────
    this._silent = new URLSearchParams(window.location.search).has('nosounds');

    // ── Debug mode — ?debug in URL ────────────────────────────────────────
    this._debug = new URLSearchParams(window.location.search).has('debug');
    if (this._debug) {
      this.keyPageUp   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PAGE_UP);
      this.keyPageDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PAGE_DOWN);
      this._debugText = this.add.text(318, 4, '', { fontSize: '6px', color: '#ffffff' });
      this._debugText.setOrigin(1, 0);
      this._debugText.setScrollFactor(0);
      this._debugText.setDepth(100);
    }

    // ── Wake-up state ─────────────────────────────────────────────────────
    this._wakeCount = 0;   // space presses so far
    this._awake     = false;

    // ── Camera follows the robot ──────────────────────────────────────────
    this.cameras.main.startFollow(this.robot, true);
    // Negative offset → camera leads right, robot appears ~1/4 from left
    this.cameras.main.setFollowOffset(-80, 0);

    this._zoomedOut = false;

    // ── Robot stood up — show post-standup dialogue ───────────────────────
    this.events.on('robot-stood-up', () => {
      this.time.delayedCall(600, () => {
        this._startDialogue(i18n.dialogueStandup);
        this._dlgDismissOnWalk = true;
      });
    }, this);

    // ── Input ─────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyQ    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyS    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyM    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    // Crawl combo state (lying only): right → left alternating
    this._crawlStep        = 0;
    this._crawlActiveUntil = 0;

    // Leg-retrieval interaction state
    // null | 'blocked' | 'instruction' | 'pulling' | 'done'
    this._legState         = null;
    this._legPressCount    = 0;
    this._dlgDismissOnWalk  = false;
    this._robotWaiting      = false;  // true while a blocking dialogue is active
    this._skullDialogueDone = false;  // true once dialogueSkullsFound has fired

    // Arm-retrieval interaction state (armed dead robot, standing phase)
    this._armState      = null;  // null | 'blocked' | 'instruction' | 'pulling' | 'done'
    this._armPressCount = 0;

    // Charge-shot state (available once armed arm is retrieved)
    this._chargingShot = false;
    this._chargeStart  = 0;
    this._chargeFired  = false;
    this._chargeAngle  = 5;
  }

  update() {
    const r = this.robot;

    if (!this._awake && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this._wakeCount++;
      r.flickerEye();
      if (this._wakeCount === 8) {
        this._wakeUp(r);
        // Don't let this same keypress also trigger get-up below
        r.setMoveIntent(0);
        r.update(this.game.loop.delta);
        return;
      }
    }

    // debug: test the get up
    if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
      this._wakeUp(r);
      r.getUp();
      if (!this._zoomedOut) {
        this._zoomedOut = true;
        this._zoomOut();
      }
    }

    // debug: teleport robot ±200px + position display
    if (this._debug) {
      if (Phaser.Input.Keyboard.JustDown(this.keyPageDown)) {
        r.body_proxy.setX(r.body_proxy.x + 200);
      } else if (Phaser.Input.Keyboard.JustDown(this.keyPageUp)) {
        r.body_proxy.setX(r.body_proxy.x - 200);
      }
      this._debugText.setText(`x:${Math.round(r.x)}`);
    }

    // Block all movement until the robot is awake
    if (!this._awake) {
      r.setMoveIntent(0);
      r.update(this.game.loop.delta);
      return;
    }

    if (r.state === RobotState.LYING) {
      // ── Leg interaction trigger ───────────────────────────────────────
      if (this._awake && this._legState === null) {
        const headWorldX = r.x + r.head.x * Math.abs(r.scaleX);
        if (headWorldX >= this._deadRobot.x - 10) {
          this._startLegInteraction();
        }
      }

      if (this._legState !== null) {
        // Blocked at dead robot — stop all forward movement
        r.body_proxy.body.setVelocityX(0);
        r.setMoveIntent(0);

        // ↑ / ↓ counting during instruction phase
        if (this._legState === 'instruction') {
          const pull = Phaser.Input.Keyboard.JustDown(this.cursors.up)
                    || Phaser.Input.Keyboard.JustDown(this.cursors.down);
          if (pull) {
            this._legPressCount++;
            // Brief lurch (player robot strains)
            r.body_proxy.body.setVelocityX(25);
            this.time.delayedCall(120, () => r.body_proxy.body.setVelocityX(0));
            this._deadRobot.shake();

            if (this._legPressCount >= 3) {
              this._legState = 'pulling';
              this.game.events.emit('instr-hide');
              this._deadRobot.removeLeg(() => {
                this._deadRobot.collapse();
                this.time.delayedCall(1000, () => {
                  this._legState = 'done';
                  this.robot.shake(() => {
                    this.robot.getUp();
                    if (!this._zoomedOut) {
                      this._zoomedOut = true;
                      this._zoomOut();
                    }
                  });
                });
              });
            }
          }
        }
      } else {
        // Normal crawl
        this._tickCrawlSequence(r);
        r.setMoveIntent(this.time.now < this._crawlActiveUntil ? 1 : 0);
      }

      // SPACE: continue dialogue if active
      if (Phaser.Input.Keyboard.JustDown(this.keySpace) && this._dlgWaiting) {
        this._dialogueContinue();
      }
    } else {
      const canMove = !this._robotWaiting
        && (r.state === RobotState.STANDING || r.state === RobotState.WALKING);
      if (canMove) {
        const left  = this.cursors.left.isDown  || this.keyA.isDown || this.keyQ.isDown;
        const right = this.cursors.right.isDown || this.keyD.isDown;
        if (left && !right)      r.setMoveIntent(-1);
        else if (right && !left) r.setMoveIntent(1);
        else                     r.setMoveIntent(0);
      } else {
        r.setMoveIntent(0);
      }

      // SPACE: continue dialogue if active while standing/walking (not while charging)
      if (!this._chargingShot && Phaser.Input.Keyboard.JustDown(this.keySpace) && this._dlgWaiting) {
        this._dialogueContinue();
      }

      // Auto-dismiss standup dialogue 2s after the robot starts walking
      if (this._dlgDismissOnWalk && this._dlgWaiting && r.state === RobotState.WALKING) {
        this._dlgDismissOnWalk = false;
        this.time.delayedCall(2000, () => {
          if (this._dlgWaiting) this._dialogueContinue();
        });
      }

      this._inFrontOfSkulls();
      this._checkComputerProximity();
      this._checkArmProximity();

      if (this._armState === 'done' && !this._robotWaiting && !this._dlgWaiting) {
        this._tickChargeShot(r);
      }

      // ── Arm pulling (↑↓) ───────────────────────────────────────────────
      if (this._armState === 'instruction') {
        const pull = Phaser.Input.Keyboard.JustDown(this.cursors.up)
                  || Phaser.Input.Keyboard.JustDown(this.cursors.down);
        if (pull) {
          this._armPressCount++;
          this._armedDeadRobot.shake();
          r.body_proxy.body.setVelocityX(-15);
          this.time.delayedCall(120, () => r.body_proxy.body.setVelocityX(0));

          if (this._armPressCount >= 3) {
            this._armState = 'pulling';
            this.game.events.emit('instr-hide');
            this._armedDeadRobot.removeArm(() => {
              this._armedDeadRobot.collapse();
              this.time.delayedCall(1000, () => {
                this._armState = 'done';
                this.robot.shake(() => {
                  this._startDialogue(i18n.dialogueArmDone, () => {
                    this._robotWaiting = false;
                  });
                });
              });
            });
          }
        }
      }
    }

    r.update(this.game.loop.delta);

    if (this._chargingShot) {
      this._chargeAngle = Phaser.Math.Linear(this._chargeAngle, -90, 0.15);
      r.upperArmR.setAngle(this._chargeAngle);
      if (this._chargeStripe) {
        const progress = Math.min((this.time.now - this._chargeStart) / 1000, 1);
        const h = Math.max(1, Math.round(progress * 10));
        this._chargeStripe.setSize(1, h);
      }
    }

    const headWorldX = r.x + r.head.x * r.scaleX;
    const headWorldY = r.y + r.head.y * r.scaleY;
    this._surveillanceCams.forEach(cam => cam.checkHead(headWorldX, headWorldY));

    this._checkSkullCollision();
    this._npcRobots.forEach(npc => npc.npcUpdate(this.game.loop.delta, this.robot.x));
  }

  _inFrontOfSkulls() {
    if (this._skullDialogueDone || this._pyramidTriggered || !this._skulls.length) return;

    const r = this.robot;
    const proxyRight = r.body_proxy.body.right;
    const gap = this._skulls[0].proxy.body.left - proxyRight;
    if (gap < 20 && gap > 1) {
      this._startSkullInteraction();
    }
  }

  /**
   * Build a pyramid of skulls: 8 at base, 7 on top, …, 1 at apex.
   * @param {number} centerX   world x of the pyramid centre
   * @param {number} groundY   world y of the surface (skull bases rest here)
   * @param groundBody         static Arcade body used for colliders
   */
  _buildSkullPyramid(centerX, groundY, groundBody) {
    const ROWS    = 8;
    const SKULL_W = 16;   // visual / spacing width
    const SKULL_H = 14;   // row height (proxy height)

    for (let row = 0; row < ROWS; row++) {
      const count = ROWS - row;           // 8, 7, 6 … 1
      const y     = groundY - row * SKULL_H + 3;
      // Centre the row horizontally
      const startX = centerX - ((count - 1) * SKULL_W) / 2;

      for (let col = 0; col < count; col++) {
        const x = startX + col * SKULL_W;
        const skull = new Skull(this, x, y);
        this.physics.add.collider(skull.proxy, groundBody);
        this._skulls.push(skull);
      }
    }
  }

  /**
   * Detect when the robot contacts the front skull in the pyramid and
   * trigger a ripple collapse.
   */
  _checkSkullCollision() {
    if (this._pyramidTriggered || !this._skulls.length) return;

    const r  = this.robot;
    const vx = r.body_proxy.body.velocity.x;
    if (vx <= 0) return;   // only trigger on rightward movement

    // Rightmost extent of the robot
    const proxyRight = r.body_proxy.body.right;
    const headRight  = r.x + (r.head.x + r.head.width / 2) * Math.abs(r.scaleX);
    const robotRight = Math.max(proxyRight, headRight);

    for (const skull of this._skulls) {
      if (skull._activated) continue;
      const gap = skull.proxy.body.left - robotRight;
      if (gap < 4 && gap > -12) {
        this._startDialogue(i18n.dialogueSkullFall);

        this._pyramidTriggered = true;
        this._triggerCascade(skull);
        return;
      }
    }
  }

  /**
   * Ripple collapse: skulls closer to the hit point fly first.
   * Delay per skull = distance × 8 ms.  Direction = away from hit point.
   * @param {Skull} hitSkull   the skull the robot first touched
   */
  _triggerCascade(hitSkull) {
    const hx = hitSkull.x;
    const hy = hitSkull.y;

    for (const skull of this._skulls) {
      const dx    = skull.x - hx;
      const dy    = skull.y - hy;
      const dist  = Math.sqrt(dx * dx + dy * dy);
      const delay = dist * 8;
      const angle = Math.atan2(dy, dx);

      this.time.delayedCall(delay, () => {
        skull.push(1 + (1 / (dist + 1)), angle);
      });
    }
  }

  /**
   * Zoom ×4 → ×2, keeping ground anchored at screen bottom.
   * startFollow stays active for X; followOffset.y is recalculated
   * each tween frame so scrollY = VH − viewH stays exact.
   * Starts immediately when the robot begins getting up.
   */
  _zoomOut() {
    const cam     = this.cameras.main;
    const WORLD_W = 3000;

    // Allow camera to scroll into negative world-Y (empty space above world)
    cam.setBounds(0, -720, WORLD_W, 900);

    // Tween a plain proxy — tweening cam.zoom directly is unreliable
    // (Phaser stores zoom internally as _zoomX/_zoomY in newer versions)
    const proxy = { zoom: cam.zoom };
    this.tweens.add({
      targets:  proxy,
      zoom:     3,
      duration: 2800,   // covers the full get-up animation (≈ 2850 ms)
      ease:     'Sine.InOut',
      onUpdate: () => {
        cam.setZoom(proxy.zoom);
        const viewH = 720 / proxy.zoom;
        // Keep ground (VH) at screen bottom: scrollY = VH − viewH
        // Via follow: scrollY = robot.y − viewH/2 + offsetY → offsetY = VH − viewH/2 − robot.y
        cam.setFollowOffset(-80, viewH / 2 - this.robot.y);
      },
    });
  }

  /** Called once after 8 space presses — activates the robot. */
  _wakeUp(r) {
    this._awake = true;
    r.activate();
    this.game.events.emit('instruction-hide');
    this.time.delayedCall(2000, () => this._startDialogue(i18n.dialogueWakeup));
  }

  // ─── Dialogue system ──────────────────────────────────────────────────────

  /**
   * Play a sequence of robot lines one at a time.
   * After 2s each, show "Presser espace pour continuer" — unless the player
   * already advanced before the 2s timer fires.
   * @param {string[]} lines
   */
  /** Trigger the leg-retrieval sequence. */
  _startLegInteraction() {
    this._legState      = 'blocked';
    this._legPressCount = 0;
    // Stop any crawl momentum
    this.robot.body_proxy.body.setVelocityX(0);
    this._crawlActiveUntil = 0;
    this._startDialogue(i18n.dialogueLeg, () => {
      this._legState = 'instruction';
      this.game.events.emit('instr-show', { text: i18n.instructionLeg });
    });
  }

  /** Trigger the arm-retrieval sequence (standing robot). */
  _checkArmProximity() {
    if (this._armState !== null) return;
    const r   = this.robot;
    const gap = this._armedDeadRobot.x - r.body_proxy.body.right;
    if (gap < 30 && gap > -50) {
      this._startArmInteraction();
    }
  }

  _startArmInteraction() {
    this._armState      = 'blocked';
    this._armPressCount = 0;
    this._robotWaiting  = true;
    this.robot.setMoveIntent(0);
    this.robot.body_proxy.body.setVelocityX(0);
    this._startDialogue(i18n.dialogueArm, () => {
      this._armState = 'instruction';
      this.game.events.emit('instr-show', { text: i18n.instructionArm });
    });
  }

  /** Trigger the skull sequence — freezes the robot until the dialogue is dismissed. */
  _startSkullInteraction() {
    this._skullDialogueDone = true;  // prevent re-triggering this dialogue
    this._robotWaiting      = true;
    this.robot.setMoveIntent(0);
    this.robot.body_proxy.body.setVelocityX(0);
    this._startDialogue(i18n.dialogueSkullsFound, () => {
      this._robotWaiting = false;
    });
  }

  /** Trigger when the robot reaches the computer wall. */
  _checkComputerProximity() {
    if (this._computerState !== null) return;
    const r = this.robot;
    const gap = this._computer.x - r.body_proxy.body.right;
    if (gap < 10 && gap > -10) {
      this._startComputerInteraction();
    }
  }

  _startComputerInteraction() {
    this._computerState = 'active';
    this._robotWaiting  = true;
    this.robot.setMoveIntent(0);
    this.robot.body_proxy.body.setVelocityX(0);

    // Phase 1 — robot spots the computer
    this._startDialogue(i18n.dialogueComputer1, () => {
      // Space pressed → start blinking screen, then 2s later: second dialogue
      this._computer.startHacking();
      this.time.delayedCall(2000, () => {
        this._startDialogue(i18n.dialogueComputer2, () => {
          // Space pressed → restore movement
          this._computer.stopHacking();
          this._computerState = 'done';
          this._robotWaiting  = false;
        });
      });
    });
  }

  /**
   * Play a sequence of robot lines one at a time.
   * @param {Array<{text:string,speak:boolean}>} lines
   * @param {(() => void) | null} [onComplete]  called when all lines are done
   */
  _startDialogue(lines, onComplete = null) {
    this._dlgLines      = lines;
    this._dlgIndex      = 0;
    this._dlgWaiting    = false;
    this._dlgTimer      = null;
    this._dlgInstrOn    = false;
    this._dlgOnComplete = onComplete;
    this._dlgPlayLine();
  }

  _dlgPlayLine() {
    const line = this._dlgLines[this._dlgIndex];
    this._dlgWaiting = false;
    this._robotSpeak(line.text, { keepVisible: true, speak: line.speak });

    // Show "press space" 2s after line starts, unless already advanced
    this._dlgTimer = this.time.delayedCall(2000, () => {
      if (!this._dlgWaiting) return;  // already advanced
      this._dlgInstrOn = true;
      this.game.events.emit('instr-show', { text: i18n.instructionContinue });
    });

    this._dlgWaiting = true;
  }

  /** Called from update() when SPACE is pressed during active dialogue. */
  _dialogueContinue() {
    this._dlgWaiting = false;

    if (this._dlgTimer) { this._dlgTimer.remove(); this._dlgTimer = null; }

    if (this._dlgInstrOn) {
      this.game.events.emit('instr-hide');
      this._dlgInstrOn = false;
    }

    this._dlgIndex++;
    if (this._dlgIndex < this._dlgLines.length) {
      this._dlgPlayLine();
    } else {
      this._dlgLines   = null;
      this._dlgWaiting = false;
      this.game.events.emit('subtitle-hide');
      if (this._dlgOnComplete) {
        const cb = this._dlgOnComplete;
        this._dlgOnComplete = null;
        cb();
      }
    }
  }

  /**
   * Speak a line using the browser's speech synthesis with a robotic voice.
   * Prefers a French voice; falls back to whatever is available.
   * @param {string} text
   * @param {{ keepVisible?: boolean, speak?: boolean }} opts
   *   keepVisible — don't auto-hide subtitle when speech ends
   *   speak       — pass false to show subtitle only, skip voice synthesis (default true)
   */
  _robotSpeak(text, { keepVisible = false, speak = true } = {}) {
    // Cancel any ongoing speech before starting a new line
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    this.game.events.emit('subtitle-show', { text });

    const fadeOut = () => {
      if (!keepVisible) this.game.events.emit('subtitle-hide');
    };

    if (!speak || this._silent || !window.speechSynthesis) {
      if (!keepVisible) this.time.delayedCall(4000, fadeOut);
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang   = i18n.speechLang;    // e.g. 'fr-FR' or 'en-US'
    utter.rate   = 0.6;  // slow and laboured
    utter.pitch  = 0.1;  // very low = robotic
    utter.volume = 1;
    utter.onend  = fadeOut;

    const applyVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const voice  = voices.find(v => v.lang.startsWith(i18n.speechLangPrefix));
      if (voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      applyVoice();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', applyVoice, { once: true });
    }
  }

  /**
   * Crawl combo while the robot is lying: alternating right / left.
   * Sequence: right(0) → left(1) → right(0) → …
   * Each valid step extends the active window by ACTIVE_MS (animation + velocity).
   * A wrong key cuts the window immediately and resets the sequence.
   * No input for ACTIVE_MS → window expires naturally, animation freezes.
   */
  _tickCrawlSequence(r) {
    const K     = Phaser.Input.Keyboard;
    const right = K.JustDown(this.cursors.right) || K.JustDown(this.keyD);
    const left  = K.JustDown(this.cursors.left)  || K.JustDown(this.keyA) || K.JustDown(this.keyQ);
    const any   = right || left;

    const ACTIVE_MS = 250; // animation/velocity window per step

    const ok = (nextStep) => {
      this._crawlStep        = nextStep;
      this._crawlActiveUntil = this.time.now + ACTIVE_MS;
    };
    const fail = () => {
      this._crawlStep        = 0;
      this._crawlActiveUntil = 0; // stop immediately
    };

    switch (this._crawlStep) {
      case 0: if (right) ok(1); else if (any) fail(); break;
      case 1: if (left)  ok(0); else if (any) fail(); break;
    }
  }

  _tickChargeShot(r) {
    if (!this.keySpace.isDown) {
      if (this._chargingShot) this._cancelCharge(r);
      return;
    }
    if (!this._chargingShot) {
      this._startCharge(r);
      return;
    }
    if (!this._chargeFired && this.time.now - this._chargeStart >= 1000) {
      this._chargeFired = true;
      this._firePlayerShot(r);
    }
  }

  _startCharge(r) {
    this._chargingShot = true;
    this._chargeStart  = this.time.now;
    this._chargeFired  = false;
    this._chargeAngle  = r.upperArmR.angle ?? 5;

    // Replace plain arm rect with sub-container holding arm + red stripe
    const savedPos = { x: r.upperArmR.x, y: r.upperArmR.y };
    const savedAng = r.upperArmR.angle;
    r.remove(r.upperArmR, true);

    const armRect   = this.add.rectangle(0, 0, 3, 10, 0xeeeeee).setOrigin(0.5, 0);
    const armStripe = this.add.rectangle(1, 0, 1, 1, 0xff2200).setOrigin(0.5, 0);
    const armCont   = this.add.container(savedPos.x, savedPos.y, [armRect, armStripe]);
    armCont.setAngle(savedAng);
    r.add(armCont);
    r.upperArmR    = armCont;
    this._chargeStripe = armStripe;
  }

  _cancelCharge(r) {
    if (!this._chargingShot) return;
    this._chargingShot  = false;
    this._chargeStripe  = null;
    this._restoreArm(r, true);
  }

  _restoreArm(r, tween = false) {
    if (!r.upperArmR) return;
    const pos = { x: r.upperArmR.x, y: r.upperArmR.y };
    const ang = r.upperArmR.angle;
    r.remove(r.upperArmR, true);
    const newArm = this.add.rectangle(0, 0, 3, 10, 0xeeeeee).setOrigin(0.5, 0);
    newArm.setPosition(pos.x, pos.y);
    newArm.setAngle(ang);
    r.add(newArm);
    r.upperArmR    = newArm;
    this._chargeAngle  = ang;
    this._chargeStripe = null;
    if (tween) {
      this.tweens.add({ targets: newArm, angle: 5, duration: 300, ease: 'Sine.easeOut' });
    }
  }

  _firePlayerShot(r) {
    this._restoreArm(r);
    this._chargingShot = false;

    // Fire horizontally from arm-tip world position
    const startX = r.x + (r.facingRight ? 10 : -10);
    const startY = r.y - 54;
    const targetX = r.facingRight ? 4000 : -400;

    const dist = Math.abs(targetX - startX);
    const duration = (dist / 500) * 1000;

    const bolt = this.add.rectangle(startX, startY, 8, 2, 0xffffff);
    bolt.setAngle(r.facingRight ? 0 : 180);
    bolt.setDepth(20);

    // Hit the first non-destroyed NPC in the firing direction
    const dir = r.facingRight ? 1 : -1;
    const firstNpc = this._npcRobots
      .filter(n => !n._destroyed
        && Math.sign(n.x - startX) === dir
        && Math.abs(n.x - r.x) < 300)
      .sort((a, b) => dir * (a.x - b.x))[0];

    if (firstNpc) {
      const hitTime = (Math.abs(firstNpc.x - startX) / 500) * 1000;
      this.time.delayedCall(hitTime, () => this._npcRobotExplode(firstNpc));
    }

    this.tweens.add({
      targets:  bolt,
      x:        targetX,
      duration,
      ease:     'Linear',
      onComplete: () => bolt.destroy(),
    });
  }

  _npcRobotExplode(npc) {
    if (npc._destroyed) return;
    npc._destroyed = true;
    npc._fired = true;
    npc.setMoveIntent(0);
    if (npc._fireTimer) { npc._fireTimer.remove(); npc._fireTimer = null; }

    this._spawnExplosion(npc.x, npc.y - 20);

    this.tweens.add({
      targets:  npc,
      alpha:    0,
      duration: 200,
      ease:     'Linear',
      onComplete: () => npc.setVisible(false),
    });
  }

  _npcShoot(npc, npcX, npcY, facingRight) {
    if (npc._destroyed) return;
    const startX = npcX + (facingRight ? 14 : -14);
    const startY = npcY - 35;
    const dist   = Math.abs(this.robot.x - startX);

    const bolt = this.add.rectangle(startX, startY, 8, 2, 0xffffff);
    bolt.setDepth(20);

    this.tweens.add({
      targets:  bolt,
      x:        this.robot.x,
      duration: (dist / 400) * 1000,
      ease:     'Linear',
      onComplete: () => {
        bolt.destroy();
        this._robotExplode();
      },
    });
  }

  _spawnExplosion(cx, cy) {
    if (!this.textures.exists('pixel_spark')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 1, 1);
      g.generateTexture('pixel_spark', 1, 1);
      g.destroy();
    }
    const emitter = this.add.particles(0, 0, 'pixel_spark', {
      speed:    { min: 40, max: 150 },
      angle:    { min: 0, max: 360 },
      scale:    { start: 5, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: 800,
      emitting: false,
    });
    emitter.setDepth(30);
    emitter.explode(200, cx, cy);
    this.time.delayedCall(900, () => emitter.destroy());
  }

  _robotExplode() {
    const r = this.robot;
    r.setMoveIntent(0);
    if (r.body_proxy && r.body_proxy.body) /** @type {Phaser.Physics.Arcade.Body} */ (r.body_proxy.body).setVelocityX(0);
    this._robotWaiting = true;

    this._spawnExplosion(r.x, r.y - 20);
    r.setAlpha(0);

    // Fadeout then respawn at nearest checkpoint behind explosion
    const CHECKPOINTS = [900, 1300, 2400];
    const spawnX = [...CHECKPOINTS].reverse().find(cpX => cpX < r.x) ?? 200;

    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const gy = this._groundY;
      r.setPosition(spawnX, gy);
      r.body_proxy.setPosition(spawnX, gy - 42);
      /** @type {Phaser.Physics.Arcade.Body} */ (r.body_proxy.body).setVelocity(0, 0);
      r.facingRight = true;
      r.setScale(3, 3);
      r.setAlpha(1);
      this._robotWaiting = false;
      this._surveillanceCams.forEach(cam => cam.reset());
      this._npcRobots.forEach(npc => { if (!npc._destroyed) npc.reset(); });
      this._cancelCharge(r);

      this.cameras.main.fadeIn(1000, 0, 0, 0);
    });
  }
}
