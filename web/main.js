import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.85.0/dist/phaser.esm.js';
import GameScene from './src/scenes/GameScene.js';
import UIScene   from './src/scenes/UIScene.js';

const Wavedash = await window.Wavedash;

const VIRTUAL_W = 320;
const VIRTUAL_H = 180;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  pixelArt: true,
  input: { activePointers: 3 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:  VIRTUAL_W * 4,   // 1280
    height: VIRTUAL_H * 4,   // 720
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 400 }, debug: false },
  },
  scene: [GameScene, UIScene],
};

const game = new Phaser.Game(config);

game.events.once('ready', () => {
  // Rend le canvas focusable et le maintient focused pour les événements clavier
  // (nécessaire dans une iframe cross-origin où window.focus() est bloqué)
  const canvas = game.canvas;
  canvas.tabIndex = 1;
  canvas.style.outline = 'none';
  canvas.focus();
  document.addEventListener('pointerdown', () => canvas.focus(), { passive: true });

  const gs = game.scene.getScene('GameScene');
  gs.events.once('create', async () => {
    Wavedash.updateLoadProgressZeroToOne(1);
    await Wavedash.init();
    canvas.focus();
  });
});
