import Phaser from 'phaser';
import Bullet from './Bullet.js';
import ensureTexture from './ensureTexture.js';
import { acquireFromGroup } from './poolHelper.js';
import { draw8BitEnemy } from '../ui/PixelArt.js';

export const ENEMY_TYPES = {
  basic: {
    texture: 'enemy_basic',
    width: 48,
    height: 48,
    color: 0xe63946,
    speed: 120,
    health: 1,
    scoreValue: 100,
    damage: 1,
    pattern: 'straight',
    amplitude: 0,
    frequency: 0,
    canShoot: false,
    fireRate: 2200,
    bulletSpeed: 280,
    bulletDamage: 1
  },
  fast: {
    texture: 'enemy_fast',
    width: 42,
    height: 42,
    color: 0xf77f00,
    speed: 190,
    health: 1,
    scoreValue: 150,
    damage: 1,
    pattern: 'zigzag',
    amplitude: 110,
    frequency: 0.005,
    canShoot: false,
    fireRate: 2000,
    bulletSpeed: 310,
    bulletDamage: 1
  },
  tank: {
    texture: 'enemy_tank',
    width: 68,
    height: 68,
    color: 0x9b5de5,
    speed: 75,
    health: 3,
    scoreValue: 300,
    damage: 2,
    pattern: 'straight',
    amplitude: 0,
    frequency: 0,
    canShoot: false,
    fireRate: 2500,
    bulletSpeed: 260,
    bulletDamage: 1
  }
};

