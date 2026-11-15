import Phaser from 'phaser';
import Bullet from './Bullet.js';
import ensureTexture from './ensureTexture.js';
import { acquireFromGroup } from './poolHelper.js';

function ensurePlayerTexture(scene, key) {
  return ensureTexture(scene, key, 40, 40, (graphics, width, height) => {
    graphics.fillStyle(0x3a86ff, 1);
    graphics.fillTriangle(width / 2, 2, 4, height - 4, width - 4, height - 4);
    graphics.fillStyle(0x8ecae6, 1);
    graphics.fillTriangle(width / 2, 10, width / 2 - 7, height - 10, width / 2 + 7, height - 10);
    graphics.fillStyle(0xffbe0b, 1);
    graphics.fillRect(width / 2 - 5, height - 6, 10, 4);
  });
}

/**
 * Representa la nave/personaje del jugador.
 * Administra movimiento normalizado en 8 direcciones, límites del área jugable,
 * disparo con cadencia e invulnerabilidad basadas en `delta` (pausables con la escena) y vidas.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - Escena de Phaser.
   * @param {number} x - Posición inicial X.
   * @param {number} y - Posición inicial Y.
   * @param {object} [options={}] - Configuración del jugador.
   * @param {string} [options.texture='player'] - Clave de textura en Phaser.
   * @param {number} [options.speed=320] - Velocidad de desplazamiento en px/s.
   * @param {number} [options.maxLives=3] - Vidas máximas e iniciales.
   * @param {number} [options.lives] - Vidas iniciales (por defecto `maxLives`).
   * @param {number} [options.fireRate=220] - Tiempo mínimo entre disparos en ms.
   * @param {number} [options.bulletSpeed=540] - Velocidad de los proyectiles disparados.
   * @param {number} [options.bulletDamage=1] - Daño de los proyectiles disparados.
   * @param {string} [options.bulletTexture='bullet_player'] - Textura de proyectil.
   * @param {Phaser.Physics.Arcade.Group} [options.bulletGroup=null] - Grupo de proyectiles del jugador.
   * @param {number} [options.invulnerabilityDuration=1000] - Duración de invulnerabilidad tras daño (ms).
   * @param {{minX?: number, maxX?: number, minY?: number, maxY?: number}} [options.bounds] - Límites del área jugable.
   * @param {object} [options.controls] - Controles externos `{ cursors, wasd, shootKey }`.
   * @param {Function} [options.onShoot] - Callback `(bullet) => void`.
   * @param {Function} [options.onDamage] - Callback `({ lives, maxLives, amount }) => void`.
   * @param {Function} [options.onDeath] - Callback `() => void`.
   */
  constructor(scene, x, y, options = {}) {
    const rawKey = options.texture || 'player';
    const textureKey = ensurePlayerTexture(scene, rawKey);
    super(scene, x, y, textureKey, options.frame);

    this.speed = Number.isFinite(options.speed) && options.speed > 0 ? options.speed : 320;
    this.maxLives = Number.isFinite(options.maxLives) && options.maxLives > 0 ? Math.floor(options.maxLives) : 3;
    this.lives = Number.isFinite(options.lives)
      ? Math.max(0, Math.min(this.maxLives, Math.floor(options.lives)))
      : this.maxLives;

    this.fireRate = Number.isFinite(options.fireRate) && options.fireRate >= 0 ? options.fireRate : 220;
    this.bulletSpeed = Number.isFinite(options.bulletSpeed) && options.bulletSpeed > 0 ? options.bulletSpeed : 540;
    this.bulletDamage = Number.isFinite(options.bulletDamage) && options.bulletDamage > 0 ? options.bulletDamage : 1;
    this.bulletTexture = options.bulletTexture || 'bullet_player';
    this.bulletGroup = options.bulletGroup || null;

    this.invulnerabilityDuration =
      Number.isFinite(options.invulnerabilityDuration) && options.invulnerabilityDuration >= 0
        ? options.invulnerabilityDuration
        : 1000;

    this.bounds = {
      minX: options.bounds?.minX ?? 0,
      maxX: options.bounds?.maxX ?? (scene?.scale?.width ?? 800),
      minY: options.bounds?.minY ?? 0,
      maxY: options.bounds?.maxY ?? (scene?.scale?.height ?? 600)
    };

    this.onShoot = typeof options.onShoot === 'function' ? options.onShoot : null;
    this.onDamage = typeof options.onDamage === 'function' ? options.onDamage : null;
    this.onDeath = typeof options.onDeath === 'function' ? options.onDeath : null;

    this.alive = this.lives > 0;
    this._fireCooldownRemaining = 0;
    this._invulnerabilityRemaining = 0;
    this._elapsedActiveTime = 0;
    this.manualInput = null;
    this._ownsControls = false;
    this.controls = this._initControls(options.controls);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    if (this.body) {
      this.body.setAllowGravity(false);
      this.setDisplaySize(40, 40);
      const bodyW = Math.round(this.width * 1.25);
      const bodyH = Math.round(this.height * 1.25);
      this.body.setSize(bodyW, bodyH, false);
      this.body.setOffset(this.width * (1 - 1.25) / 2, this.height * (1 - 1.25) / 2);
    } else {
      this.setDisplaySize(40, 40);
    }

    this._clampToBounds();
  }

  _initControls(externalControls) {
    if (externalControls) {
      return externalControls;
    }

    const keyboard = this.scene?.input?.keyboard;
    if (!keyboard) {
      return null;
    }

    this._ownsControls = true;
    return {
      cursors: keyboard.createCursorKeys(),
      wasd: keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      }),
      shootKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    };
  }

  _readInputState() {
    if (this.manualInput) {
      return {
        left: Boolean(this.manualInput.left),
        right: Boolean(this.manualInput.right),
        up: Boolean(this.manualInput.up),
        down: Boolean(this.manualInput.down),
        shoot: Boolean(this.manualInput.shoot)
      };
    }

    const cursors = this.controls?.cursors;
    const wasd = this.controls?.wasd;
    const shootKey = this.controls?.shootKey;

    return {
      left: Boolean(cursors?.left?.isDown || wasd?.left?.isDown),
      right: Boolean(cursors?.right?.isDown || wasd?.right?.isDown),
      up: Boolean(cursors?.up?.isDown || wasd?.up?.isDown),
      down: Boolean(cursors?.down?.isDown || wasd?.down?.isDown),
      shoot: Boolean(shootKey?.isDown || cursors?.space?.isDown)
    };
  }

  _getClampedLimits() {
    const halfW = this.displayWidth * 0.5;
    const halfH = this.displayHeight * 0.5;
    const minX = this.bounds.minX + halfW;
    const maxX = Math.max(minX, this.bounds.maxX - halfW);
    const minY = this.bounds.minY + halfH;
    const maxY = Math.max(minY, this.bounds.maxY - halfH);
    return { minX, maxX, minY, maxY };
  }

  _clampToBounds() {
    const { minX, maxX, minY, maxY } = this._getClampedLimits();
    const clampedX = Math.max(minX, Math.min(maxX, this.x));
    const clampedY = Math.max(minY, Math.min(maxY, this.y));

    if (clampedX !== this.x || clampedY !== this.y) {
      this.x = clampedX;
      this.y = clampedY;
      this.body?.updateFromGameObject?.();
    }
  }

  /**
   * Establece entrada programática/virtual (útil para controles táctiles o pruebas).
   * Pasar `null` devuelve el control al teclado.
   *
   * @param {{left?: boolean, right?: boolean, up?: boolean, down?: boolean, shoot?: boolean}|null} input
   */
  setMovementInput(input) {
    this.manualInput = input ? { ...input } : null;
  }

  /**
   * Asigna o reemplaza el grupo de proyectiles del jugador.
   *
   * @param {Phaser.Physics.Arcade.Group} group
   */
  setBulletGroup(group) {
    this.bulletGroup = group || null;
  }

  /**
   * Calcula y aplica la velocidad normalizada del jugador y respeta los límites del escenario.
   */
  move() {
    if (!this.alive || !this.active) {
      if (this.body) {
        this.setVelocity(0, 0);
      }
      return;
    }

    this._clampToBounds();

    const input = this._readInputState();
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    const { minX, maxX, minY, maxY } = this._getClampedLimits();
    if ((this.x <= minX && dx < 0) || (this.x >= maxX && dx > 0)) {
      dx = 0;
    }
    if ((this.y <= minY && dy < 0) || (this.y >= maxY && dy > 0)) {
      dy = 0;
    }

    if (dx !== 0 && dy !== 0) {
      const invSqrt2 = Math.SQRT1_2;
      dx *= invSqrt2;
      dy *= invSqrt2;
    }

    if (this.body) {
      this.setVelocity(dx * this.speed, dy * this.speed);
    } else {
      const dt = (this.scene?.game?.loop?.delta ?? 16.67) / 1000;
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
      this._clampToBounds();
    }
  }

  /**
   * Indica si el jugador puede disparar en este instante según su estado y cadencia.
   *
   * @returns {boolean}
   */
  canShoot() {
    if (!this.alive || !this.active) {
      return false;
    }
    return this._fireCooldownRemaining <= 0;
  }

  /**
   * Dispara un proyectil hacia arriba si la cadencia lo permite.
   *
   * @param {Phaser.Physics.Arcade.Group} [targetGroup=this.bulletGroup] - Grupo opcional de proyectiles.
   * @returns {Bullet|null} El proyectil disparado o `null` si está en cooldown o inactivo.
   */
  shoot(targetGroup = this.bulletGroup) {
    if (!this.canShoot()) {
      return null;
    }

    const spawnX = this.x;
    const spawnY = this.y - this.displayHeight * 0.5;
    const bulletOptions = {
      owner: 'player',
      damage: this.bulletDamage,
      speed: this.bulletSpeed,
      direction: { x: 0, y: -1 },
      texture: this.bulletTexture,
      bounds: this.bounds
    };

    const bullet = acquireFromGroup(
      targetGroup,
      Bullet,
      () => new Bullet(this.scene, spawnX, spawnY, { ...bulletOptions, autoFire: false }),
      spawnX,
      spawnY
    );

    if (!bullet) {
      return null;
    }

    if (typeof bullet.fire === 'function') {
      bullet.fire(spawnX, spawnY, bulletOptions);
    }

    this._fireCooldownRemaining = this.fireRate;
    if (this.onShoot) {
      this.onShoot(bullet);
    }
    return bullet;
  }

  /**
   * Actualiza los temporizadores internos del jugador usando `delta`, de modo que
   * la cadencia e invulnerabilidad se congelen automáticamente durante `scene.pause()`.
   */
  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (!this.active || !this.alive || !Number.isFinite(delta) || delta <= 0) {
      return;
    }

    this._elapsedActiveTime += delta;
    if (this._fireCooldownRemaining > 0) {
      this._fireCooldownRemaining = Math.max(0, this._fireCooldownRemaining - delta);
    }
    if (this._invulnerabilityRemaining > 0) {
      this._invulnerabilityRemaining = Math.max(0, this._invulnerabilityRemaining - delta);
    }
  }

  /**
   * Ciclo por frame: mueve al jugador, mantiene límites y dispara si la acción está activa.
   */
  update() {
    if (!this.alive || !this.active) {
      if (this.body) {
        this.setVelocity(0, 0);
      }
      return;
    }

    this.move();

    const input = this._readInputState();
    if (input.shoot) {
      this.shoot();
    }

    // Retroalimentación visual sutil durante invulnerabilidad temporal
    if (this.isInvulnerable()) {
      this.setAlpha(Math.floor(this._elapsedActiveTime / 80) % 2 === 0 ? 0.45 : 1);
    } else if (this.alpha !== 1) {
      this.setAlpha(1);
    }
  }

  /**
   * Indica si el jugador está actualmente protegido por invulnerabilidad temporal.
   *
   * @returns {boolean}
   */
  isInvulnerable() {
    return this._invulnerabilityRemaining > 0;
  }

  /**
   * Aplica daño al jugador y actualiza sus vidas.
   *
   * @param {number} [amount=1] - Cantidad de vidas/daño a restar.
   * @param {boolean} [ignoreInvulnerability=false] - Si `true`, ignora los i-frames actuales.
   * @returns {boolean} `true` si el daño fue aplicado.
   */
  takeDamage(amount = 1, ignoreInvulnerability = false) {
    if (!this.alive || !this.active || !Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    if (!ignoreInvulnerability && this.isInvulnerable()) {
      return false;
    }

    const applied = Math.max(1, Math.floor(amount));
    this.lives = Math.max(0, this.lives - applied);
    this._invulnerabilityRemaining = this.invulnerabilityDuration;

    if (this.onDamage) {
      this.onDamage({
        lives: this.lives,
        maxLives: this.maxLives,
        amount: applied
      });
    }

    if (this.lives <= 0) {
      this.alive = false;
      this._invulnerabilityRemaining = 0;
      this.setAlpha(1);
      if (this.body) {
        this.disableBody(true, true);
      } else {
        this.setActive(false);
        this.setVisible(false);
      }
      if (this.onDeath) {
        this.onDeath();
      }
    }

    return true;
  }

  getLives() {
    return this.lives;
  }

  getMaxLives() {
    return this.maxLives;
  }

  isAlive() {
    return this.alive;
  }

  /**
   * Restaura al jugador a su estado inicial en la posición `(x, y)` para una nueva partida.
   *
   * @param {number} x
   * @param {number} y
   */
  reset(x, y) {
    this.lives = this.maxLives;
    this.alive = true;
    this._fireCooldownRemaining = 0;
    this._invulnerabilityRemaining = 0;
    this._elapsedActiveTime = 0;
    this.manualInput = null;
    this.setAlpha(1);

    if (this.body) {
      this.enableBody(true, x, y, true, true);
      this.body.setAllowGravity(false);
    } else {
      this.setPosition(x, y);
      this.setActive(true);
      this.setVisible(true);
    }

    this._clampToBounds();
  }

  destroy(fromScene) {
    if (this._ownsControls && this.scene?.input?.keyboard && this.controls) {
      const keyboard = this.scene.input.keyboard;
      const { cursors, wasd, shootKey } = this.controls;
      if (cursors) {
        Object.values(cursors).forEach((key) => {
          if (key) keyboard.removeKey(key, true);
        });
      }
      if (wasd) {
        Object.values(wasd).forEach((key) => {
          if (key) keyboard.removeKey(key, true);
        });
      }
      if (shootKey) {
        keyboard.removeKey(shootKey, true);
      }
    }

    this.controls = null;
    this.manualInput = null;
    this.bulletGroup = null;
    this.onShoot = null;
    this.onDamage = null;
    this.onDeath = null;

    super.destroy(fromScene);
  }
}
