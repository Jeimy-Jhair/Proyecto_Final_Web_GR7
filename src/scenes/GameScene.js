export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;

    // === ZONA PARA UI (compañero de interfaz) ===
    // Agrega aquí los elementos de interfaz del juego: HUD, barras de vida,
    // puntuación, inventario, menús in-game, etc. No borres la lógica de
    // transición de estados que se encuentra más abajo.

    // === ZONA PARA MECÁNICAS (compañero de gameplay) ===
    // Agrega aquí la lógica de gameplay: jugador, enemigos, físicas,
    // colisiones, controles de movimiento, spawns, etc. No borres la lógica
    // de transición de estados que se encuentra más abajo.

    // --- Textos temporales de la escena de juego ---
    this.add.text(width / 2, height / 2 - 40, 'ESCENA DE JUEGO (Gameplay)', {
      fontFamily: 'Arial',
      fontSize: 28,
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, 'Presiona P para Pausar', {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#aaaaaa'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 40, 'Presiona G para Game Over', {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#aaaaaa'
    }).setOrigin(0.5);

    // --- Lógica de transición de estados (NO BORRAR) ---
    this.input.keyboard.on('keydown-P', () => {
      this.scene.pause();
      this.scene.launch('PauseScene');
    });

    this.input.keyboard.on('keydown-G', () => {
      this.scene.start('GameOverScene');
    });
  }
}