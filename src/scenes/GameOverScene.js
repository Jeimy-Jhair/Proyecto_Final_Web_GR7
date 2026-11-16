import Phaser from 'phaser';
import AudioManager from '../managers/AudioManager.js';
import StorageManager from '../managers/StorageManager.js';
import Button from '../ui/Button.js';
import AudioToggle from '../ui/AudioToggle.js';
import { createSpaceBackdrop } from '../ui/SpaceBackdrop.js';
import { drawSteppedBox } from '../ui/PixelArt.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalData = data || {};
    this.transitioning = false;
  }

  create() {
    this.transitioning = false;
    this.cameras.main.fadeIn(150, 5, 7, 22);
    this.backdrop = createSpaceBackdrop(this, { color: 0x180718 });
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
    this.registry.set('audioManager', audioManager);
    audioManager.playMusic('musica-menu');
    this.events.once('shutdown', this.cleanup, this);

    const { width, height } = this.scale;
    const score = this.finalData.score ?? 0;
    const level = this.finalData.level ?? 1;
    const wave = this.finalData.wave ?? 1;
    const highScore = StorageManager.getHighScore();
    const newRecord = Boolean(this.finalData.newRecord);

    const padScore = String(Math.max(0, score)).padStart(6, '0');
    const padHigh = String(Math.max(0, highScore)).padStart(6, '0');
    const padLevel = String(Math.max(1, level)).padStart(2, '0');
    const padWave = String(Math.max(1, wave)).padStart(2, '0');

    this.add.image(width / 2, height * 0.10, 'game_logo')
      .setOrigin(0.5)
      .setScale(0.12);

    this.add.text(width / 2, height * 0.22, 'FIN DEL JUEGO', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: width < 600 ? '18px' : '26px',
      color: '#f87171',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    const boxWidth = Math.min(420, width - 40);
    const boxHeight = 175;
    const boxX = (width - boxWidth) / 2;
    const boxY = height * 0.32;

    const statsGraphics = this.add.graphics();
    drawSteppedBox(statsGraphics, boxX, boxY, boxWidth, boxHeight, {
      fillColor: 0x0a0f24,
      fillAlpha: 0.95,
      borderColor: 0xf87171,
      borderWidth: 2,
      cornerStep: 4,
      shadowOffset: 4,
      shadowColor: 0x020617,
      accentColor: 0xfb7185
    });

    const statLines = [
      `PUNTOS    ${padScore}`,
      `RÉCORD    ${padHigh}`,
      `NIVEL     ${padLevel}`,
      `OLEADA    ${padWave}`
    ];

    this.add.text(width / 2, boxY + boxHeight / 2 - 8, statLines.join('\n'), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#e0f2fe',
      align: 'center',
      lineSpacing: 10,
      resolution: 2
    }).setOrigin(0.5);

    if (newRecord) {
      const recordText = this.add.text(width / 2, boxY + boxHeight - 20, '★ ¡NUEVO RÉCORD! ★', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#facc15',
        align: 'center',
        resolution: 2
      }).setOrigin(0.5);

      this.tweens.add({
        targets: recordText,
        alpha: 0.3,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Stepped'
      });
    }

    this.retryButton = new Button(this, width / 2, height * 0.68, 'REINTENTAR', () => this.restart(), {
      width: 250,
      height: 48,
      fontSize: 12,
      icon: 'retry',
      baseColor: 0x9f1239,
      hoverColor: 0xbe123c
    });

    this.menuButton = new Button(this, width / 2, height * 0.80, 'MENÚ', () => this.goToMenu(), {
      width: 250,
      height: 44,
      fontSize: 12,
      icon: 'back',
      baseColor: 0x1e1b4b,
      hoverColor: 0x312e81
    });

    this.audioToggle = new AudioToggle(this, width - 48, 40, audioManager);

    this.add.text(width / 2, height - 20, '[R] REINTENTAR   [ENTER] MENÚ', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#64748b',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-R', this.restart, this);
    this.input.keyboard.on('keydown-ENTER', this.goToMenu, this);
    this.input.keyboard.on('keydown-M', this.toggleAudio, this);
  }

  toggleAudio() {
    this.audioToggle?.toggle();
  }

  restart() {
    if (this.transitioning) return;
    this.transitioning = true;
    let transitioned = false;
    const executeTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('GameScene');
    };
    this.cameras.main.fadeOut(150, 5, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', executeTransition);
    this.time.delayedCall(250, executeTransition);
  }

  goToMenu() {
    if (this.transitioning) return;
    this.transitioning = true;
    let transitioned = false;
    const executeTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('MenuScene');
    };
    this.cameras.main.fadeOut(150, 5, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', executeTransition);
    this.time.delayedCall(250, executeTransition);
  }

  cleanup() {
    this.transitioning = false;
    this.input.keyboard.off('keydown-R', this.restart, this);
    this.input.keyboard.off('keydown-ENTER', this.goToMenu, this);
    this.input.keyboard.off('keydown-M', this.toggleAudio, this);
    this.registry.get('audioManager')?.stopMusic();
    this.retryButton?.destroy();
    this.menuButton?.destroy();
    this.audioToggle?.destroy();
    this.backdrop?.destroy();
  }
}
