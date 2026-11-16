export default class LevelSystem {
  constructor(options = {}) {
    this.initialLevel = Number.isFinite(options.initialLevel) && options.initialLevel >= 1
      ? Math.floor(options.initialLevel)
      : 1;
    this.maxLevel = Number.isFinite(options.maxLevel) && options.maxLevel >= this.initialLevel
      ? Math.floor(options.maxLevel)
      : null;
    this.victoryWave = Number.isFinite(options.victoryWave) && options.victoryWave > 0
      ? Math.floor(options.victoryWave)
      : null;
    this.wavesPerLevel = Number.isFinite(options.wavesPerLevel) && options.wavesPerLevel >= 1
      ? Math.floor(options.wavesPerLevel)
      : 1;

    this.enemiesPerLevel = Number.isFinite(options.enemiesPerLevel) && options.enemiesPerLevel > 0
      ? Math.floor(options.enemiesPerLevel)
      : 20;
    this.defeatedEnemies = Number.isFinite(options.defeatedEnemies) && options.defeatedEnemies >= 0
      ? Math.floor(options.defeatedEnemies)
      : 0;
    this.defeatedEnemyIds = new Set();

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

  recordEnemyDefeated(enemy = null) {
    if (enemy) {
      if (this.defeatedEnemyIds.has(enemy)) {
        return {
          leveledUp: false,
          level: this.level,
          defeatedEnemies: this.defeatedEnemies
        };
      }
      this.defeatedEnemyIds.add(enemy);
    }

    this.defeatedEnemies += 1;
    const targetLevel = Math.floor(this.defeatedEnemies / this.enemiesPerLevel) + 1;
    let leveledUp = false;

    if (targetLevel > this.level) {
      const prevLevel = this.level;
      while (this.level < targetLevel && (this.maxLevel === null || this.level < this.maxLevel)) {
        this.level += 1;
        if (this.onLevelUp) {
          this.onLevelUp({
            level: this.level,
            difficulty: this.getDifficulty()
          });
        }
      }
      leveledUp = this.level > prevLevel;
    }

    return {
      leveledUp,
      level: this.level,
      defeatedEnemies: this.defeatedEnemies
    };
  }

  getDefeatedEnemies() {
    return this.defeatedEnemies;
  }

  getEnemiesInCurrentLevel() {
    return this.defeatedEnemies % this.enemiesPerLevel;
  }

  getEnemiesNeededForNextLevel() {
    return this.enemiesPerLevel;
  }

  getEnemiesProgress() {
    return (this.defeatedEnemies % this.enemiesPerLevel) / this.enemiesPerLevel;
  }

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

  isVictoryWave(waveNumber) {
    return this.victoryWave !== null && Number.isFinite(waveNumber) && waveNumber >= this.victoryWave;
  }

  getVictoryWave() {
    return this.victoryWave;
  }

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

  reset() {
    this.level = this.initialLevel;
    this.wavesCompletedInLevel = 0;
    this.lastCompletedWaveId = null;
    this.defeatedEnemies = 0;
    this.defeatedEnemyIds.clear();
  }
}
