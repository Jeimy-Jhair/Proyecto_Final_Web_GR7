import Enemy, { ENEMY_TYPES } from '../objects/Enemy.js';
import { acquireFromGroup } from '../objects/poolHelper.js';

/**
 * Administra la generación, conteo y finalización de oleadas de enemigos.
 * Utiliza `scene.time.addEvent` para respetar automáticamente las pausas de Phaser.
 */
export default class WaveSystem {
  /**
   * @param {Phaser.Scene} scene - Escena propietaria.
   * @param {Phaser.Physics.Arcade.Group} enemyGroup - Grupo de física para los enemigos.
   * @param {object} [options={}] - Configuración del sistema de oleadas.
   * @param {import('./LevelSystem.js').default|null} [options.levelSystem=null] - Sistema de nivel para obtener dificultad.
   * @param {Phaser.Physics.Arcade.Group|null} [options.enemyBulletGroup=null] - Grupo opcional de balas enemigas.
   * @param {{minX?: number, maxX?: number, spawnY?: number, minY?: number, maxY?: number}} [options.bounds] - Área de spawn y límites.
   * @param {boolean} [options.spawnImmediately=true] - Si genera el primer enemigo al iniciar la oleada.
   * @param {Function} [options.onWaveStart] - Callback `({ waveNumber, totalEnemies, level }) => void`.
   * @param {Function} [options.onWaveComplete] - Callback `({ waveNumber, defeatedCount, escapedCount, totalEnemies }) => void`.
   * @param {Function} [options.onEnemySpawn] - Callback `(enemy) => void`.
   * @param {Function} [options.onEnemyEscape] - Callback `(enemy) => void`.
   */
  constructor(scene, enemyGroup, options = {}) {
    if (!scene) {
      throw new Error('WaveSystem requiere una escena válida.');
    }
    if (!enemyGroup) {
      throw new Error('WaveSystem requiere un grupo de enemigos válido.');
    }

    this.scene = scene;
    this.enemyGroup = enemyGroup;
    this.levelSystem = options.levelSystem || null;
    this.enemyBulletGroup = options.enemyBulletGroup || null;
    this.spawnImmediately = options.spawnImmediately !== false;

    const sceneWidth = scene.scale?.width ?? 800;
    const sceneHeight = scene.scale?.height ?? 600;
    this.bounds = {
      minX: options.bounds?.minX ?? 40,
      maxX: options.bounds?.maxX ?? (sceneWidth - 40),
      spawnY: options.bounds?.spawnY ?? -24,
      minY: options.bounds?.minY ?? 0,
      maxY: options.bounds?.maxY ?? sceneHeight
    };

    this.onWaveStart = typeof options.onWaveStart === 'function' ? options.onWaveStart : null;
    this.onWaveComplete = typeof options.onWaveComplete === 'function' ? options.onWaveComplete : null;
    this.onEnemySpawn = typeof options.onEnemySpawn === 'function' ? options.onEnemySpawn : null;
    this.onEnemyEscape = typeof options.onEnemyEscape === 'function' ? options.onEnemyEscape : null;

    this.waveNumber = 0;
    this.state = 'idle'; // 'idle' | 'spawning' | 'active' | 'completed' | 'stopped'
    this.totalToSpawn = 0;
    this.spawnedCount = 0;
    this.defeatedCount = 0;
    this.escapedCount = 0;
    this.currentWaveConfig = null;

    this.activeEnemies = new Set();
    this.spawnTimer = null;
    this._destroyed = false;

    this._onShutdown = () => this.destroy();
    this.scene.events?.once('shutdown', this._onShutdown);
  }