function ensureEnemyTexture(scene, key, preset) {
  const w = preset.width || 48;
  const h = preset.height || 48;
  const typeKey = preset.texture?.replace('enemy_', '') || 'basic';

  return ensureTexture(scene, key, w, h, (graphics, width, height) => {
    draw8BitEnemy(graphics, typeKey, width, height);
  });
}

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x = 0, y = 0, textureOrOptions = 'enemy_basic', frame = undefined) {
    const isOptionsObj = typeof textureOrOptions === 'object' && textureOrOptions !== null;
    const options = isOptionsObj ? textureOrOptions : {};
    const typeKey = options.type && ENEMY_TYPES[options.type] ? options.type : 'basic';
    const preset = ENEMY_TYPES[typeKey];

    const rawKey = isOptionsObj
      ? (options.texture || preset.texture)
      : (textureOrOptions || preset.texture);

    const textureKey = ensureEnemyTexture(scene, rawKey, preset);
    super(scene, x, y, textureKey, isOptionsObj ? options.frame : frame);

    this.enemyType = typeKey;
    this.speed = preset.speed;
    this.maxHealth = preset.health;
    this.health = preset.health;
    this.scoreValue = preset.scoreValue;
    this.damage = preset.damage;
    this.pattern = preset.pattern;
    this.amplitude = preset.amplitude;
    this.frequency = preset.frequency;
    this.canShoot = preset.canShoot;
    this.fireRate = preset.fireRate;
    this.bulletSpeed = preset.bulletSpeed;
    this.bulletDamage = preset.bulletDamage;
    this.bulletGroup = null;

    this.alive = false;
    this.defeatedProcessed = false;
    this.escaped = false;
    this._elapsedAlive = 0;
    this._shootCooldownRemaining = 0;
    this._zigzagSign = 1;

    this.bounds = this._resolveBounds(options.bounds);
    this.onDefeated = null;
    this.onEscape = null;
    this.onShoot = null;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    if (this.body) {
      this.body.setAllowGravity(false);
    }

    if (isOptionsObj && options.autoSpawn !== false) {
      this.spawn(x, y, options);
    }
  }

  _resolveBounds(customBounds) {
    return {
      minX: customBounds?.minX ?? 0,
      maxX: customBounds?.maxX ?? (this.scene?.scale?.width ?? 800),
      minY: customBounds?.minY ?? 0,
      maxY: customBounds?.maxY ?? (this.scene?.scale?.height ?? 600)
    };
  }

  spawn(x, y, options = {}) {
    const typeKey = options.type && ENEMY_TYPES[options.type] ? options.type : 'basic';
    const preset = ENEMY_TYPES[typeKey];

    this.enemyType = typeKey;
    this.speed = Number.isFinite(options.speed) && options.speed > 0 ? options.speed : preset.speed;
    this.maxHealth = Number.isFinite(options.health) && options.health > 0 ? Math.floor(options.health) : preset.health;
    this.health = this.maxHealth;
    this.scoreValue = Number.isFinite(options.scoreValue) && options.scoreValue >= 0
      ? Math.floor(options.scoreValue)
      : preset.scoreValue;
    this.damage = Number.isFinite(options.damage) && options.damage > 0 ? Math.floor(options.damage) : preset.damage;

    this.pattern = options.pattern || preset.pattern;
    this.amplitude = Number.isFinite(options.amplitude) ? options.amplitude : preset.amplitude;
    this.frequency = Number.isFinite(options.frequency) ? options.frequency : preset.frequency;

    this.canShoot = typeof options.canShoot === 'boolean' ? options.canShoot : preset.canShoot;
    this.fireRate = Number.isFinite(options.fireRate) && options.fireRate > 0 ? options.fireRate : preset.fireRate;
    this.bulletSpeed = Number.isFinite(options.bulletSpeed) && options.bulletSpeed > 0
      ? options.bulletSpeed
      : preset.bulletSpeed;
    this.bulletDamage = Number.isFinite(options.bulletDamage) && options.bulletDamage > 0
      ? options.bulletDamage
      : preset.bulletDamage;
    this.bulletGroup = options.bulletGroup || null;

    if (options.bounds) {
      this.bounds = this._resolveBounds(options.bounds);
    }

    this.onDefeated = typeof options.onDefeated === 'function' ? options.onDefeated : null;
    this.onEscape = typeof options.onEscape === 'function' ? options.onEscape : null;
    this.onShoot = typeof options.onShoot === 'function' ? options.onShoot : null;

    const desiredKey = options.texture || preset.texture;
    const resolvedKey = ensureEnemyTexture(this.scene, desiredKey, preset);
    if (this.texture?.key !== resolvedKey) {
      this.setTexture(resolvedKey);
    }

    this.alive = true;
    this.defeatedProcessed = false;
    this.escaped = false;
    this._elapsedAlive = 0;
    this._shootCooldownRemaining = this.fireRate;
    this._zigzagSign = options.zigzagDirection === -1 ? -1 : 1;

    this.enableBody(true, x, y, true, true);
    this.setDisplaySize(preset.width, preset.height);
    if (this.body) {
      this.body.setAllowGravity(false);
      const bodyW = Math.round(this.width * 0.95);
      const bodyH = Math.round(this.height * 0.95);
      this.body.setSize(bodyW, bodyH, false);
      this.body.setOffset(this.width * (1 - 0.95) / 2, this.height * (1 - 0.95) / 2);
    }

    if (this.scene?.tweens?.add) {
      this.setAlpha(0.3);
      this.scene.tweens.add({
        targets: this,
        alpha: 1,
        duration: 120,
        ease: 'Stepped'
      });
    }

    this.move(0);
    return this;
  }

  move(elapsed = this._elapsedAlive) {
    if (!this.alive || !this.active) {
      return;
    }

    let vx = 0;
    if (this.pattern === 'zigzag' && this.amplitude !== 0) {
      const safeElapsed = Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
      vx = this._zigzagSign * Math.cos(safeElapsed * this.frequency) * this.amplitude;
    }

    const halfW = this.displayWidth * 0.5;
    const minX = this.bounds.minX + halfW;
    const maxX = Math.max(minX, this.bounds.maxX - halfW);

    if (this.x <= minX && vx < 0) {
      this.x = minX;
      this._zigzagSign *= -1;
      vx = Math.abs(vx);
      this.body?.updateFromGameObject?.();
    } else if (this.x >= maxX && vx > 0) {
      this.x = maxX;
      this._zigzagSign *= -1;
      vx = -Math.abs(vx);
      this.body?.updateFromGameObject?.();
    }

    if (this.body) {
      this.setVelocity(vx, this.speed);
    } else {
      const dt = (this.scene?.game?.loop?.delta ?? 16.67) / 1000;
      this.x += vx * dt;
      this.y += this.speed * dt;
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (!this.active || !this.alive) {
      return;
    }

    const safeDelta = Number.isFinite(delta) && delta > 0 ? delta : 0;
    this._elapsedAlive += safeDelta;
    if (this._shootCooldownRemaining > 0) {
      this._shootCooldownRemaining = Math.max(0, this._shootCooldownRemaining - safeDelta);
    }

    this.move(this._elapsedAlive);
    this._tryShoot();

    if (this.y - this.displayHeight * 0.5 > this.bounds.maxY) {
      this._handleBottomEscape();
    }
  }

  _tryShoot() {
    if (!this.canShoot || !this.bulletGroup) {
      return;
    }
    if (this._shootCooldownRemaining > 0) {
      return;
    }

    const spawnX = this.x;
    const spawnY = this.y + this.displayHeight * 0.5;
    const bullet = acquireFromGroup(
      this.bulletGroup,
      Bullet,
      () => new Bullet(this.scene, spawnX, spawnY, { owner: 'enemy', autoFire: false }),
      spawnX,
      spawnY
    );

    if (bullet && typeof bullet.fire === 'function') {
      bullet.fire(spawnX, spawnY, {
        owner: 'enemy',
        damage: this.bulletDamage,
        speed: this.bulletSpeed,
        direction: { x: 0, y: 1 },
        bounds: this.bounds
      });
      if (typeof this.onShoot === 'function') {
        this.onShoot(this);
      }
    }

    this._shootCooldownRemaining = this.fireRate;
  }

  _handleBottomEscape() {
    if (this.escaped || !this.alive) {
      return;
    }
    this.escaped = true;
    this.alive = false;

    const escapeCallback = this.onEscape;
    this.deactivate();
    if (escapeCallback) {
      escapeCallback(this);
    }
  }

  takeDamage(amount = 1) {
    if (!this.alive || !this.active || !Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);

    if (this.health <= 0) {
      if (this.defeatedProcessed) {
        return false;
      }
      this.defeatedProcessed = true;
      this.alive = false;

      const defeatedCallback = this.onDefeated;
      this.deactivate();
      if (defeatedCallback) {
        defeatedCallback(this);
      }
    }

    return true;
  }

  deactivate() {
    this.alive = false;
    if (this.body) {
      this.disableBody(true, true);
    } else {
      this.setActive(false);
      this.setVisible(false);
    }
  }

  getHealth() {
    return this.health;
  }

  getMaxHealth() {
    return this.maxHealth;
  }

  isAlive() {
    return this.alive;
  }

  getScoreValue() {
    return this.scoreValue;
  }

  getDamage() {
    return this.damage;
  }

  getType() {
    return this.enemyType;
  }

  destroy(fromScene) {
    this.onDefeated = null;
    this.onEscape = null;
    this.onShoot = null;
    this.bulletGroup = null;
    super.destroy(fromScene);
  }
}
