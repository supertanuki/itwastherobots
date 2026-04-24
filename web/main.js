import Phaser from 'phaser';
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
  const gs = game.scene.getScene('GameScene');
  gs.events.once('create', async () => {
    Wavedash.updateLoadProgressZeroToOne(1);
    await Wavedash.init();
  });
});
