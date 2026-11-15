import Phaser from 'phaser';
import Boot from './scenes/Boot.js';
import Preloader from './scenes/Preloader.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

/**
 * Configuración inicial del juego.
 * - Físicas: Arcade
 * - Game loop optimizado: mínimo 45 FPS, objetivo 60 FPS.
 */
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  // Optimización estricta del game loop
  fps: {
    target: 60,        // FPS objetivo
    min: 45,           // Mínimo de FPS aceptable
    forceSetTimeOut: false, // Usar requestAnimationFrame para mayor fluidez
    deltaHistory: 10,
    panicMax: 120,
    smoothStep: true
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  scene: [Boot, Preloader, MenuScene, GameScene, PauseScene, GameOverScene]
};

const game = new Phaser.Game(config);

export default game;
