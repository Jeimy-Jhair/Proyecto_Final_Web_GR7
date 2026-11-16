import Phaser from 'phaser';
import Bullet from './Bullet.js';
import ensureTexture from './ensureTexture.js';
import { acquireFromGroup } from './poolHelper.js';
import { draw8BitPlayer } from '../ui/PixelArt.js';

function ensurePlayerTexture(scene, key) {
  return ensureTexture(scene, key, 54, 54, (graphics, width, height) => {
    draw8BitPlayer(graphics, width, height);
  });
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
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

    this.thrusters = scene.add?.graphics ? scene.add.graphics() : null;
    if (this.thrusters) {
      this.thrusters.setDepth(this.depth - 1);
    }

    const shipSize = options.displaySize ?? 54;
    this.setDisplaySize(shipSize, shipSize);

    if (this.body) {
      this.body.setAllowGravity(false);
      const bodyW = Math.round(this.width * 0.9);
      const bodyH = Math.round(this.height * 0.9);
      this.body.setSize(bodyW, bodyH, false);
      this.body.setOffset(this.width * (1 - 0.9) / 2, this.height * (1 - 0.9) / 2);
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

  setMovementInput(input) {
    this.manualInput = input ? { ...input } : null;
  }

  setBulletGroup(group) {
    this.bulletGroup = group || null;
  }

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

  canShoot() {
    if (!this.alive || !this.active) {
      return false;
    }
    return this._fireCooldownRemaining <= 0;
  }

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

  update() {
    if (!this.alive || !this.active) {
      if (this.body) {
        this.setVelocity(0, 0);
      }
      this.thrusters?.clear();
      return;
    }

    this.move();

    const input = this._readInputState();
    if (input.shoot) {
      this.shoot();
    }

    if (this.isInvulnerable()) {
      const isRed = Math.floor(this._elapsedActiveTime / 75) % 2 === 0;
      if (isRed) {
        this.setTint(0xff1111);
        this.setAlpha(0.65);
      } else {
        this.clearTint();
        this.setAlpha(1);
      }
    } else {
      if (this.alpha !== 1) {
        this.setAlpha(1);
      }
      this.clearTint();
    }

    if (this.thrusters) {
      this.thrusters.clear();
      const isMoving = Boolean(input.up || input.down || input.left || input.right);
      const flicker = Math.floor(this._elapsedActiveTime / 80) % 2 === 0;
      const flameLen = (isMoving ? 10 : 6) + (flicker ? 3 : 0);

      this.thrusters.fillStyle(0xf97316, 0.9);
      this.thrusters.fillRect(this.x - 9, this.y + 22, 5, flameLen);
      this.thrusters.fillRect(this.x + 4, this.y + 22, 5, flameLen);

      this.thrusters.fillStyle(0xfacc15, 1);
      this.thrusters.fillRect(this.x - 8, this.y + 22, 3, Math.max(2, flameLen - 3));
      this.thrusters.fillRect(this.x + 5, this.y + 22, 3, Math.max(2, flameLen - 3));
    }
  }

  isInvulnerable() {
    return this._invulnerabilityRemaining > 0;
  }

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
    this.setTint(0xff0000);

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
      this.clearTint();
      this.setAlpha(1);
      this.thrusters?.clear();
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

  reset(x, y) {
    this.lives = this.maxLives;
    this.alive = true;
    this._fireCooldownRemaining = 0;
    this._invulnerabilityRemaining = 0;
    this._elapsedActiveTime = 0;
    this.manualInput = null;
    this.clearTint();
    this.setAlpha(1);
    this.thrusters?.clear();

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

    this.thrusters?.destroy();
    this.thrusters = null;
    this.controls = null;
    this.manualInput = null;
    this.bulletGroup = null;
    this.onShoot = null;
    this.onDamage = null;
    this.onDeath = null;

    super.destroy(fromScene);
  }
}
