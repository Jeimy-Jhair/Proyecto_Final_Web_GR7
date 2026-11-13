export default class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Carga mínima necesaria para la pantalla de carga (si la hubiera)
  }

  create() {
    // Configuración inicial global (escala, físicas, etc.) si se requiere.
    this.scene.start('Preloader');
  }
}
