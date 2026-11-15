/**
 * Controla la progresión de niveles y calcula los parámetros de dificultad
 * que consume `WaveSystem` para generar cada oleada sin duplicar responsabilidades.
 */
export default class LevelSystem {
  /**
   * @param {object} [options={}] - Configuración de progresión.
   * @param {number} [options.initialLevel=1] - Nivel inicial.
   * @param {number|null} [options.maxLevel=null] - Nivel máximo opcional (`null` = infinito).
   * @param {number} [options.wavesPerLevel=1] - Oleadas necesarias para subir de nivel.
   * @param {number} [options.baseEnemyCount=6] - Enemigos base en el nivel 1.
   * @param {number} [options.enemyCountIncrement=2] - Enemigos adicionales por nivel.
   * @param {number} [options.maxEnemyCount=30] - Tope máximo de enemigos por oleada.
   * @param {number} [options.baseSpawnInterval=1100] - Intervalo inicial entre spawns (ms).
   * @param {number} [options.spawnIntervalDecrement=75] - Reducción de intervalo por nivel (ms).
   * @param {number} [options.minSpawnInterval=350] - Intervalo mínimo entre spawns (ms).
   * @param {number} [options.baseSpeedMultiplier=1] - Multiplicador inicial de velocidad.
   * @param {number} [options.speedMultiplierStep=0.1] - Incremento del multiplicador por nivel.
   * @param {number} [options.maxSpeedMultiplier=2.2] - Tope del multiplicador de velocidad.
   * @param {number} [options.healthBonusEvery=3] - Cada cuántos niveles aumenta en +1 la salud base.
   * @param {number} [options.maxHealthBonus=3] - Tope de salud extra por progresión.
   * @param {number} [options.enemyShootingFromLevel=4] - Nivel desde el cual enemigos pueden disparar.
   * @param {Function} [options.onLevelUp] - Callback `({ level, difficulty }) => void`.
   */
  constructor(options = {}) {
    this.initialLevel = Number.isFinite(options.initialLevel) && options.initialLevel >= 1
      ? Math.floor(options.initialLevel)
      : 1;
    this.maxLevel = Number.isFinite(options.maxLevel) && options.maxLevel >= this.initialLevel
      ? Math.floor(options.maxLevel)
      : null;
    this.wavesPerLevel = Number.isFinite(options.wavesPerLevel) && options.wavesPerLevel >= 1
      ? Math.floor(options.wavesPerLevel)
      : 1;

    this.baseEnemyCount = Number.isFinite(options.baseEnemyCount) && options.baseEnemyCount > 0
      ? Math.floor(options.baseEnemyCount)
      : 6;
    this.enemyCountIncrement = Number.isFinite(options.enemyCountIncrement) && options.enemyCountIncrement >= 0
      ? Math.floor(options.enemyCountIncrement)
      : 2;
    this.maxEnemyCount = Number.isFinite(options.maxEnemyCount) && options.maxEnemyCount >= this.baseEnemyCount
      ? Math.floor(options.maxEnemyCount)
      : 30;

    this.baseSpawnInterval = Number.isFinite(options.baseSpawnInterval) && options.baseSpawnInterval > 0
      ? options.baseSpawnInterval
      : 1100;
    this.spawnIntervalDecrement = Number.isFinite(options.spawnIntervalDecrement) && options.spawnIntervalDecrement >= 0
      ? options.spawnIntervalDecrement
      : 75;
    this.minSpawnInterval = Number.isFinite(options.minSpawnInterval) && options.minSpawnInterval > 0
      ? options.minSpawnInterval
      : 350;

    this.baseSpeedMultiplier = Number.isFinite(options.baseSpeedMultiplier) && options.baseSpeedMultiplier > 0
      ? options.baseSpeedMultiplier
      : 1;
    this.speedMultiplierStep = Number.isFinite(options.speedMultiplierStep) && options.speedMultiplierStep >= 0
      ? options.speedMultiplierStep
      : 0.1;
    this.maxSpeedMultiplier = Number.isFinite(options.maxSpeedMultiplier) && options.maxSpeedMultiplier >= this.baseSpeedMultiplier
      ? options.maxSpeedMultiplier
      : 2.2;

    this.healthBonusEvery = Number.isFinite(options.healthBonusEvery) && options.healthBonusEvery > 0
      ? Math.floor(options.healthBonusEvery)
      : 3;
    this.maxHealthBonus = Number.isFinite(options.maxHealthBonus) && options.maxHealthBonus >= 0
      ? Math.floor(options.maxHealthBonus)
      : 3;

    this.enemyShootingFromLevel = Number.isFinite(options.enemyShootingFromLevel)
      ? Math.floor(options.enemyShootingFromLevel)
      : 4;

    this.onLevelUp = typeof options.onLevelUp === 'function' ? options.onLevelUp : null;

    this.level = this.initialLevel;
    this.wavesCompletedInLevel = 0;
    this.lastCompletedWaveId = null;
  }

