import Phaser from 'phaser';
import AudioManager from '../managers/AudioManager.js';
import { drawSteppedBox, draw8BitPlayer, draw8BitEnemy, draw8BitBullet } from '../ui/PixelArt.js';
import musicaMenuUrl from '../assets/audio/musica-menú.ogg?url';
import musicaGameplayUrl from '../assets/audio/musica-gameplay.wav?url';
import sfxDisparoUrl from '../assets/audio/efecto-disparo.wav?url';
import sfxExplosionUrl from '../assets/audio/efecto-explosion.wav?url';
import sfxEnemigoDisparoUrl from '../assets/audio/efecto-enemigo-disparo.wav?url';
import sfxGolpeUrl from '../assets/audio/efecto-golpe.wav?url';
import imagenMuteUrl from '../assets/images/mute/imagen-mute.png?url';
import logoUrl from '../assets/images/logo/logo.png?url';
import playerUrl from '../assets/images/player/player.png?url';
import laserPlayerUrl from '../assets/images/player/laser-player.png?url';
import enemyOneUrl from '../assets/images/Enemies/enemy-one.png?url';
import enemyTwoUrl from '../assets/images/Enemies/enemy-two.png?url';
import enemyThreeUrl from '../assets/images/Enemies/enemy-three.png?url';
import laserEnemyUrl from '../assets/images/Enemies/laser-enemy.png?url';

const meteorModules = import.meta.glob('../assets/images/Meteors/*.png', { eager: true });

export default class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    const { width, height } = this.scale;
    const boxWidth = 380;
    const boxHeight = 40;
    const boxX = (width - boxWidth) / 2;
    const boxY = height / 2 - boxHeight / 2;

    const progressBox = this.add.graphics();
    drawSteppedBox(progressBox, boxX, boxY, boxWidth, boxHeight, {
      fillColor: 0x0a0f24,
      fillAlpha: 0.95,
      borderColor: 0x22d3ee,
      borderWidth: 2,
      cornerStep: 4,
      shadowOffset: 4,
      shadowColor: 0x020617
    });

    const progressBar = this.add.graphics();

    const loadingText = this.add.text(width / 2, boxY - 36, 'CARGANDO...', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#22d3ee',
      resolution: 2
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, boxY + boxHeight / 2, '0%', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#facc15',
      resolution: 2
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      percentText.setText(`${Math.round(value * 100)}%`);
      progressBar.clear();
      const fillWidth = Math.max(0, (boxWidth - 12) * value);
      if (fillWidth > 0) {
        progressBar.fillStyle(0x0284c7, 0.9);
        progressBar.fillRect(boxX + 6, boxY + 6, fillWidth, boxHeight - 12);
      }
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      this.scene.start('MenuScene');
    });

    this.load.on('loaderror', (file) => {
      console.warn('Preloader: no se pudo cargar', file.key, file.src);
    });

    this.load.audio('musica-menu', musicaMenuUrl);
    this.load.audio('musica-gameplay', musicaGameplayUrl);
    this.load.audio('sfx_disparo', sfxDisparoUrl);
    this.load.audio('sfx_explosion', sfxExplosionUrl);
    this.load.audio('sfx_enemigo_disparo', sfxEnemigoDisparoUrl);
    this.load.audio('sfx_golpe', sfxGolpeUrl);
    this.load.image('imagen-mute', imagenMuteUrl);
    this.load.image('game_logo', logoUrl);

    this.load.image('player', playerUrl);
    this.load.image('bullet_player', laserPlayerUrl);
    this.load.image('enemy_basic', enemyOneUrl);
    this.load.image('enemy_fast', enemyTwoUrl);
    this.load.image('enemy_tank', enemyThreeUrl);
    this.load.image('bullet_enemy', laserEnemyUrl);

    Object.entries(meteorModules).forEach(([path, module]) => {
      const fileName = path.split('/').pop().replace('.png', '');
      this.load.image(`meteor_${fileName}`, module.default);
    });

    this.registry.set('meteorKeys', Object.keys(meteorModules).map((p) => `meteor_${p.split('/').pop().replace('.png', '')}`));
  }

  create() {
    const texturesToBuild = [
      { key: 'player', width: 54, height: 54, draw: (g) => draw8BitPlayer(g, 54, 54) },
      { key: 'enemy_basic', width: 48, height: 48, draw: (g) => draw8BitEnemy(g, 'basic', 48, 48) },
      { key: 'enemy_fast', width: 42, height: 42, draw: (g) => draw8BitEnemy(g, 'fast', 42, 42) },
      { key: 'enemy_tank', width: 68, height: 68, draw: (g) => draw8BitEnemy(g, 'tank', 68, 68) },
      { key: 'bullet_player', width: 8, height: 18, draw: (g) => draw8BitBullet(g, 'player', 8, 18) },
      { key: 'bullet_enemy', width: 8, height: 18, draw: (g) => draw8BitBullet(g, 'enemy', 8, 18) }
    ];

    texturesToBuild.forEach(({ key, width, height, draw }) => {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, width, height);
      g.destroy();
    });

    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
    this.registry.set('audioManager', audioManager);
    audioManager.applyStoredMute();

    if (this.cache.audio.exists('bgm')) {
      audioManager.playMusic('bgm');
    }
  }
}
