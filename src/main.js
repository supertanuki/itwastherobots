import Phaser from 'phaser';
import TestScene from './scenes/TestScene.js';

// Virtual resolution — pixel art world
// Camera zoom x4 means 1 pixel here = 4 pixels on screen
const VIRTUAL_W = 320;
const VIRTUAL_H = 180;

const config = {
  type: Phaser.AUTO,
  width: VIRTUAL_W * 4,   // 1280
  height: VIRTUAL_H * 4,  // 720
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,          // disables anti-aliasing, keeps pixels sharp
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 400 },
      debug: false,
    },
  },
  scene: [TestScene],
};

new Phaser.Game(config);