  /**
   * Inicia una nueva oleada si no hay otra en curso.
   *
   * @param {number} [waveNumber=this.waveNumber + 1] - Número de oleada.
   * @param {object} [waveConfig={}] - Sobrescrituras opcionales (`enemyCount`, `spawnInterval`, `speedMultiplier`, `healthBonus`, `enemyTypes`, `enableEnemyShooting`).
   * @returns {boolean} `true` si la oleada inició correctamente.
   */
  startWave(waveNumber = this.waveNumber + 1, waveConfig = {}) {
    if (this._destroyed) {
      return false;
    }

    if (this.state === 'spawning' || this.state === 'active') {
      return false;
    }

    const difficulty = this.levelSystem ? this.levelSystem.getDifficulty() : {
      level: 1,
      enemyCount: 6,
      spawnInterval: 1100,
      speedMultiplier: 1,
      healthBonus: 0,
      enemyTypes: ['basic'],
      enableEnemyShooting: false
    };

    const totalEnemies = Number.isFinite(waveConfig.enemyCount) && waveConfig.enemyCount > 0
      ? Math.floor(waveConfig.enemyCount)
      : difficulty.enemyCount;

    const spawnInterval = Number.isFinite(waveConfig.spawnInterval) && waveConfig.spawnInterval > 0
      ? waveConfig.spawnInterval
      : difficulty.spawnInterval;

    this.waveNumber = Number.isFinite(waveNumber) && waveNumber > 0
      ? Math.floor(waveNumber)
      : this.waveNumber + 1;

    const safeDefaultSpeed = Number.isFinite(difficulty.speedMultiplier) && difficulty.speedMultiplier > 0
      ? difficulty.speedMultiplier
      : 1;
    const speedMultiplier = Number.isFinite(waveConfig.speedMultiplier) && waveConfig.speedMultiplier > 0
      ? waveConfig.speedMultiplier
      : safeDefaultSpeed;

    const safeDefaultHealthBonus = Number.isFinite(difficulty.healthBonus) && difficulty.healthBonus >= 0
      ? Math.floor(difficulty.healthBonus)
      : 0;
    const healthBonus = Number.isFinite(waveConfig.healthBonus) && waveConfig.healthBonus >= 0
      ? Math.floor(waveConfig.healthBonus)
      : safeDefaultHealthBonus;

    this.currentWaveConfig = {
      level: difficulty.level,
      enemyCount: totalEnemies,
      spawnInterval,
      speedMultiplier,
      healthBonus,
      enemyTypes: Array.isArray(waveConfig.enemyTypes) && waveConfig.enemyTypes.length > 0
        ? waveConfig.enemyTypes
        : difficulty.enemyTypes,
      enableEnemyShooting: typeof waveConfig.enableEnemyShooting === 'boolean'
        ? waveConfig.enableEnemyShooting
        : Boolean(difficulty.enableEnemyShooting)
    };

    this.totalToSpawn = totalEnemies;
    this.spawnedCount = 0;
    this.defeatedCount = 0;
    this.escapedCount = 0;
    this.activeEnemies.clear();
    this._clearSpawnTimer();

    this.state = 'spawning';

    if (this.onWaveStart) {
      this.onWaveStart({
        waveNumber: this.waveNumber,
        totalEnemies: this.totalToSpawn,
        level: this.currentWaveConfig.level
      });
    }

    if (this.spawnImmediately) {
      this.spawnEnemies();
    }

    if (this.state === 'spawning' && this.spawnedCount < this.totalToSpawn) {
      this.spawnTimer = this.scene.time.addEvent({
        delay: spawnInterval,
        callback: this.spawnEnemies,
        callbackScope: this,
        loop: true
      });
    }

    return true;
  }

  /**
   * Genera un enemigo de la oleada actual si aún quedan enemigos pendientes.
   *
   * @returns {Enemy|null} Enemigo generado o `null` si ya no corresponde generar.
   */
  spawnEnemies() {
    if (this._destroyed || this.state !== 'spawning') {
      this._clearSpawnTimer();
      return null;
    }

    if (this.spawnedCount >= this.totalToSpawn) {
      this._clearSpawnTimer();
      this.state = 'active';
      this._checkWaveCompletion();
      return null;
    }

    const config = this.currentWaveConfig;
    const typeKey = this._pickEnemyType(config.enemyTypes);
    const preset = ENEMY_TYPES[typeKey] || ENEMY_TYPES.basic;

    const minX = this.bounds.minX;
    const maxX = Math.max(minX, this.bounds.maxX);
    const spawnX = minX + Math.random() * (maxX - minX);
    const spawnY = this.bounds.spawnY;

    const enemy = this._acquireEnemy(spawnX, spawnY);
    if (!enemy) {
      this._clearSpawnTimer();
      this.state = 'active';
      this._checkWaveCompletion();
      return null;
    }

    const scaledSpeed = Math.max(1, Math.round(preset.speed * config.speedMultiplier));
    const scaledHealth = Math.max(1, preset.health + config.healthBonus);

    enemy.spawn(spawnX, spawnY, {
      type: typeKey,
      speed: scaledSpeed,
      health: scaledHealth,
      canShoot: config.enableEnemyShooting && Boolean(this.enemyBulletGroup),
      bulletGroup: this.enemyBulletGroup,
      bounds: {
        minX: 0,
        maxX: this.scene.scale?.width ?? 800,
        minY: this.bounds.minY,
        maxY: this.bounds.maxY
      },
      onEscape: (escapedEnemy) => this._handleEnemyEscape(escapedEnemy)
    });

    this.activeEnemies.add(enemy);
    this.spawnedCount += 1;

    if (this.onEnemySpawn) {
      this.onEnemySpawn(enemy);
    }

    if (this.spawnedCount >= this.totalToSpawn) {
      this._clearSpawnTimer();
      this.state = 'active';
      this._checkWaveCompletion();
    }

    return enemy;
  }

