import Phaser from 'phaser';
import Player from '../objects/Player.js';
import Enemy from '../objects/Enemy.js';
import Bullet from '../objects/Bullet.js';
import CollisionSystem from '../systems/CollisionSystem.js';
import ScoreSystem from '../systems/ScoreSystem.js';
import WaveSystem from '../systems/WaveSystem.js';
import LevelSystem from '../systems/LevelSystem.js';
import StorageManager from '../managers/StorageManager.js';
import AudioManager from '../managers/AudioManager.js';
import HUD from '../ui/HUD.js';
import TouchControls from '../ui/TouchControls.js';
import AudioToggle from '../ui/AudioToggle.js';
import { createPixelExplosion, createPixelMuzzleFlash, createPixelHitSparks } from '../ui/PixelArt.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init() {
    this.isGameOver = false;
    this.transitioning = false;
  }

  create() {
    this.isGameOver = false;
    this.transitioning = false;
    this.cameras.main.fadeIn(150, 5, 7, 22);
    const { width, height } = this.scale;
    const isWidescreen = width >= 1000;
    const playAreaWidth = isWidescreen ? Math.floor(width * 0.76) : width;

    const previousAudio = this.registry.get('audioManager');
    previousAudio?.stopMusic();
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
    this.registry.set('audioManager', audioManager);
    this.isGameOver = false;
    this.hud = new HUD(this);
    this.events.once('shutdown', () => {
      this.isGameOver = false;
      this.transitioning = false;
      this.registry.get('audioManager')?.stopMusic();
      this.touchControls?.destroy();
      this.audioToggle?.destroy();
      this.hud?.destroy();
    });

    this.add.rectangle(0, 0, width, height, 0x050716).setOrigin(0).setDepth(-20);

    if (isWidescreen) {
      const divider = this.add.graphics().setDepth(-15);
      divider.fillStyle(0x1e293b, 0.8);
      divider.fillRect(playAreaWidth + 2, 0, 4, height);
      divider.fillStyle(0x22d3ee, 0.4);
      divider.fillRect(playAreaWidth + 3, 0, 2, height);
    }

    for (let i = 0; i < 40; i += 1) {
      const starX = Phaser.Math.Between(4, playAreaWidth - 4);
      const starY = Phaser.Math.Between(4, height - 4);
      const starSize = i % 4 === 0 ? 3 : 2;
      const starColor = i % 3 === 0 ? 0x67e8f9 : (i % 2 === 0 ? 0xc084fc : 0xffffff);
      const star = this.add.rectangle(starX, starY, starSize, starSize, starColor, Phaser.Math.FloatBetween(0.2, 0.7))
        .setDepth(-18);
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.9),
        duration: Phaser.Math.Between(600, 1500),
        yoyo: true,
        repeat: -1,
        ease: 'Stepped'
      });
    }

    this.meteors = [];
    const meteorKeys = this.registry.get('meteorKeys') || [];
    if (meteorKeys.length > 0) {
      const placed = [];
      let attempts = 0;
      while (placed.length < 14 && attempts < 350) {
        attempts += 1;
        const key = meteorKeys[Math.floor(Math.random() * meteorKeys.length)];
        const scale = Phaser.Math.FloatBetween(0.35, 0.85);
        const texture = this.textures.get(key);
        const source = texture?.source?.[0];
        const w = (source?.width || 40) * scale;
        const h = (source?.height || 40) * scale;
        const x = Phaser.Math.Between(30, playAreaWidth - 30);
        const y = Phaser.Math.Between(30, height - 30);
        const overlaps = placed.some((p) =>
          Math.abs(p.x - x) < (p.w + w) * 0.45 &&
          Math.abs(p.y - y) < (p.h + h) * 0.45
        );
        if (overlaps) continue;
        const meteor = this.add.image(x, y, key)
          .setScale(scale)
          .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
          .setAlpha(0.55)
          .setDepth(-10);
        this.meteors.push({
          image: meteor,
          speed: Phaser.Math.FloatBetween(30, 110),
          playWidth: playAreaWidth
        });
        placed.push({ x, y, w, h });
      }
    }

    this.fpsText = this.add.text(14, height - 18, 'FPS 60', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#64748b'
    }).setDepth(100);

    const playerBounds = {
      minX: 16,
      maxX: playAreaWidth - 16,
      minY: 16,
      maxY: height - 16
    };

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

    this.scoreSystem = new ScoreSystem({
      initialScore: 0,
      onChange: (score) => {
        if (this.scoreText) this.scoreText.setText(`PUNTOS ${String(score).padStart(6, '0')}`);
        this.hud?.setScore(score);
      }
    });

    this.levelSystem = new LevelSystem({
      initialLevel: StorageManager.getLevel(),
      victoryWave: 10,
      enemiesPerLevel: 20,
      onLevelUp: ({ level }) => {
        StorageManager.setLevel(level);
        if (this.levelText) this.levelText.setText(`NIVEL ${String(level).padStart(2, '0')}`);
        this.hud?.setLevel(level);
        this.hud?.showFeedback(`¡NIVEL ${level}!`, '#facc15');
      }
    });

    this.player = new Player(this, playAreaWidth / 2, height - 70, {
      bulletGroup: this.playerBullets,
      bounds: playerBounds,
      displaySize: 54,
      onShoot: () => {
        audioManager?.playSfx('sfx_disparo');
        createPixelMuzzleFlash(this, this.player.x, this.player.y - 28);
      },
      onDamage: ({ lives }) => {
        audioManager?.playSfx('sfx_golpe');
        this.cameras.main.shake(120, 0.006);
        createPixelHitSparks(this, this.player.x, this.player.y, 0xf87171);
        if (this.livesText) this.livesText.setText(`${lives}/${this.player.getMaxLives()}`);
        this.hud?.setLives(lives, this.player.getMaxLives());
        this.hud?.showFeedback('IMPACTO', '#f87171');
      },
      onDeath: () => {
        createPixelExplosion(this, this.player.x, this.player.y, { color: 0x22d3ee, count: 16 });
        this.handleGameOver();
      }
    });

    this.waveSystem = new WaveSystem(this, this.enemies, {
      levelSystem: this.levelSystem,
      enemyBulletGroup: this.enemyBullets,
      bounds: playerBounds,
      onWaveStart: ({ waveNumber, level }) => {
        if (this.waveText) this.waveText.setText(`OLEADA ${String(waveNumber).padStart(2, '0')}`);
        this.hud?.setWave(waveNumber, 'spawning');
        this.hud?.showFeedback(`¡OLEADA ${waveNumber}!`, '#22d3ee');
      },
      onEnemyShoot: () => audioManager?.playSfx('sfx_enemigo_disparo'),
      onWaveComplete: ({ waveNumber }) => {
        if (this.isGameOver || !this.player.isAlive()) return;
        this.levelSystem.recordWaveCompleted(waveNumber);
        if (this.levelSystem.isVictoryWave(waveNumber)) {
          this.handleVictory();
          return;
        }
        this.time.delayedCall(1500, () => {
          if (!this.isGameOver && this.player.isAlive()) {
            this.waveSystem.startWave(waveNumber + 1);
          }
        });
      }
    });

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
        onBulletHitEnemy: (bullet, enemy) => {
          audioManager?.playSfx('sfx_explosion');
          createPixelHitSparks(this, enemy.x, enemy.y, 0xfacc15);
        },
        onEnemyDefeated: (enemy) => {
          audioManager?.playSfx('sfx_explosion');
          createPixelExplosion(this, enemy.x, enemy.y, { color: 0xf97316, count: 12 });
          const progress = this.levelSystem.recordEnemyDefeated(enemy);
          StorageManager.setLevel(this.levelSystem.getLevel());
          this.hud?.setEnemiesProgress(
            this.levelSystem.getEnemiesInCurrentLevel(),
            this.levelSystem.getEnemiesNeededForNextLevel(),
            this.levelSystem.getDefeatedEnemies()
          );
          if (progress.leveledUp) {
            this.hud?.setLevel(progress.level);
            this.hud?.showFeedback(`¡NIVEL ${progress.level}!`, '#facc15');
          }
        },
        onPlayerHit: ({ lives }) => {
          audioManager?.playSfx('sfx_golpe');
          if (this.livesText) this.livesText.setText(`${lives}/${this.player.getMaxLives()}`);
        },
        onPlayerDeath: () => this.handleGameOver()
      }
    );
    this.collisionSystem.setupCollisions();

    this.scoreText = this.hud.scoreText;
    this.livesText = this.hud.livesText;
    this.levelText = this.hud.levelText;
    this.waveText = this.hud.waveText;
    this.hud.setRecord(StorageManager.getHighScore());
    this.hud.setLives(this.player.getLives(), this.player.getMaxLives());
    this.hud.setLevel(this.levelSystem.getLevel());
    this.hud.setWave(this.waveSystem.getWaveNumber(), this.waveSystem.getWaveState());
    this.hud.setEnemiesProgress(
      this.levelSystem.getEnemiesInCurrentLevel(),
      this.levelSystem.getEnemiesNeededForNextLevel(),
      this.levelSystem.getDefeatedEnemies()
    );

    const toggleX = isWidescreen ? playAreaWidth - 44 : width - 42;
    this.audioToggle = new AudioToggle(this, toggleX, 36, audioManager);
    this.touchControls = new TouchControls(this, this.player, {
      onPause: () => this.pauseGame(),
      onMute: () => this.toggleAudio()
    });
    this.audioToggle.button.container.setVisible(!this.sys.game.device.input.touch);

    this.input.keyboard.on('keydown-M', this.toggleAudio, this);
    this.input.keyboard.on('keydown-P', this.pauseGame, this);
    this.input.keyboard.on('keydown-G', this.handleGameOver, this);

    audioManager.playMusic('musica-gameplay');
    this.waveSystem.startWave(1);
  }

  update(time, delta) {
    const safeDelta = Number.isFinite(delta) && delta > 0 ? delta : 16.67;
    const dt = safeDelta / 1000;

    if (!this.isGameOver && Array.isArray(this.meteors)) {
      const { height } = this.scale;
      this.meteors.forEach((meteor) => {
        if (!meteor?.image?.active) return;
        meteor.image.y += meteor.speed * dt;
        if (meteor.image.y > height + 60) {
          meteor.image.y = -60;
          meteor.image.x = Phaser.Math.Between(30, (meteor.playWidth || this.scale.width) - 30);
          meteor.speed = Phaser.Math.FloatBetween(30, 110);
        }
      });
    }

    if (this.fpsText) {
      const fps = this.game?.loop?.actualFps;
      this.fpsText.setText(`FPS ${Math.round(Number.isFinite(fps) ? fps : 1000 / safeDelta)}`);
    }

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
    const newRecord = finalScore > StorageManager.getHighScore();
    StorageManager.setHighScore(finalScore);
    StorageManager.setLevel(this.levelSystem.getLevel());

    let transitioned = false;
    const executeTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('GameOverScene', {
        score: finalScore,
        level: this.levelSystem.getLevel(),
        wave: this.waveSystem.getWaveNumber(),
        newRecord
      });
    };
    this.cameras.main.fadeOut(150, 5, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', executeTransition);
    this.time.delayedCall(250, executeTransition);
  }

  handleVictory() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.waveSystem?.stop();
    this.registry.get('audioManager')?.stopMusic();
    const finalScore = this.scoreSystem.getScore();
    const newRecord = finalScore > StorageManager.getHighScore();
    StorageManager.setHighScore(finalScore);
    StorageManager.setLevel(this.levelSystem.getLevel());

    let transitioned = false;
    const executeTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('VictoryScene', {
        score: finalScore,
        level: this.levelSystem.getLevel(),
        wave: this.waveSystem.getWaveNumber(),
        newRecord
      });
    };
    this.cameras.main.fadeOut(150, 5, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', executeTransition);
    this.time.delayedCall(250, executeTransition);
  }

  pauseGame() {
    if (this.isGameOver || this.scene.isPaused()) return;
    this.scene.pause();
    this.scene.launch('PauseScene');
  }

  toggleAudio() {
    this.audioToggle?.toggle();
    const audioManager = this.registry.get('audioManager');
    if (audioManager && this.touchControls) {
      this.touchControls.setMuted(audioManager.isMuted());
    }
  }
}
