/**
 * Genera una textura procedural de respaldo en la escena si la clave indicada
 * aún no existe en `scene.textures`. Permite que las entidades funcionen incluso
 * antes de que se carguen los sprites finales en Preloader.
 *
 * @param {Phaser.Scene} scene - Escena de Phaser.
 * @param {string} key - Clave de textura esperada.
 * @param {number} width - Ancho de la textura en píxeles.
 * @param {number} height - Alto de la textura en píxeles.
 * @param {Function} drawFn - Función `(graphics, width, height) => void` que dibuja la figura.
 * @returns {string} La clave de textura lista para usar.
 */
export default function ensureTexture(scene, key, width, height, drawFn) {
  if (!scene || !scene.textures || scene.textures.exists(key)) {
    return key;
  }

  if (!scene.sys?.renderer) {
    if (typeof scene.textures.createCanvas === 'function') {
      scene.textures.createCanvas(key, width, height);
    }
    return key;
  }

  if (typeof scene.make?.graphics !== 'function') {
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  drawFn(graphics, width, height);
  graphics.generateTexture(key, width, height);
  graphics.destroy();

  return key;
}