  _acquireEnemy(x, y) {
    return acquireFromGroup(
      this.enemyGroup,
      Enemy,
      () => new Enemy(this.scene, x, y, { autoSpawn: false }),
      x,
      y
    );
  }

  _pickEnemyType(types) {
    const valid = types.filter((t) => Boolean(ENEMY_TYPES[t]));
    if (valid.length === 0) {
      return 'basic';
    }
    const index = Math.floor(Math.random() * valid.length);
    return valid[index];
  }

  _handleEnemyEscape(enemy) {
    const removed = this._markEnemyResolved(enemy, 'escaped');
    if (removed && this.onEnemyEscape) {
      this.onEnemyEscape(enemy);
    }
  }

  /**
   * Notifica que un enemigo fue derrotado por el jugador.
   * Garantiza que cada enemigo se contabilice una sola vez.
   *
   * @param {Enemy} enemy
   * @returns {boolean} `true` si el enemigo pertenecía a la oleada activa.
   */
  onEnemyDefeated(enemy) {
    return this._markEnemyResolved(enemy, 'defeated');
  }

  /**
   * Notifica que un enemigo salió del combate por otra causa (p. ej. choque con jugador).
   *
   * @param {Enemy} enemy
   * @param {'defeated'|'escaped'|'collision'|'removed'} [reason='removed']
   * @returns {boolean}
   */
  onEnemyRemoved(enemy, reason = 'removed') {
    return this._markEnemyResolved(enemy, reason);
  }

  _markEnemyResolved(enemy, reason) {
    if (!enemy || !this.activeEnemies.delete(enemy)) {
      return false;
    }

    if (reason === 'defeated') {
      this.defeatedCount += 1;
    } else if (reason === 'escaped') {
      this.escapedCount += 1;
    }

    this._checkWaveCompletion();
    return true;
  }

  _checkWaveCompletion() {
    if (this.state === 'completed' || this.state === 'stopped' || this.state === 'idle') {
      return;
    }

    if (this.spawnedCount >= this.totalToSpawn && this.activeEnemies.size === 0) {
      this._clearSpawnTimer();
      this.state = 'completed';

      if (this.onWaveComplete) {
        this.onWaveComplete({
          waveNumber: this.waveNumber,
          defeatedCount: this.defeatedCount,
          escapedCount: this.escapedCount,
          totalEnemies: this.totalToSpawn
        });
      }
    }
  }

  _clearSpawnTimer() {
    if (this.spawnTimer) {
      this.spawnTimer.remove(false);
      this.spawnTimer = null;
    }
  }

  isWaveComplete() {
    return this.state === 'completed';
  }

  getWaveNumber() {
    return this.waveNumber;
  }

  getWaveState() {
    return this.state;
  }

  getActiveEnemyCount() {
    return this.activeEnemies.size;
  }

  getRemainingEnemies() {
    const pending = Math.max(0, this.totalToSpawn - this.spawnedCount);
    return pending + this.activeEnemies.size;
  }

  /**
   * Detiene inmediatamente la generación de enemigos (por ejemplo, al perder la partida).
   */
  stop() {
    this._clearSpawnTimer();
    if (this.state !== 'completed') {
      this.state = 'stopped';
    }
  }

  /**
   * Reinicia el sistema de oleadas para comenzar una nueva partida desde cero.
   */
  reset() {
    this._clearSpawnTimer();
    this.activeEnemies.clear();
    this.waveNumber = 0;
    this.totalToSpawn = 0;
    this.spawnedCount = 0;
    this.defeatedCount = 0;
    this.escapedCount = 0;
    this.currentWaveConfig = null;
    this.state = 'idle';
  }

  /**
   * Libera temporizadores y referencias al destruir la escena.
   */
  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this._clearSpawnTimer();
    this.activeEnemies.clear();

    if (this.scene?.events && this._onShutdown) {
      this.scene.events.off('shutdown', this._onShutdown);
    }

    this.scene = null;
    this.enemyGroup = null;
    this.enemyBulletGroup = null;
    this.levelSystem = null;
    this.onWaveStart = null;
    this.onWaveComplete = null;
    this.onEnemySpawn = null;
    this.onEnemyEscape = null;
  }
}
