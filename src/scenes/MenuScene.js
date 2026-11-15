import AudioManager from '../managers/AudioManager.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
    this.registry.set('audioManager', audioManager);
    audioManager.playMusic('musica-menu');
    this.events.once('shutdown', () => audioManager.stopMusic());

    const muteIcon = this.add.image(width - 16, height - 16, 'imagen-mute').setOrigin(1, 1).setScale(0.15).setDepth(100).setVisible(audioManager.isMuted());
    this.input.keyboard.on('keydown-M', () => {
      const muted = audioManager.toggleMute();
      muteIcon.setVisible(muted);
    });

    // === ZONA PARA UI (compañero de interfaz) ===
    // Agrega aquí los elementos visuales del menú: logo, botones, fondos,
    // animaciones, partículas, etc. No borres la lógica de transición de estados
    // que se encuentra más abajo.
    // Ejemplo: this.add.image(width / 2, height / 2, 'logo');

    // === ZONA PARA MECÁNICAS (compañero de gameplay) ===
    // Agrega aquí la lógica de carga de datos, configuración inicial,
    // audio del menú, guardado/carga de partida, etc. No borres la lógica
    // de transición de estados que se encuentra más abajo.

    // --- Texto centrado principal ---
    this.add.text(width / 2, height / 2, 'MENÚ PRINCIPAL - Haz clic o presiona ENTER para jugar', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#ffffff'
    }).setOrigin(0.5);

    // --- Lógica de transición de estados (NO BORRAR) ---
    const startGame = () => {
      audioManager.stopMusic();
      this.scene.start('GameScene');
    };

    this.input.on('pointerdown', startGame);

    this.input.keyboard.on('keydown-ENTER', startGame);
  }
}