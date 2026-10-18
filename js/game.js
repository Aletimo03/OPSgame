// js/game.js
// Main Phaser 3 bootstrap / configuration.
// Phaser itself is loaded globally from the CDN (see index.html).

import IntroScene from './scenes/IntroScene.js';
import TitleScene from './scenes/TitleScene.js';
import WorldScene from './scenes/WorldScene.js';
import BattleScene from './scenes/BattleScene.js';
import EndingScene from './scenes/EndingScene.js';
import FridgeScene from './scenes/FridgeScene.js';
import CutsceneScene from './scenes/CutsceneScene.js';
import DanceScene from './scenes/DanceScene.js';

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

  // IntroScene boots first (logo intro, skippable), then TitleScene (Continua / Nuova partita) and starts WorldScene,
  // which renders any map; BattleScene overlays it for fights; EndingScene
  // shows the credits once the last chapter is done.
  scene: [IntroScene, TitleScene, WorldScene, BattleScene, FridgeScene, CutsceneScene, DanceScene, EndingScene],
};

// Kick off the game.
const game = new Phaser.Game(config);

// Expose for quick debugging in the browser console (e.g. window.game.scene).
window.game = game;

export default game;
