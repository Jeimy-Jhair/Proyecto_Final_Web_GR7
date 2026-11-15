/**
 * Centraliza el registro y resolución de colisiones de física Arcade.
 * Garantiza un único registro de overlaps, prevención de impactos duplicados
 * y coordinación limpia con `ScoreSystem` y `WaveSystem`.
 */
export default class CollisionSystem {
  /**
   * @param {Phaser.Scene} scene - Escena con física Arcade activa.
   * @param {object} [groups={}] - Entidades y grupos a colisionar.
   * @param {import('../objects/Player.js').default} [groups.player] - Instancia del jugador.
   * @param {Phaser.Physics.Arcade.Group} [groups.playerBullets] - Grupo de balas del jugador.
   * @param {Phaser.Physics.Arcade.Group} [groups.enemies] - Grupo de enemigos.
   * @param {Phaser.Physics.Arcade.Group} [groups.enemyBullets] - Grupo opcional de balas enemigas.
   * @param {object} [systems={}] - Sistemas de gameplay acoplados.
   * @param {import('./ScoreSystem.js').default} [systems.scoreSystem] - Sistema de puntuación.
   * @param {import('./WaveSystem.js').default} [systems.waveSystem] - Sistema de oleadas.
   * @param {object} [callbacks={}] - Callbacks opcionales hacia la escena coordinadora.
   * @param {Function} [callbacks.onBulletHitEnemy] - `(bullet, enemy) => void`
   * @param {Function} [callbacks.onEnemyDefeated] - `(enemy) => void`
   * @param {Function} [callbacks.onPlayerHit] - `({ player, source, lives }) => void`
   * @param {Function} [callbacks.onPlayerDeath] - `(player) => void`
   */
  constructor(scene, groups = {}, systems = {}, callbacks = {}) {
    if (!scene) {
      throw new Error('CollisionSystem requiere una escena válida.');
    }

    this.scene = scene;
    this.groups = {
      player: groups.player || null,
      playerBullets: groups.playerBullets || null,
      enemies: groups.enemies || null,
      enemyBullets: groups.enemyBullets || null
    };
    this.systems = {
      scoreSystem: systems.scoreSystem || null,
      waveSystem: systems.waveSystem || null
    };
    this.callbacks = {
      onBulletHitEnemy: typeof callbacks.onBulletHitEnemy === 'function' ? callbacks.onBulletHitEnemy : null,
      onEnemyDefeated: typeof callbacks.onEnemyDefeated === 'function' ? callbacks.onEnemyDefeated : null,
      onPlayerHit: typeof callbacks.onPlayerHit === 'function' ? callbacks.onPlayerHit : null,
      onPlayerDeath: typeof callbacks.onPlayerDeath === 'function' ? callbacks.onPlayerDeath : null
    };

    this.colliders = [];
    this.initialized = false;
    this._destroyed = false;

    this._onShutdown = () => this.destroy();
    this.scene.events?.once('shutdown', this._onShutdown);
  }

  /**
   * Registra los overlaps necesarios en `scene.physics.add` una sola vez.
   *
   * @returns {boolean} `true` si se registraron colisiones nuevas.
   */
  setupCollisions() {
    if (this._destroyed || this.initialized || !this.scene?.physics?.add) {
      return false;
    }

    const { player, playerBullets, enemies, enemyBullets } = this.groups;

    if (playerBullets && enemies) {
      const bulletEnemyCollider = this.scene.physics.add.overlap(
        playerBullets,
        enemies,
        this.handleBulletEnemyCollision,
        null,
        this
      );
      this.colliders.push(bulletEnemyCollider);
    }

    if (player && enemies) {
      const playerEnemyCollider = this.scene.physics.add.overlap(
        player,
        enemies,
        this.handlePlayerEnemyCollision,
        null,
        this
      );
      this.colliders.push(playerEnemyCollider);
    }

    if (player && enemyBullets) {
      const enemyBulletCollider = this.scene.physics.add.overlap(
        player,
        enemyBullets,
        this.handleEnemyBulletPlayerCollision,
        null,
        this
      );
      this.colliders.push(enemyBulletCollider);
    }

    this.initialized = true;
    return true;
  }

