import Phaser from 'phaser';
import ensureTexture from './ensureTexture.js';

const DEFAULT_BULLET_TEXTURE = {
  player: 'bullet_player',
  enemy: 'bullet_enemy'
};

function ensureBulletTexture(scene, key, owner) {
  const color = owner === 'enemy' ? 0xff4d6d : 0x00f5d4;
  return ensureTexture(scene, key, 8, 18, (graphics, width, height) => {
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, height, 3);
    graphics.fillStyle(0xffffff, 0.85);
    graphics.fillRect(2, 2, width - 4, Math.max(4, height * 0.35));
  });
}

/**
 * Representa un proyectil (aliado o enemigo) compatible con object pooling
 * mediante `Phaser.Physics.Arcade.Group`.
 *
 * Contrato recomendado con grupos físicos:
 * - Pooling estándar: `group.get(x, y)?.fire(x, y, options)` con `classType: Bullet`.
 * - Inserción manual: crear con `{ autoFire: false }`, añadir con `group.add(bullet)` y
 *   luego llamar `bullet.fire(x, y, options)`. Como resguardo adicional, `preUpdate`
 *   restaura `allowGravity = false` y la velocidad si `PhysicsGroup.add()` los sobrescribió.
 */
export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - Escena propietaria.
   * @param {number} [x=0] - Posición inicial X.
   * @param {number} [y=0] - Posición inicial Y.
   * @param {string|object} [textureOrOptions='bullet_player'] - Clave de textura o mapa de opciones.
   * @param {string|number} [frame] - Frame opcional de spritesheet/atlas.
   */
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

  /**
   * Activa y lanza el proyectil desde `(x, y)` con la configuración indicada.
   *
   * @param {number} x - Coordenada X de origen.
   * @param {number} y - Coordenada Y de origen.
   * @param {object} [options={}] - Opciones de disparo.
   * @param {'player'|'enemy'} [options.owner='player'] - Propietario del proyectil.
   * @param {number} [options.damage=1] - Daño que inflige al impactar.
   * @param {number} [options.speed=520] - Rapidez en píxeles por segundo.
   * @param {{x: number, y: number}} [options.direction] - Vector de dirección.
   * @param {string} [options.texture] - Clave de textura opcional.
   * @param {{minX?: number, maxX?: number, minY?: number, maxY?: number}} [options.bounds] - Límites del área jugable.
   * @returns {Bullet} La instancia actual.
   */
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
      // Garantiza vuelo recto aunque la escena tenga gravedad global (main.js: gravity.y = 300)
      this.body.setAllowGravity(false);
      this.body.setSize(8, 18, true);
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

    // Resguardo por si se llamó a `physicsGroup.add(bullet)` después de `fire()`
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

  /**
   * Marca el proyectil como impactado una sola vez y lo desactiva.
   * Evita aplicar daño duplicado si ocurren múltiples overlaps en el mismo frame.
   *
   * @returns {boolean} `true` si el impacto es válido y no había sido consumido.
   */
  consumeHit() {
    if (this.hasHit || !this.active) {
      return false;
    }
    this.hasHit = true;
    this.deactivate();
    return true;
  }

  /**
   * Desactiva el proyectil y su cuerpo físico para devolverlo al pool del grupo.
   */
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