  /**
   * Registra la finalización de una oleada y avanza de nivel si se cumple `wavesPerLevel`.
   * Evita incrementos repetidos si recibe el mismo `waveId`.
   *
   * @param {number|string|null} [waveId=null] - Identificador único de la oleada completada.
   * @returns {{ leveledUp: boolean, level: number, difficulty: object }}
   */
  recordWaveCompleted(waveId = null) {
    if (waveId !== null && waveId !== undefined && waveId === this.lastCompletedWaveId) {
      return {
        leveledUp: false,
        level: this.level,
        difficulty: this.getDifficulty()
      };
    }

    if (waveId !== null && waveId !== undefined) {
      this.lastCompletedWaveId = waveId;
    }

    this.wavesCompletedInLevel += 1;

    let leveledUp = false;
    if (this.wavesCompletedInLevel >= this.wavesPerLevel) {
      const prevLevel = this.level;
      this.nextLevel();
      leveledUp = this.level > prevLevel;
    }

    return {
      leveledUp,
      level: this.level,
      difficulty: this.getDifficulty()
    };
  }

  /**
   * Avanza directamente al siguiente nivel respetando `maxLevel`.
   *
   * @returns {number} Nivel actualizado.
   */
  nextLevel() {
    this.wavesCompletedInLevel = 0;

    if (this.maxLevel !== null && this.level >= this.maxLevel) {
      return this.level;
    }

    this.level += 1;
    if (this.onLevelUp) {
      this.onLevelUp({
        level: this.level,
        difficulty: this.getDifficulty()
      });
    }

    return this.level;
  }

  getLevel() {
    return this.level;
  }

  getWavesCompletedInLevel() {
    return this.wavesCompletedInLevel;
  }

  isAtMaxLevel() {
    return this.maxLevel !== null && this.level >= this.maxLevel;
  }

  /**
   * Calcula los parámetros de dificultad correspondientes al nivel actual.
   *
   * @returns {{
   *   level: number,
   *   enemyCount: number,
   *   spawnInterval: number,
   *   speedMultiplier: number,
   *   healthBonus: number,
   *   enemyTypes: string[],
   *   enableEnemyShooting: boolean
   * }}
   */
  getDifficulty() {
    const offset = Math.max(0, this.level - 1);

    const enemyCount = Math.min(
      this.maxEnemyCount,
      this.baseEnemyCount + offset * this.enemyCountIncrement
    );

    const spawnInterval = Math.max(
      this.minSpawnInterval,
      this.baseSpawnInterval - offset * this.spawnIntervalDecrement
    );

    const rawSpeed = this.baseSpeedMultiplier + offset * this.speedMultiplierStep;
    const speedMultiplier = Math.min(this.maxSpeedMultiplier, Number(rawSpeed.toFixed(2)));

    const healthBonus = Math.min(
      this.maxHealthBonus,
      Math.floor(offset / this.healthBonusEvery)
    );

    const enemyTypes = ['basic'];
    if (this.level >= 2) {
      enemyTypes.push('fast');
    }
    if (this.level >= 3) {
      enemyTypes.push('tank');
    }

    return {
      level: this.level,
      enemyCount,
      spawnInterval,
      speedMultiplier,
      healthBonus,
      enemyTypes,
      enableEnemyShooting: this.level >= this.enemyShootingFromLevel
    };
  }

  /**
   * Reinicia el nivel y los contadores de progresión al estado inicial.
   */
  reset() {
    this.level = this.initialLevel;
    this.wavesCompletedInLevel = 0;
    this.lastCompletedWaveId = null;
  }
}

