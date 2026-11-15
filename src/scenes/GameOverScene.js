import AudioManager from '../managers/AudioManager.js';
import StorageManager from '../managers/StorageManager.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalData = data || {};
  }

  create() {
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
    this.registry.set('audioManager', audioManager);
    audioManager.playMusic('musica-menu');
    this.events.once('shutdown', () => audioManager.stopMusic());
    const { width, height } = this.scale;

    const muteIcon = this.add.image(width - 16, height - 16, 'imagen-mute').setOrigin(1, 1).setScale(0.15).setDepth(100).setVisible(audioManager.isMuted());
    this.input.keyboard.on('keydown-M', () => {
      const muted = audioManager.toggleMute();
      muteIcon.setVisible(muted);
    });
    const score = this.finalData.score ?? 0;
    const level = this.finalData.level ?? 1;
    const wave = this.finalData.wave ?? 1;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    this.add.text(width / 2, height / 2 - 80, 'GAME OVER', {
      fontFamily: 'Arial',
      fontSize: 48,
      color: '#ef4444'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 10, `Puntos: ${score}`, {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, `Nivel: ${level}   Oleada: ${wave}`, {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#cbd5e1'
    }).setOrigin(0.5);

    const highScore = StorageManager.getHighScore();
    this.add.text(width / 2, height / 2 + 50, `Récord: ${highScore}`, {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#fbbf24'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 90, 'Haz clic o presiona R para jugar de nuevo', {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#94a3b8'
    }).setOrigin(0.5);

    const restart = () => this.scene.start('GameScene');
    this.input.on('pointerdown', restart);
    this.input.keyboard.on('keydown-R', restart);
    this.input.keyboard.on('keydown-ENTER', () => this.scene.start('MenuScene'));
  }
}
