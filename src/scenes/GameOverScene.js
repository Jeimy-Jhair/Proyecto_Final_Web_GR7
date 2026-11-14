export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    const { width, height } = this.scale;

    // === ZONA PARA UI (compañero de interfaz) ===
    // Agrega aquí los elementos visuales de la pantalla de Game Over:
    // puntuación final, botones, fondos, efectos, etc. No borres la lógica de
    // transición de estados que se encuentra más abajo.

    // === ZONA PARA MECÁNICAS (compañero de gameplay) ===
    // Agrega aquí la lógica de reinicio de datos, guardado de puntuación,
    // limpieza de estado, etc. No borres la lógica de transición de estados
    // que se encuentra más abajo.

    // --- Texto centrado principal ---
    this.add.text(width / 2, height / 2, 'GAME OVER - Haz clic o presiona R para reiniciar', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#ffffff'
    }).setOrigin(0.5);

    // --- Lógica de transición de estados (NO BORRAR) ---
    const backToMenu = () => {
      this.scene.start('MenuScene');
    };

    this.input.on('pointerdown', backToMenu);

    this.input.keyboard.on('keydown-R', backToMenu);
  }
}