  /**
   * Resuelve el impacto de un proyectil aliado contra un enemigo.
   *
   * @param {import('../objects/Bullet.js').default} bullet
   * @param {import('../objects/Enemy.js').default} enemy
   * @returns {boolean} `true` si el impacto fue procesado.
   */
  handleBulletEnemyCollision(bullet, enemy) {
    if (!bullet?.active || !enemy?.active) {
      return false;
    }

    if (typeof bullet.isFromPlayer === 'function' && !bullet.isFromPlayer()) {
      return false;
    }

    if (typeof enemy.isAlive === 'function' && !enemy.isAlive()) {
      return false;
    }

    if (typeof bullet.consumeHit === 'function' && !bullet.consumeHit()) {
      return false;
    }

    const damage = typeof bullet.getDamage === 'function' ? bullet.getDamage() : 1;
    const damageApplied = typeof enemy.takeDamage === 'function' ? enemy.takeDamage(damage) : false;

    if (!damageApplied) {
      return false;
    }

    if (this.callbacks.onBulletHitEnemy) {
      this.callbacks.onBulletHitEnemy(bullet, enemy);
    }

    const isDefeated = typeof enemy.isAlive === 'function' ? !enemy.isAlive() : !enemy.active;
    if (isDefeated) {
      const points = typeof enemy.getScoreValue === 'function' ? enemy.getScoreValue() : 0;
      this.systems.scoreSystem?.addPoints(points);
      this.systems.waveSystem?.onEnemyDefeated(enemy);

      if (this.callbacks.onEnemyDefeated) {
        this.callbacks.onEnemyDefeated(enemy);
      }
    }

    return true;
  }

  /**
   * Resuelve el contacto directo entre el jugador y un enemigo.
   *
   * @param {import('../objects/Player.js').default} player
   * @param {import('../objects/Enemy.js').default} enemy
   * @returns {boolean} `true` si se aplicó daño por contacto.
   */
  handlePlayerEnemyCollision(player, enemy) {
    if (!player?.active || !enemy?.active) {
      return false;
    }

    if (typeof player.isAlive === 'function' && !player.isAlive()) {
      return false;
    }

    if (typeof enemy.isAlive === 'function' && !enemy.isAlive()) {
      return false;
    }

    const contactDamage = typeof enemy.getDamage === 'function' ? enemy.getDamage() : 1;
    const damaged = typeof player.takeDamage === 'function' ? player.takeDamage(contactDamage) : false;

    if (!damaged) {
      return false;
    }

    // El enemigo se destruye por el choque sin otorgar puntuación, pero se descuenta de la oleada
    if (typeof enemy.deactivate === 'function') {
      enemy.deactivate();
    }
    this.systems.waveSystem?.onEnemyRemoved(enemy, 'collision');

    this._notifyPlayerHit(player, enemy);
    return true;
  }

  /**
   * Resuelve el impacto de un proyectil enemigo contra el jugador.
   *
   * @param {import('../objects/Player.js').default} player
   * @param {import('../objects/Bullet.js').default} bullet
   * @returns {boolean} `true` si el impacto fue procesado.
   */
  handleEnemyBulletPlayerCollision(player, bullet) {
    if (!player?.active || !bullet?.active) {
      return false;
    }

    if (typeof player.isAlive === 'function' && !player.isAlive()) {
      return false;
    }

    if (typeof bullet.isFromEnemy === 'function' && !bullet.isFromEnemy()) {
      return false;
    }

    if (typeof player.isInvulnerable === 'function' && player.isInvulnerable()) {
      return false;
    }

    if (typeof bullet.consumeHit === 'function' && !bullet.consumeHit()) {
      return false;
    }

    const damage = typeof bullet.getDamage === 'function' ? bullet.getDamage() : 1;
    const damaged = typeof player.takeDamage === 'function' ? player.takeDamage(damage) : false;

    if (!damaged) {
      return false;
    }

    this._notifyPlayerHit(player, bullet);
    return true;
  }

  _notifyPlayerHit(player, source) {
    if (this.callbacks.onPlayerHit) {
      this.callbacks.onPlayerHit({
        player,
        source,
        lives: typeof player.getLives === 'function' ? player.getLives() : 0
      });
    }

    const playerDead = typeof player.isAlive === 'function' ? !player.isAlive() : !player.active;
    if (playerDead) {
      this.systems.waveSystem?.stop();
      if (this.callbacks.onPlayerDeath) {
        this.callbacks.onPlayerDeath(player);
      }
    }
  }

  /**
   * Permite actualizar referencias si la escena recrea entidades sin reinstanciar el sistema.
   *
   * @param {object} [groups={}]
   */
  setGroups(groups = {}) {
    if (this.initialized) {
      this._removeColliders();
      this.initialized = false;
    }
    this.groups = { ...this.groups, ...groups };
  }

  _removeColliders() {
    const world = this.scene?.physics?.world;
    this.colliders.forEach((collider) => {
      if (collider && world && typeof world.removeCollider === 'function') {
        world.removeCollider(collider);
      }
    });
    this.colliders = [];
  }

  /**
   * Elimina todos los colliders registrados y limpia referencias.
   */
  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this._removeColliders();

    if (this.scene?.events && this._onShutdown) {
      this.scene.events.off('shutdown', this._onShutdown);
    }

    this.groups = {};
    this.systems = {};
    this.callbacks = {};
    this.scene = null;
  }
}

