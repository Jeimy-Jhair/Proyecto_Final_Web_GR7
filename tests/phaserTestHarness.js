import Module from 'node:module';

let installed = false;

/**
 * Configura un entorno mínimo compatible con Phaser 3.90 (Phaser.HEADLESS) en Node.js
 * sin modificar el código fuente del proyecto ni instalar dependencias adicionales.
 */
export function setupPhaserTestEnv() {
  if (installed) {
    return;
  }
  installed = true;

  const origLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'phaser3spectorjs') {
      return {};
    }
    return origLoad.call(this, request, parent, isMain);
  };

  const noop = () => {};
  const ctxStub = {
    fillRect: noop,
    clearRect: noop,
    getImageData: () => ({ data: [0, 0, 0, 0] }),
    putImageData: noop,
    createImageData: () => ({ data: [] }),
    setTransform: noop,
    drawImage: noop,
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    stroke: noop,
    fill: noop,
    arc: noop,
    rect: noop,
    clip: noop,
    scale: noop,
    translate: noop,
    rotate: noop,
    measureText: () => ({ width: 0 }),
    fillText: noop,
    strokeText: noop,
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    font: ''
  };

  const rect = () => ({ left: 0, top: 0, width: 800, height: 600 });

  globalThis.window = globalThis;
  globalThis.Image = class {
    constructor() {
      this.width = 32;
      this.height = 32;
      this.complete = false;
      this.onload = null;
      this.onerror = null;
      this._src = '';
    }
    set src(value) {
      this._src = value;
      this.complete = true;
      setTimeout(() => {
        if (typeof this.onload === 'function') {
          this.onload();
        }
      }, 0);
    }
    get src() {
      return this._src;
    }
  };
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.HTMLCanvasElement = class {};
  globalThis.XMLHttpRequest = class {};
  globalThis.screen = { orientation: null };
  globalThis.focus = noop;
  globalThis.addEventListener = noop;
  globalThis.removeEventListener = noop;
  globalThis.document = {
    readyState: 'complete',
    hidden: false,
    documentElement: {},
    body: { appendChild: noop, getBoundingClientRect: rect },
    createElement: (tag) => ({
      tagName: tag,
      width: 800,
      height: 600,
      style: {},
      getContext: () => ctxStub,
      addEventListener: noop,
      removeEventListener: noop,
      contains: () => false,
      getBoundingClientRect: rect
    }),
    addEventListener: noop,
    removeEventListener: noop
  };
}

/**
 * Crea una escena Phaser HEADLESS real con físicas Arcade (gravedad y=300 como en main.js).
 *
 * @returns {Promise<{ game: Phaser.Game, scene: Phaser.Scene, cleanup: () => void }>}
 */
export async function createHeadlessScene() {
  setupPhaserTestEnv();
  const { default: Phaser } = await import('phaser');

  return new Promise((resolve, reject) => {
    let resolved = false;
    class TestScene extends Phaser.Scene {
      constructor() {
        super('TestScene');
      }
      create() {
        if (!resolved) {
          resolved = true;
          resolve({
            game,
            scene: this,
            cleanup: () => {
              if (game && !game.isDestroyed) {
                game.destroy(true);
              }
            }
          });
        }
      }
    }

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Timeout esperando inicialización de Phaser HEADLESS'));
      }
    }, 5000);

    const game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: 800,
      height: 600,
      audio: { noAudio: true },
      fps: { forceSetTimeOut: true },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 300 },
          debug: false
        }
      },
      scene: [TestScene]
    });

    function finishResolve() {
      clearTimeout(timer);
    }
    game.events.once('ready', finishResolve);
  });
}
