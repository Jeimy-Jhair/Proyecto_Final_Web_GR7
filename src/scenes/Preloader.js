import AudioManager from '../managers/AudioManager.js';

export default class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // --- Barra de progreso visual ---
    const { width, height } = this.scale;
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Cargando...', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#ffffff'
    }).setOrigin(0.5);

    const assetText = this.add.text(width / 2, height / 2 + 50, '', {
      fontFamily: 'Arial',
      fontSize: 14,
      color: '#aaaaaa'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      percentText.setText(Math.round(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0x00ff88, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('fileprogress', (file) => {
      assetText.setText('Cargando: ' + file.key);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();

      // Al completarse la carga de recursos, iniciar automáticamente MenuScene
      this.scene.start('MenuScene');
    });

    this.load.on('loaderror', (file) => {
      console.warn('Preloader: no se pudo cargar', file.key, file.src);
    });

    // --- Carga de recursos de audio ---
    // Coloca tus archivos en src/assets/audio/ (y sírvelos vía public/ o importa con Vite)
    this.load.audio('bgm', 'assets/audio/bgm.mp3');
    this.load.audio('sfx_jump', 'assets/audio/sfx_jump.wav');
    this.load.audio('sfx_coin', 'assets/audio/sfx_coin.wav');

    // --- Carga de recursos de imágenes ---
    this.load.image('logo', 'assets/images/logo.png');
    this.load.image('player', 'assets/images/player.png');
  }

  create() {
    // Inicializar AudioManager y registrar SFX (al menos dos)
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_jump', 'sfx_coin');
    this.registry.set('audioManager', audioManager);

    // Aplicar estado de silencio guardado
    audioManager.applyStoredMute();

    // Ejemplo: reproducir música de fondo si existe
    if (this.cache.audio.exists('bgm')) {
      audioManager.playMusic('bgm');
    }

    // Pasar a la escena principal (ajusta según tu flujo)
    // this.scene.start('MenuScene');
    console.log('Preloader completado. Juego listo.');
  }
}
