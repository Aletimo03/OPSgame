// js/game.js
// Main Phaser 3 bootstrap / configuration.
// Phaser itself is loaded globally from the CDN (see index.html).

import WorldScene from './scenes/WorldScene.js';
import BattleScene from './scenes/BattleScene.js';

const config = {
  type: Phaser.AUTO,          // WebGL when available, falls back to Canvas
  pixelArt: true,             // keeps Gen-5 style sprites crisp (no blurring)
  backgroundColor: '#1d1d24',

  // Fill the whole browser window and follow window resizes.
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%',
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // top-down RPG: no gravity
      debug: false,            // flip to true to see physics bodies/bounds
    },
  },

  scene: [WorldScene, BattleScene], // WorldScene renders any map; BattleScene overlays for fights
};

// Kick off the game.
const game = new Phaser.Game(config);

// Expose for quick debugging in the browser console (e.g. window.game.scene).
window.game = game;

export default game;
