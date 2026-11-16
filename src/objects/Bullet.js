import Phaser from 'phaser';
import ensureTexture from './ensureTexture.js';
import { draw8BitBullet } from '../ui/PixelArt.js';

const DEFAULT_BULLET_TEXTURE = {
  player: 'bullet_player',
  enemy: 'bullet_enemy'
};

function ensureBulletTexture(scene, key, owner) {
  return ensureTexture(scene, key, 8, 18, (graphics, width, height) => {
    draw8BitBullet(graphics, owner, width, height);
  });
}

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x = 0, y = 0, textureOrOptions = DEFAULT_BULLET_TEXTURE.player, frame = undefined) {
    const isOptionsObj = typeof textureOrOptions === 'object' && textureOrOptions !== null;
    const options = isOptionsObj ? textureOrOptions : {};
    const owner = options.owner === 'enemy' ? 'enemy' : 'player';
    const rawKey = isOptionsObj
      ? (options.texture || DEFAULT_BULLET_TEXTURE[owner])
      : (textureOrOptions || DEFAULT_BULLET_TEXTURE[owner]);

    const textureKey = ensureBulletTexture(scene, rawKey, owner);
    super(scene, x, y, textureKey, isOptionsObj ? options.frame : frame);

    this.owner = owner;
    this.damage = 1;
    this.speed = 520;
    this.hasHit = false;
    this._isFired = false;
    this._velocityX = 0;
    this._velocityY = 0;
    this.bounds = this._resolveBounds(options.bounds);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    if (this.body) {
      this.body.setAllowGravity(false);
    }

    if (isOptionsObj && options.autoFire !== false) {
      this.fire(x, y, options);
    }
  }

  _resolveBounds(customBounds) {
    if (customBounds) {
      return {
        minX: customBounds.minX ?? 0,
        maxX: customBounds.maxX ?? (this.scene?.scale?.width ?? 800),
        minY: customBounds.minY ?? 0,
        maxY: customBounds.maxY ?? (this.scene?.scale?.height ?? 600)
      };
    }
    return {
      minX: 0,
      maxX: this.scene?.scale?.width ?? 800,
      minY: 0,
      maxY: this.scene?.scale?.height ?? 600
    };
  }

  fire(x, y, options = {}) {
    this.owner = options.owner === 'enemy' ? 'enemy' : 'player';
    this.damage = Number.isFinite(options.damage) && options.damage > 0 ? options.damage : 1;
    this.speed = Number.isFinite(options.speed) && options.speed > 0 ? options.speed : 520;
    this.hasHit = false;

    if (options.bounds) {
      this.bounds = this._resolveBounds(options.bounds);
    }

    const desiredKey = options.texture || DEFAULT_BULLET_TEXTURE[this.owner];
    const resolvedKey = ensureBulletTexture(this.scene, desiredKey, this.owner);
    if (this.texture?.key !== resolvedKey) {
      this.setTexture(resolvedKey);
    }

    this.setDisplaySize(8, 18);
    this.enableBody(true, x, y, true, true);

    if (this.body) {
      this.body.setAllowGravity(false);
      const bodyW = Math.round(this.width * 1.25);
      const bodyH = Math.round(this.height * 1.25);
      this.body.setSize(bodyW, bodyH, false);
      this.body.setOffset(this.width * (1 - 1.25) / 2, this.height * (1 - 1.25) / 2);
    }

    const defaultDir = this.owner === 'enemy' ? { x: 0, y: 1 } : { x: 0, y: -1 };
    const dirX = options.direction?.x ?? defaultDir.x;
    const dirY = options.direction?.y ?? defaultDir.y;
    const magnitude = Math.hypot(dirX, dirY);

    const vx = magnitude > 0 ? (dirX / magnitude) * this.speed : defaultDir.x * this.speed;
    const vy = magnitude > 0 ? (dirY / magnitude) * this.speed : defaultDir.y * this.speed;

    this._velocityX = vx;
    this._velocityY = vy;
    this._isFired = true;
    this.setVelocity(vx, vy);

    return this;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (!this.active) {
      return;
    }

    if (!this.hasHit && this._isFired && this.body) {
      if (this.body.allowGravity) {
        this.body.setAllowGravity(false);
      }
      if (
        this.body.velocity.x === 0 &&
        this.body.velocity.y === 0 &&
        (this._velocityX !== 0 || this._velocityY !== 0)
      ) {
        this.setVelocity(this._velocityX, this._velocityY);
      }
    }

    const margin = Math.max(this.displayWidth, this.displayHeight, 16);
    const outOfBounds =
      this.x < this.bounds.minX - margin ||
      this.x > this.bounds.maxX + margin ||
      this.y < this.bounds.minY - margin ||
      this.y > this.bounds.maxY + margin;

    if (outOfBounds) {
      this.deactivate();
    }
  }

  consumeHit() {
    if (this.hasHit || !this.active) {
      return false;
    }
    this.hasHit = true;
    this.deactivate();
    return true;
  }

  deactivate() {
    this._isFired = false;
    this._velocityX = 0;
    this._velocityY = 0;
    if (this.body) {
      this.disableBody(true, true);
    } else {
      this.setActive(false);
      this.setVisible(false);
    }
  }

  getDamage() {
    return this.damage;
  }

  getOwner() {
    return this.owner;
  }

  isFromPlayer() {
    return this.owner === 'player';
  }

  isFromEnemy() {
    return this.owner === 'enemy';
  }
}
