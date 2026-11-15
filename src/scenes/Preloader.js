import AudioManager from '../managers/AudioManager.js';
import musicaMenuUrl from '../assets/audio/musica-menú.ogg?url';
import musicaGameplayUrl from '../assets/audio/musica-gameplay.wav?url';
import sfxDisparoUrl from '../assets/audio/efecto-disparo.wav?url';
import sfxExplosionUrl from '../assets/audio/efecto-explosion.wav?url';
import sfxEnemigoDisparoUrl from '../assets/audio/efecto-enemigo-disparo.wav?url';
import sfxGolpeUrl from '../assets/audio/efecto-golpe.wav?url';
import imagenMuteUrl from '../assets/images/imagen-mute.png?url';

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

    // --- Carga de recursos de audio (importados con Vite) ---
    this.load.audio('musica-menu', musicaMenuUrl);
    this.load.audio('musica-gameplay', musicaGameplayUrl);
    this.load.audio('sfx_disparo', sfxDisparoUrl);
    this.load.audio('sfx_explosion', sfxExplosionUrl);
    this.load.audio('sfx_enemigo_disparo', sfxEnemigoDisparoUrl);
    this.load.audio('sfx_golpe', sfxGolpeUrl);
    this.load.image('imagen-mute', imagenMuteUrl);
  }

  create() {
    // Inicializar AudioManager y registrar SFX (al menos dos)
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
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
