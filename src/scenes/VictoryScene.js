import Phaser from 'phaser';
import AudioManager from '../managers/AudioManager.js';
import StorageManager from '../managers/StorageManager.js';
import Button from '../ui/Button.js';
import AudioToggle from '../ui/AudioToggle.js';
import { createSpaceBackdrop } from '../ui/SpaceBackdrop.js';
import { drawSteppedBox } from '../ui/PixelArt.js';

export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  init(data) {
    this.finalData = data || {};
    this.transitioning = false;
  }

  create() {
    this.transitioning = false;
    this.cameras.main.fadeIn(150, 5, 7, 22);
    this.backdrop = createSpaceBackdrop(this, { color: 0x051329 });
    const { width, height } = this.scale;
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
    this.registry.set('audioManager', audioManager);
    audioManager.playMusic('musica-menu');
    this.events.once('shutdown', this.cleanup, this);

    const score = this.finalData.score ?? 0;
    const level = this.finalData.level ?? 1;
    const record = StorageManager.getHighScore();
    const newRecord = Boolean(this.finalData.newRecord);

    const padScore = String(Math.max(0, score)).padStart(6, '0');
    const padRecord = String(Math.max(0, record)).padStart(6, '0');
    const padLevel = String(Math.max(1, level)).padStart(2, '0');

    this.add.image(width / 2, height * 0.10, 'game_logo')
      .setOrigin(0.5)
      .setScale(0.12);

    this.add.text(width / 2, height * 0.20, 'VICTORIA', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: width < 600 ? '22px' : '28px',
      color: '#facc15',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.27, 'MISIÓN CUMPLIDA', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#22d3ee',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    const boxWidth = Math.min(420, width - 40);
    const boxHeight = 175;
    const boxX = (width - boxWidth) / 2;
    const boxY = height * 0.33;

    const statsGraphics = this.add.graphics();
    drawSteppedBox(statsGraphics, boxX, boxY, boxWidth, boxHeight, {
      fillColor: 0x0a0f24,
      fillAlpha: 0.95,
      borderColor: 0xfacc15,
      borderWidth: 2,
      cornerStep: 4,
      shadowOffset: 4,
      shadowColor: 0x020617,
      accentColor: 0xfef08a
    });

    const statLines = [
      `PUNTOS    ${padScore}`,
      `RÉCORD    ${padRecord}`,
      `NIVEL     ${padLevel}`,
      `OLEADAS   10/10`
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

    this.retryButton = new Button(this, width / 2, height * 0.69, 'JUGAR', () => this.restart(), {
      width: 250,
      height: 48,
      fontSize: 12,
      icon: 'play',
      baseColor: 0x075985,
      hoverColor: 0x0284c7
    });

    this.menuButton = new Button(this, width / 2, height * 0.81, 'MENÚ', () => this.goToMenu(), {
      width: 250,
      height: 44,
      fontSize: 12,
      icon: 'back',
      baseColor: 0x1e1b4b,
      hoverColor: 0x312e81
    });

    this.audioToggle = new AudioToggle(this, width - 48, 40, audioManager);

    this.add.text(width / 2, height - 20, '[R] JUGAR   [ENTER] MENÚ', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#64748b',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-R', this.restart, this);
    this.input.keyboard.on('keydown-ENTER', this.goToMenu, this);
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
    this.registry.get('audioManager')?.stopMusic();
    this.audioToggle?.destroy();
    this.retryButton?.destroy();
    this.menuButton?.destroy();
    this.backdrop?.destroy();
  }
}
