import Phaser from 'phaser';
import { drawSteppedBox, drawPixelIcon, getIconSize } from './PixelArt.js';

export default class Button {
  constructor(scene, x, y, label, onClick, options = {}) {
    this.scene = scene;
    this.onClick = typeof onClick === 'function' ? onClick : () => {};
    this.enabled = true;
    this.baseColor = options.baseColor ?? 0x0f172a;
    this.hoverColor = options.hoverColor ?? 0x1e293b;
    this.focusColor = options.focusColor ?? 0x1e3a8a;
    this.borderColor = options.borderColor ?? 0x22d3ee;
    this.hoverBorderColor = options.hoverBorderColor ?? 0x67e8f9;
    this.textColor = options.textColor ?? '#e0f2fe';
    this.hoverTextColor = options.hoverTextColor ?? '#facc15';
    this.width = options.width ?? 280;
    this.height = options.height ?? 50;
    this.icon = options.icon ?? null;
    this.iconPixelSize = options.iconPixelSize ?? 2;
    this.accessibleName = options.accessibleName ?? label ?? '';
    this.label = label ?? '';
    this.hovered = false;
    this.pressed = false;
    this.focused = false;

    this.container = scene.add.container(x, y);
    this.graphics = scene.add.graphics();
    this.background = scene.add.rectangle(0, 0, this.width, this.height, 0x000000, 0.001)
      .setOrigin(0.5);

    const calculatedFontSize = options.fontSize ?? Math.max(10, Math.min(14, Math.floor(this.height * 0.28)));
    this.text = scene.add.text(0, 0, this.label, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: `${calculatedFontSize}px`,
      color: this.textColor,
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    this.container.add([this.graphics, this.background, this.text]);

    this.background.setInteractive({
      useHandCursor: true
    });
    this.background.on('pointerover', () => this.setHovered(true));
    this.background.on('pointerout', () => this.setHovered(false));
    this.background.on('pointerdown', () => {
      if (!this.enabled) return;
      this.setPressed(true);
      this.activate();
    });
    this.background.on('pointerup', () => {
      if (!this.enabled) return;
      this.setPressed(false);
    });
    this.background.on('pointerupoutside', () => this.setPressed(false));

    this.refresh();
  }

  setHovered(value) {
    this.hovered = Boolean(value);
    this.refresh();
  }

  setPressed(value) {
    this.pressed = Boolean(value);
    this.refresh();
  }

  setFocused(value) {
    this.focused = Boolean(value);
    this.refresh();
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    this.container.setAlpha(this.enabled ? 1 : 0.45);
    this.refresh();
  }

  setLabel(label) {
    this.label = label ?? '';
    this.text.setText(this.label);
    if (!this.accessibleName || this.accessibleName === this.label) {
      this.accessibleName = this.label;
    }
    this.refresh();
  }

  setIcon(iconName) {
    this.icon = iconName;
    this.refresh();
  }

  activate() {
    if (!this.enabled) return;
    this.onClick();
  }

  refresh() {
    if (!this.graphics || !this.scene) return;
    this.graphics.clear();

    const isHover = (this.hovered || this.focused) && this.enabled;
    const isPressed = this.pressed && this.enabled;
    const fillColor = isPressed ? this.focusColor : (isHover ? this.hoverColor : this.baseColor);
    const borderColor = isHover ? this.hoverBorderColor : this.borderColor;
    const textColor = isHover ? this.hoverTextColor : this.textColor;
    const offset = isPressed ? 2 : 0;
    const shadowOffset = isPressed ? 2 : 4;

    const bx = -this.width / 2 + offset;
    const by = -this.height / 2 + offset;

    drawSteppedBox(this.graphics, bx, by, this.width, this.height, {
      fillColor,
      fillAlpha: this.enabled ? 0.96 : 0.5,
      borderColor,
      borderAlpha: this.enabled ? 1 : 0.5,
      shadowOffset: this.enabled ? shadowOffset : 0,
      cornerStep: 4,
      borderWidth: 2,
      accentColor: isHover ? 0xa5f3fc : 0x1e3a8a
    });

    this.text.setColor(textColor);
    this.text.setVisible(Boolean(this.label));

    if (this.icon && this.label) {
      const iconSize = getIconSize(this.icon, this.iconPixelSize);
      const gap = 10;
      const textWidth = this.text.width;
      const totalWidth = iconSize.width + gap + textWidth;
      const iconX = offset - totalWidth / 2 + iconSize.width / 2;
      const iconY = offset;
      const textX = offset - totalWidth / 2 + iconSize.width + gap + textWidth / 2;
      const textY = offset;

      drawPixelIcon(this.graphics, this.icon, iconX, iconY, {
        pixelSize: this.iconPixelSize,
        color: isHover ? 0xfacc15 : 0x67e8f9,
        center: true,
        shadow: true
      });
      this.text.setPosition(textX, textY);
    } else if (this.icon) {
      drawPixelIcon(this.graphics, this.icon, offset, offset, {
        pixelSize: this.iconPixelSize,
        color: isHover ? 0xfacc15 : 0x67e8f9,
        center: true,
        shadow: true
      });
      this.text.setPosition(offset, offset);
    } else {
      this.text.setPosition(offset, offset);
    }
  }

  destroy() {
    this.background?.removeAllListeners();
    this.container?.destroy(true);
    this.scene = null;
    this.onClick = null;
    this.graphics = null;
    this.background = null;
    this.text = null;
    this.container = null;
  }
}
