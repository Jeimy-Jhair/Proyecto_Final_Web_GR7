import Phaser from 'phaser';
import AudioManager from '../managers/AudioManager.js';
import Button from '../ui/Button.js';
import AudioToggle from '../ui/AudioToggle.js';
import { createSpaceBackdrop } from '../ui/SpaceBackdrop.js';
import { drawSteppedBox } from '../ui/PixelArt.js';

export default class InstructionsScene extends Phaser.Scene {
  constructor() {
    super('InstructionsScene');
  }

  init() {
    this.transitioning = false;
  }

  create() {
    this.transitioning = false;
    this.cameras.main.fadeIn(150, 5, 7, 22);
    this.backdrop = createSpaceBackdrop(this);
    const { width, height } = this.scale;
    const audioManager = this.registry.get('audioManager') || new AudioManager(this);
    this.registry.set('audioManager', audioManager);

    this.logo = this.add.image(width / 2, 34, 'game_logo')
      .setOrigin(0.5)
      .setScale(0.11);

    const panelWidth = Math.min(680, width - 40);
    const panelHeight = Math.min(370, height - 160);
    const panelX = (width - panelWidth) / 2;
    const panelY = 74;

    const panelGraphics = this.add.graphics();
    drawSteppedBox(panelGraphics, panelX, panelY, panelWidth, panelHeight, {
      fillColor: 0x0a0f24,
      fillAlpha: 0.94,
      borderColor: 0x22d3ee,
      borderWidth: 2,
      cornerStep: 4,
      shadowOffset: 4,
      shadowColor: 0x020617,
      accentColor: 0x3b82f6
    });

    const lines = [
      'GUÍA DE COMBATE',
      '',
      '[◄ ▲ ▼ ►] / [WASD] : MOVER',
      '[SPACE] / [FIRE]   : DISPARAR',
      '[P] / [II]         : PAUSA',
      '[M]                : SONIDO',
      '',
      'OBJETIVO',
      '',
      'SUPERA 10 OLEADAS ESPACIALES',
      'EVITA IMPACTOS Y DESTRUYE NAVES',
      'EN MÓVIL: USA EL D-PAD Y FIRE'
    ];

    this.add.text(width / 2, panelY + panelHeight / 2, lines.join('\n'), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: width < 600 ? '8px' : '10px',
      color: '#e0f2fe',
      align: 'center',
      lineSpacing: 8,
      resolution: 2
    }).setOrigin(0.5);

    this.audioToggle = new AudioToggle(this, width - 42, 38, audioManager);
    this.backButton = new Button(this, width / 2, height - 42, 'VOLVER', () => this.goBack(), {
      width: 190,
      height: 44,
      fontSize: 12,
      icon: 'back',
      baseColor: 0x1e1b4b,
      hoverColor: 0x312e81
    });

    this.navigationKeys = this.input.keyboard.addKeys({
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER
    });
    this.events.once('shutdown', this.cleanup, this);
  }

  goBack() {
    if (this.transitioning) return;
    this.transitioning = true;
    let transitioned = false;
    const executeTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('MenuScene');
    };
    this.cameras.main.fadeOut(150, 5, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', executeTransition);
    this.time.delayedCall(250, executeTransition);
  }

  update() {
    if (
      Phaser.Input.Keyboard.JustDown(this.navigationKeys.escape) ||
      Phaser.Input.Keyboard.JustDown(this.navigationKeys.enter)
    ) {
      this.goBack();
    }
  }

  cleanup() {
    this.transitioning = false;
    Object.values(this.navigationKeys || {}).forEach((key) => this.input.keyboard.removeKey(key, true));
    this.audioToggle?.destroy();
    this.backButton?.destroy();
    this.backdrop?.destroy();
  }
}
