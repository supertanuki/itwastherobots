import Phaser from 'phaser';
import Robot, { RobotState } from '../entities/Robot.js';
import Skull from '../entities/Skull.js';
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
    this.physics.add.collider(this.robot.body_proxy, groundBody);

    // ── Skull ─────────────────────────────────────────────────────────────
    this._skull       = new Skull(this, 300, GROUND_Y);
    this._skullPushed = false;
    this.physics.add.collider(this._skull.proxy, groundBody);

    // ── Silent mode — ?nosounds in URL disables all audio ────────────────
    this._silent = new URLSearchParams(window.location.search).has('nosounds');

    // ── Wake-up state ─────────────────────────────────────────────────────
    this._wakeCount = 0;   // space presses so far
    this._awake     = false;

    // ── Camera follows the robot ──────────────────────────────────────────
    this.cameras.main.startFollow(this.robot, true);
    // Negative offset → camera leads right, robot appears ~1/4 from left
    this.cameras.main.setFollowOffset(-80, 0);

    this._zoomedOut = false;

    // ── Input ─────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyQ    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyS    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyM    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    // Crawl combo state (lying only): right → down → left → up
    this._crawlStep        = 0;  // current position in the 4-step combo
    this._crawlActiveUntil = 0;  // animation + velocity play while time.now < this value
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
      r.getUp();
      if (!this._zoomedOut) {
        this._zoomedOut = true;
        this._zoomOut();
      }
    }

    // Block all movement until the robot is awake
    if (!this._awake) {
      r.setMoveIntent(0);
      r.update(this.game.loop.delta);
      return;
    }

    if (r.state === RobotState.LYING) {
      // ── Crawl combo: right → down → left → up ──────────────────────────
      // Each valid step gives a small forward pulse; input is always checked.
      this._tickCrawlSequence(r);
      r.setMoveIntent(this.time.now < this._crawlActiveUntil ? 1 : 0);

      // SPACE: continue dialogue if active
      if (Phaser.Input.Keyboard.JustDown(this.keySpace) && this._dlgWaiting) {
        this._dialogueContinue();
      }
    } else {
      const canMove = r.state === RobotState.STANDING || r.state === RobotState.WALKING;
      if (canMove) {
        const left  = this.cursors.left.isDown  || this.keyA.isDown || this.keyQ.isDown;
        const right = this.cursors.right.isDown || this.keyD.isDown;
        if (left && !right)      r.setMoveIntent(-1);
        else if (right && !left) r.setMoveIntent(1);
        else                     r.setMoveIntent(0);
      } else {
        r.setMoveIntent(0);
      }
    }

    r.update(this.game.loop.delta);

    this._checkSkullCollision();
  }

  /**
   * Detect when the robot (Arcade) crawls into the skull (Matter) and
   * apply a one-shot impulse via Matter.Body.setVelocity.
   */
  _checkSkullCollision() {
    if (!this._skull) return;

    const r  = this.robot;
    const vx = r.body_proxy.body.velocity.x;

    // Rightmost extent of the robot: max of physics proxy right edge and head right edge.
    // Head local x = 9, width = 6 → world right = robot.x + (9 + 3) * |scaleX| = robot.x + 36
    const proxyRight = r.body_proxy.body.right;
    const headRight  = r.x + (r.head.x + r.head.width / 2) * Math.abs(r.scaleX);
    const robotRight = Math.max(proxyRight, headRight);

    // Left edge of skull physics body
    const skullLeft = this._skull.proxy.body.left;
    const gap       = skullLeft - robotRight;

    if (gap < 4 && gap > -12 && vx > 0 && !this._skullPushed) {
      this._skullPushed = true;
      this._skull.push(1);
    } else if (gap > 15) {
      this._skullPushed = false;
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
    const VH      = 180;
    const WORLD_W = 3000;

    // Allow camera to scroll into negative world-Y (empty space above world)
    cam.setBounds(0, -720, WORLD_W, 900);

    // Tween a plain proxy — tweening cam.zoom directly is unreliable
    // (Phaser stores zoom internally as _zoomX/_zoomY in newer versions)
    const proxy = { zoom: cam.zoom };
    this.tweens.add({
      targets:  proxy,
      zoom:     2,
      duration: 2800,   // covers the full get-up animation (≈ 2850 ms)
      ease:     'Sine.InOut',
      onUpdate: () => {
        cam.setZoom(proxy.zoom);
        const viewH = 720 / proxy.zoom;
        // Keep ground (VH) at screen bottom: scrollY = VH − viewH
        // Via follow: scrollY = robot.y − viewH/2 + offsetY → offsetY = VH − viewH/2 − robot.y
        cam.setFollowOffset(-80, VH - viewH / 2 - this.robot.y);
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
  _startDialogue(lines) {
    this._dlgLines   = lines;
    this._dlgIndex   = 0;
    this._dlgWaiting = false;      // true while waiting for SPACE
    this._dlgTimer   = null;       // delayed-call handle for instruction banner
    this._dlgInstrOn = false;      // true while instruction banner is visible
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
      // Dialogue finished — hide subtitle and unlock get-up
      this._dlgLines   = null;
      this._dlgWaiting = false;
      this.game.events.emit('subtitle-hide');
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
}
