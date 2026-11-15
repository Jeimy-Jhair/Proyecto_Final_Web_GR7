export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create() {
    const { width, height } = this.scale;
    const audioManager = this.registry.get('audioManager');
    const muteIcon = this.add.image(width - 16, height - 16, 'imagen-mute').setOrigin(1, 1).setScale(0.15).setDepth(100).setVisible(!!audioManager?.isMuted());
    this.input.keyboard.on('keydown-M', () => {
      if (!audioManager) return;
      const muted = audioManager.toggleMute();
      muteIcon.setVisible(muted);
    });

    // Fondo semitransparente oscuro que superpone la escena de juego
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

    this.add.text(width / 2, height / 2, 'JUEGO EN PAUSA - Presiona P o ESC para reanudar', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#ffffff'
    }).setOrigin(0.5);

    // --- Lógica de transición de estados (NO BORRAR) ---
    const resumeGame = () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    };

    this.input.keyboard.on('keydown-P', resumeGame);
    this.input.keyboard.on('keydown-ESC', resumeGame);
  }
}