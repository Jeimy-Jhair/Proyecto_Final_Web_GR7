import Phaser from 'phaser';
import Button from '../ui/Button.js';
import AudioToggle from '../ui/AudioToggle.js';
import { drawSteppedBox } from '../ui/PixelArt.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init() {
    this.transitioning = false;
  }

  create() {
    this.transitioning = false;
    const { width, height } = this.scale;
    const audioManager = this.registry.get('audioManager');

    this.add.rectangle(0, 0, width, height, 0x030712, 0.85).setOrigin(0);

    const boxWidth = Math.min(380, width - 40);
    const boxHeight = 360;
    const boxX = (width - boxWidth) / 2;
    const boxY = (height - boxHeight) / 2;

    const dialogGraphics = this.add.graphics();
    drawSteppedBox(dialogGraphics, boxX, boxY, boxWidth, boxHeight, {
      fillColor: 0x0a0f24,
      fillAlpha: 0.98,
      borderColor: 0x22d3ee,
      borderWidth: 2,
      cornerStep: 4,
      shadowOffset: 6,
      shadowColor: 0x020617,
      accentColor: 0x38bdf8
    });

    this.add.image(width / 2, boxY + 36, 'game_logo')
      .setOrigin(0.5)
      .setScale(0.1);

    this.add.text(width / 2, boxY + 76, 'PAUSA', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#facc15',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    this.resumeButton = new Button(this, width / 2, boxY + 126, 'CONTINUAR', () => this.resumeGame(), {
      width: 240,
      height: 44,
      fontSize: 11,
      icon: 'play',
      baseColor: 0x075985,
      hoverColor: 0x0284c7
    });

    this.restartButton = new Button(this, width / 2, boxY + 182, 'REINICIAR', () => this.restartGame(), {
      width: 240,
      height: 44,
      fontSize: 11,
      icon: 'retry',
      baseColor: 0x1e1b4b,
      hoverColor: 0x312e81
    });

    this.menuButton = new Button(this, width / 2, boxY + 238, 'MENÚ', () => this.goToMenu(), {
      width: 240,
      height: 44,
      fontSize: 11,
      icon: 'back',
      baseColor: 0x1e293b,
      hoverColor: 0x334155
    });

    this.audioToggle = new AudioToggle(this, width / 2, boxY + 298, audioManager, {
      width: 140,
      height: 40,
      showLabel: true
    });

    this.add.text(width / 2, boxY + boxHeight + 18, '[P / ESC] CONTINUAR', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#64748b',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-P', this.resumeGame, this);
    this.input.keyboard.on('keydown-ESC', this.resumeGame, this);
    this.events.once('shutdown', this.cleanup, this);
  }

  resumeGame() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  restartGame() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
  }

  goToMenu() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }

  cleanup() {
    this.transitioning = false;
    this.input.keyboard.off('keydown-P', this.resumeGame, this);
    this.input.keyboard.off('keydown-ESC', this.resumeGame, this);
    this.resumeButton?.destroy();
    this.restartButton?.destroy();
    this.menuButton?.destroy();
    this.audioToggle?.destroy();
  }
}
