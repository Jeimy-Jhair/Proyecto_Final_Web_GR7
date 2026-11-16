import { drawSteppedBox, drawPixelIcon } from './PixelArt.js';

export default class TouchControls {
  constructor(scene, player, callbacks = {}) {
    this.scene = scene;
    this.player = player;
    this.callbacks = callbacks;
    this.pointerActions = new Map();
    this.buttons = [];
    this.container = scene.add.container(0, 0).setDepth(120);
    this.createButtons();
    this.layout();
    scene.scale.on('resize', this.layout, this);
    scene.input.on('pointerup', this.releasePointer, this);
    scene.input.on('pointerupoutside', this.releasePointer, this);
    scene.input.on('gameout', this.releaseAll, this);
    this.container.setVisible(Boolean(scene.sys.game.device.input.touch));
  }

  createButtons() {
    this.leftButton = this.addHoldButton('left', 'arrow_left', 0x1e1b4b, 58, 52);
    this.rightButton = this.addHoldButton('right', 'arrow_right', 0x1e1b4b, 58, 52);
    this.upButton = this.addHoldButton('up', 'arrow_up', 0x1e1b4b, 52, 58);
    this.downButton = this.addHoldButton('down', 'arrow_down', 0x1e1b4b, 52, 58);
    this.shootButton = this.addHoldButton('shoot', 'crosshair', 0x075985, 92, 68, 'DISPARAR');
    this.pauseButton = this.addActionButton('pause', 'pause', 0x1e293b, () => this.callbacks.onPause?.(), 48, 44);
    this.muteButton = this.addActionButton('mute', 'speaker', 0x1e293b, () => {
      this.callbacks.onMute?.();
      const audioManager = this.scene?.registry?.get('audioManager');
      if (audioManager) {
        this.setMuted(audioManager.isMuted());
      }
    }, 48, 44);
  }

  addHoldButton(action, iconName, baseColor, width = 54, height = 48, label = '') {
    const group = this.scene.add.container(0, 0);
    const graphics = this.scene.add.graphics();
    const hitArea = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.001)
      .setOrigin(0.5)
      .setInteractive();

    let textObj = null;
    if (label) {
      textObj = this.scene.add.text(0, 16, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#facc15',
        align: 'center',
        resolution: 2
      }).setOrigin(0.5);
    }

    const render = (pressed = false) => {
      graphics.clear();
      const offset = pressed ? 2 : 0;
      const shadowOffset = pressed ? 1 : 3;
      const fill = pressed ? 0x0284c7 : baseColor;
      const border = pressed ? 0x67e8f9 : 0x22d3ee;
      drawSteppedBox(graphics, -width / 2 + offset, -height / 2 + offset, width, height, {
        fillColor: fill,
        fillAlpha: 0.85,
        borderColor: border,
        borderWidth: 2,
        cornerStep: 3,
        shadowOffset,
        shadowColor: 0x020617
      });
      const iconY = label ? offset - 8 : offset;
      drawPixelIcon(graphics, iconName, offset, iconY, {
        pixelSize: 2,
        color: pressed ? 0xfacc15 : 0x67e8f9,
        center: true,
        shadow: true
      });
      if (textObj) {
        textObj.setPosition(offset, offset + 16);
      }
    };

    render(false);

    hitArea.on('pointerdown', (pointer) => {
      this.pointerActions.set(pointer.id, action);
      render(true);
      this.updateInput();
    });

    const release = (pointer) => {
      render(false);
      this.releasePointer(pointer);
    };

    hitArea.on('pointerup', release);
    hitArea.on('pointerout', (pointer) => {
      if (pointer.isDown) return;
      release(pointer);
    });
    hitArea.on('pointerupoutside', release);

    group.add([graphics, hitArea]);
    if (textObj) group.add(textObj);

    this.buttons.push(group);
    this.container.add(group);
    group.renderState = render;
    return group;
  }

  addActionButton(name, iconName, baseColor, callback, width = 48, height = 44) {
    const group = this.scene.add.container(0, 0);
    const graphics = this.scene.add.graphics();
    const hitArea = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.001)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    let currentIcon = iconName;

    const render = (pressed = false) => {
      graphics.clear();
      const offset = pressed ? 2 : 0;
      const shadowOffset = pressed ? 1 : 3;
      const fill = pressed ? 0x334155 : baseColor;
      const border = pressed ? 0xfacc15 : 0x94a3b8;
      drawSteppedBox(graphics, -width / 2 + offset, -height / 2 + offset, width, height, {
        fillColor: fill,
        fillAlpha: 0.9,
        borderColor: border,
        borderWidth: 2,
        cornerStep: 3,
        shadowOffset,
        shadowColor: 0x020617
      });
      drawPixelIcon(graphics, currentIcon, offset, offset, {
        pixelSize: 2,
        color: pressed ? 0xfacc15 : 0xe0f2fe,
        center: true,
        shadow: true
      });
    };

    render(false);

    hitArea.on('pointerdown', () => {
      render(true);
      callback();
    });
    hitArea.on('pointerup', () => render(false));
    hitArea.on('pointerout', () => render(false));
    hitArea.on('pointerupoutside', () => render(false));

    group.add([graphics, hitArea]);
    group.setIcon = (newIcon) => {
      currentIcon = newIcon;
      render(false);
    };

    this.buttons.push(group);
    this.container.add(group);
    return group;
  }

  setMuted(isMuted) {
    if (this.muteButton && typeof this.muteButton.setIcon === 'function') {
      this.muteButton.setIcon(isMuted ? 'speaker_muted' : 'speaker');
    }
  }

  releasePointer(pointer) {
    if (pointer && this.pointerActions.has(pointer.id)) {
      this.pointerActions.delete(pointer.id);
      this.updateInput();
    }
  }

  releaseAll() {
    this.pointerActions.clear();
    this.buttons.forEach((btn) => {
      if (typeof btn.renderState === 'function') {
        btn.renderState(false);
      }
    });
    this.updateInput();
  }

  updateInput() {
    const actions = new Set(this.pointerActions.values());
    if (actions.size === 0) {
      this.player.setMovementInput(null);
      return;
    }
    this.player.setMovementInput({
      left: actions.has('left'),
      right: actions.has('right'),
      up: actions.has('up'),
      down: actions.has('down'),
      shoot: actions.has('shoot')
    });
  }

  layout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const bottom = height - 64;
    this.leftButton.setPosition(64, bottom);
    this.rightButton.setPosition(180, bottom);
    this.upButton.setPosition(122, bottom - 58);
    this.downButton.setPosition(122, bottom);
    this.shootButton.setPosition(width - 72, bottom - 8);
    this.pauseButton.setPosition(width - 108, 28);
    this.muteButton.setPosition(width - 48, 28);
  }

  destroy() {
    this.releaseAll();
    this.scene.scale.off('resize', this.layout, this);
    this.scene.input.off('pointerup', this.releasePointer, this);
    this.scene.input.off('pointerupoutside', this.releasePointer, this);
    this.scene.input.off('gameout', this.releaseAll, this);
    this.container.destroy(true);
    this.buttons = [];
    this.scene = null;
    this.player = null;
    this.container = null;
  }
}
