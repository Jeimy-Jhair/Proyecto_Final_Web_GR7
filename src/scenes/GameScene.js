import Player from '../objects/Player.js';
import Enemy from '../objects/Enemy.js';
import Bullet from '../objects/Bullet.js';
import CollisionSystem from '../systems/CollisionSystem.js';
import ScoreSystem from '../systems/ScoreSystem.js';
import WaveSystem from '../systems/WaveSystem.js';
import LevelSystem from '../systems/LevelSystem.js';
import StorageManager from '../managers/StorageManager.js';
import AudioManager from '../managers/AudioManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    const previousAudio = this.registry.get('audioManager');
    previousAudio?.stopMusic();
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
    this.registry.set('audioManager', audioManager);
    this.isGameOver = false;
    this.events.once('shutdown', () => this.registry.get('audioManager')?.stopMusic());

    // Fondo simple
    this.add.rectangle(0, 0, width, height, 0x3b2f3e).setOrigin(0).setDepth(-20);

    // Meteoritos decorativos de fondo (sin solaparse)
    const meteorKeys = this.registry.get('meteorKeys') || [];
    if (meteorKeys.length > 0) {
      const placed = [];
      let attempts = 0;
      while (placed.length < 12 && attempts < 300) {
        attempts += 1;
        const key = meteorKeys[Math.floor(Math.random() * meteorKeys.length)];
        const scale = Phaser.Math.FloatBetween(0.35, 0.85);
        const texture = this.textures.get(key);
        const source = texture?.source?.[0];
        const w = (source?.width || 40) * scale;
        const h = (source?.height || 40) * scale;
        const x = Phaser.Math.Between(30, width - 30);
        const y = Phaser.Math.Between(30, height - 30);
        const overlaps = placed.some((p) =>
          Math.abs(p.x - x) < (p.w + w) * 0.45 &&
          Math.abs(p.y - y) < (p.h + h) * 0.45
        );
        if (overlaps) continue;
        this.add.image(x, y, key)
          .setScale(scale)
          .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
          .setAlpha(0.55)
          .setDepth(-10);
        placed.push({ x, y, w, h });
      }
    }

    // 1. Grupos de física
    this.playerBullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 60,
      runChildUpdate: true,
      allowGravity: false
    });

    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: 40,
      runChildUpdate: true,
      allowGravity: false
    });

    this.enemyBullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 40,
      runChildUpdate: true,
      allowGravity: false
    });

    // 2. Sistemas de puntuación y nivel
    this.scoreSystem = new ScoreSystem({
      initialScore: 0,
      onChange: (score) => {
        if (this.scoreText) this.scoreText.setText(`Puntos: ${score}`);
      }
    });

    this.levelSystem = new LevelSystem({
      initialLevel: 1,
      onLevelUp: ({ level }) => {
        StorageManager.setLevel(level);
        if (this.levelText) this.levelText.setText(`Nivel: ${level}`);
      }
    });

    // 3. Jugador
    this.player = new Player(this, width / 2, height - 60, {
      bulletGroup: this.playerBullets,
      onShoot: () => audioManager?.playSfx('sfx_disparo'),
      onDamage: ({ lives }) => {
        audioManager?.playSfx('sfx_golpe');
        if (this.livesText) this.livesText.setText(`Vidas: ${lives}`);
      },
      onDeath: () => this.handleGameOver()
    });

    // 4. Sistema de oleadas
    this.waveSystem = new WaveSystem(this, this.enemies, {
      levelSystem: this.levelSystem,
      enemyBulletGroup: this.enemyBullets,
      onWaveStart: ({ waveNumber, level }) => {
        if (this.waveText) this.waveText.setText(`Oleada: ${waveNumber} (Nv ${level})`);
      },
      onEnemyShoot: () => audioManager?.playSfx('sfx_enemigo_disparo'),
      onWaveComplete: ({ waveNumber }) => {
        if (this.isGameOver || !this.player.isAlive()) return;
        this.levelSystem.recordWaveCompleted(waveNumber);
        this.time.delayedCall(1500, () => {
          if (!this.isGameOver && this.player.isAlive()) {
            this.waveSystem.startWave(waveNumber + 1);
          }
        });
      }
    });

    // 5. Sistema de colisiones
    this.collisionSystem = new CollisionSystem(
      this,
      {
        player: this.player,
        playerBullets: this.playerBullets,
        enemies: this.enemies,
        enemyBullets: this.enemyBullets
      },
      {
        scoreSystem: this.scoreSystem,
        waveSystem: this.waveSystem
      },
      {
        onBulletHitEnemy: () => audioManager?.playSfx('sfx_explosion'),
        onEnemyDefeated: () => audioManager?.playSfx('sfx_explosion'),
        onPlayerHit: ({ lives }) => {
          audioManager?.playSfx('sfx_golpe');
          if (this.livesText) this.livesText.setText(`Vidas: ${lives}`);
        },
        onPlayerDeath: () => this.handleGameOver()
      }
    );
    this.collisionSystem.setupCollisions();

    // HUD mínimo
    this.scoreText = this.add.text(16, 16, 'Puntos: 0', { fontFamily: 'Arial', fontSize: 18, color: '#ffffff' });
    this.livesText = this.add.text(16, 40, `Vidas: ${this.player.getLives()}`, { fontFamily: 'Arial', fontSize: 18, color: '#ffffff' });
    this.levelText = this.add.text(width - 16, 16, 'Nivel: 1', { fontFamily: 'Arial', fontSize: 18, color: '#ffffff' }).setOrigin(1, 0);
    this.waveText = this.add.text(width - 16, 40, 'Oleada: 1', { fontFamily: 'Arial', fontSize: 18, color: '#ffffff' }).setOrigin(1, 0);

    this.add.text(width / 2, height - 20, 'Flechas/WASD mover, Espacio disparar, P pausa, G game over', {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Icono de mute en esquina superior derecha
    const muteIcon = this.add.image(width - 16, height - 16, 'imagen-mute').setOrigin(1, 1).setScale(0.15).setDepth(100).setVisible(audioManager.isMuted());
    this.input.keyboard.on('keydown-M', () => {
      const muted = audioManager.toggleMute();
      muteIcon.setVisible(muted);
    });

    // Transiciones (no borrar)
    this.input.keyboard.on('keydown-P', () => {
      if (this.isGameOver) return;
      this.scene.pause();
      this.scene.launch('PauseScene');
    });

    this.input.keyboard.on('keydown-G', () => {
      this.handleGameOver();
    });

    // 6. Música y primera oleada
    audioManager.playMusic('musica-gameplay');
    this.waveSystem.startWave(1);
  }

  update() {
    if (!this.isGameOver) {
      this.player?.update();
    }
  }

  handleGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.waveSystem?.stop();
    this.registry.get('audioManager')?.stopMusic();

    const finalScore = this.scoreSystem.getScore();
    StorageManager.setHighScore(finalScore);
    StorageManager.setLevel(this.levelSystem.getLevel());

    this.scene.start('GameOverScene', {
      score: finalScore,
      level: this.levelSystem.getLevel(),
      wave: this.waveSystem.getWaveNumber()
    });
  }
}
