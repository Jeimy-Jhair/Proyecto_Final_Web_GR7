const PIXEL_MATRICES = {
  speaker: [
    '  XX    X ',
    '  XXXX   X',
    'XXXXXX X X',
    'XXXXXX   X',
    'XXXXXX   X',
    'XXXXXX X X',
    '  XXXX   X',
    '  XX    X '
  ],
  speaker_muted: [
    '  XX   X X',
    '  XXXX  X ',
    'XXXXXX X X',
    'XXXXXX    ',
    'XXXXXX    ',
    'XXXXXX X X',
    '  XXXX  X ',
    '  XX   X X'
  ],
  play: [
    'XX    ',
    'XXXX  ',
    'XXXXXX',
    'XXXXXXXX',
    'XXXXXX',
    'XXXX  ',
    'XX    '
  ],
  pause: [
    'XXX XXX',
    'XXX XXX',
    'XXX XXX',
    'XXX XXX',
    'XXX XXX',
    'XXX XXX',
    'XXX XXX'
  ],
  back: [
    '   X   ',
    '  XX   ',
    ' XXXXXX',
    'XXXXXXX',
    ' XXXXXX',
    '  XX   ',
    '   X   '
  ],
  retry: [
    '  XXXXX ',
    ' XX   XX',
    'XX     X',
    'XX   XXX',
    'XX   X  ',
    'XX      ',
    ' XX   XX',
    '  XXXXX '
  ],
  ship: [
    '   X   ',
    '  XXX  ',
    '  XXX  ',
    ' XXXXX ',
    'XXXXXXX',
    'XX X XX',
    'X  X  X'
  ],
  heart: [
    ' XX XX ',
    'XXXXXXX',
    'XXXXXXX',
    ' XXXXX ',
    '  XXX  ',
    '   X   '
  ],
  crosshair: [
    '    X    ',
    '    X    ',
    '  XXXXX  ',
    ' X     X ',
    'XX  X  XX',
    ' X     X ',
    '  XXXXX  ',
    '    X    ',
    '    X    '
  ],
  arrow_up: [
    '   X   ',
    '  XXX  ',
    ' XXXXX ',
    'XXXXXXX',
    '  XXX  ',
    '  XXX  '
  ],
  arrow_down: [
    '  XXX  ',
    '  XXX  ',
    'XXXXXXX',
    ' XXXXX ',
    '  XXX  ',
    '   X   '
  ],
  arrow_left: [
    '   X   ',
    '  XX   ',
    ' XXXXX ',
    'XXXXXX ',
    ' XXXXX ',
    '  XX   ',
    '   X   '
  ],
  arrow_right: [
    '   X   ',
    '   XX  ',
    ' XXXXX ',
    ' XXXXXX',
    ' XXXXX ',
    '   XX  ',
    '   X   '
  ]
};

export function getIconSize(name, pixelSize = 2) {
  const matrix = PIXEL_MATRICES[name];
  if (!matrix) return { width: 0, height: 0 };
  const rows = matrix.length;
  const cols = matrix[0].length;
  return {
    width: cols * pixelSize,
    height: rows * pixelSize
  };
}

export function drawPixelIcon(graphics, name, x, y, options = {}) {
  const matrix = PIXEL_MATRICES[name];
  if (!graphics || !matrix) return;
  const pixelSize = options.pixelSize ?? 2;
  const color = options.color ?? 0x67e8f9;
  const alpha = options.alpha ?? 1;
  const center = options.center ?? false;
  const shadow = options.shadow ?? true;
  const shadowColor = options.shadowColor ?? 0x020617;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const startX = center ? Math.round(x - (cols * pixelSize) / 2) : Math.round(x);
  const startY = center ? Math.round(y - (rows * pixelSize) / 2) : Math.round(y);

  if (shadow) {
    graphics.fillStyle(shadowColor, alpha * 0.9);
    for (let r = 0; r < rows; r += 1) {
      const line = matrix[r];
      for (let c = 0; c < line.length; c += 1) {
        if (line[c] === 'X') {
          graphics.fillRect(startX + c * pixelSize + pixelSize, startY + r * pixelSize + pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }

  graphics.fillStyle(color, alpha);
  for (let r = 0; r < rows; r += 1) {
    const line = matrix[r];
    for (let c = 0; c < line.length; c += 1) {
      if (line[c] === 'X') {
        graphics.fillRect(startX + c * pixelSize, startY + r * pixelSize, pixelSize, pixelSize);
      }
    }
  }
}

export function drawSteppedBox(graphics, x, y, width, height, options = {}) {
  if (!graphics) return;
  const fill = options.fillColor ?? 0x0f172a;
  const fillAlpha = options.fillAlpha ?? 0.95;
  const border = options.borderColor ?? 0x22d3ee;
  const borderAlpha = options.borderAlpha ?? 1;
  const shadow = options.shadowColor ?? 0x020617;
  const shadowOffset = options.shadowOffset ?? 4;
  const step = options.cornerStep ?? 4;
  const borderWidth = options.borderWidth ?? 2;
  const showShadow = options.showShadow ?? true;

  if (showShadow && shadowOffset > 0) {
    graphics.fillStyle(shadow, 0.85);
    const sx = x + shadowOffset;
    const sy = y + shadowOffset;
    graphics.fillRect(sx + step, sy, width - step * 2, height);
    graphics.fillRect(sx, sy + step, width, height - step * 2);
  }

  graphics.fillStyle(fill, fillAlpha);
  graphics.fillRect(x + step, y, width - step * 2, height);
  graphics.fillRect(x, y + step, width, height - step * 2);

  if (borderWidth > 0 && borderAlpha > 0) {
    graphics.fillStyle(border, borderAlpha);
    graphics.fillRect(x + step, y, width - step * 2, borderWidth);
    graphics.fillRect(x + step, y + height - borderWidth, width - step * 2, borderWidth);
    graphics.fillRect(x, y + step, borderWidth, height - step * 2);
    graphics.fillRect(x + width - borderWidth, y + step, borderWidth, height - step * 2);

    graphics.fillRect(x + step - borderWidth, y + step - borderWidth, borderWidth, borderWidth);
    graphics.fillRect(x + width - step, y + step - borderWidth, borderWidth, borderWidth);
    graphics.fillRect(x + step - borderWidth, y + height - step, borderWidth, borderWidth);
    graphics.fillRect(x + width - step, y + height - step, borderWidth, borderWidth);
  }

  if (options.accentColor !== undefined) {
    graphics.fillStyle(options.accentColor, 0.6);
    graphics.fillRect(x + step, y + borderWidth, width - step * 2, 1);
    graphics.fillRect(x + borderWidth, y + step, 1, height - step * 2);
  }
}

export function drawSteppedProgressBar(graphics, x, y, width, height, progress = 0) {
  if (!graphics) return;
  const clamped = Math.max(0, Math.min(1, progress));

  graphics.fillStyle(0x020617, 0.9);
  graphics.fillRect(x, y, width, height);

  graphics.fillStyle(0x1e293b, 1);
  graphics.fillRect(x, y, width, 2);
  graphics.fillRect(x, y + height - 2, width, 2);
  graphics.fillRect(x, y, 2, height);
  graphics.fillRect(x + width - 2, y, 2, height);

  const innerW = width - 6;
  const innerH = height - 6;
  const fillW = Math.round(innerW * clamped);

  if (fillW > 0) {
    const segments = 10;
    const segWidth = innerW / segments;
    for (let i = 0; i < segments; i += 1) {
      const segX = x + 3 + i * segWidth;
      const currentFill = Math.min(segWidth - 1, fillW - i * segWidth);
      if (currentFill > 0) {
        graphics.fillStyle(i % 2 === 0 ? 0x22d3ee : 0x0284c7, 1);
        graphics.fillRect(segX, y + 3, currentFill, innerH);
        graphics.fillStyle(0xffffff, 0.5);
        graphics.fillRect(segX, y + 3, currentFill, 2);
      }
    }
  }
}

export function draw8BitPlayer(graphics, width = 54, height = 54) {
  if (!graphics) return;
  const cx = width / 2;

  graphics.fillStyle(0x0f172a, 1);
  graphics.fillRect(cx - 4, 2, 8, 38);
  graphics.fillRect(cx - 14, 18, 28, 20);
  graphics.fillRect(cx - 24, 26, 48, 12);

  graphics.fillStyle(0x0284c7, 1);
  graphics.fillRect(cx - 3, 5, 6, 32);
  graphics.fillRect(cx - 12, 18, 24, 18);
  graphics.fillRect(cx - 20, 26, 40, 10);

  graphics.fillStyle(0x22d3ee, 1);
  graphics.fillRect(cx - 2, 2, 4, 12);
  graphics.fillRect(cx - 8, 22, 16, 12);
  graphics.fillRect(cx - 24, 30, 8, 6);
  graphics.fillRect(cx + 16, 30, 8, 6);

  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(cx - 1, 0, 2, 5);
  graphics.fillRect(cx - 24, 24, 3, 12);
  graphics.fillRect(cx + 21, 24, 3, 12);

  graphics.fillStyle(0xfacc15, 1);
  graphics.fillRect(cx - 3, 12, 6, 8);
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(cx - 2, 13, 2, 3);

  graphics.fillStyle(0x334155, 1);
  graphics.fillRect(cx - 10, 38, 6, 5);
  graphics.fillRect(cx + 4, 38, 6, 5);
}

export function draw8BitEnemy(graphics, type = 'basic', width = 48, height = 48) {
  if (!graphics) return;
  const cx = width / 2;

  if (type === 'fast') {
    graphics.fillStyle(0x6d28d9, 1);
    graphics.fillRect(cx - 3, 2, 6, 32);
    graphics.fillRect(cx - 11, 10, 22, 16);
    graphics.fillRect(cx - 19, 8, 38, 10);

    graphics.fillStyle(0xa855f7, 1);
    graphics.fillRect(cx - 2, 5, 4, 28);
    graphics.fillRect(cx - 8, 14, 16, 10);
    graphics.fillRect(cx - 16, 12, 32, 6);

    graphics.fillStyle(0xe9d5ff, 1);
    graphics.fillRect(cx - 19, 6, 3, 16);
    graphics.fillRect(cx + 16, 6, 3, 16);

    graphics.fillStyle(0x22d3ee, 1);
    graphics.fillRect(cx - 3, 16, 6, 4);
  } else if (type === 'tank') {
    graphics.fillStyle(0x7c2d12, 1);
    graphics.fillRect(cx - 20, 8, 40, 38);
    graphics.fillRect(cx - 30, 16, 60, 24);

    graphics.fillStyle(0xc2410c, 1);
    graphics.fillRect(cx - 18, 12, 36, 32);
    graphics.fillRect(cx - 26, 20, 52, 18);

    graphics.fillStyle(0xf97316, 1);
    graphics.fillRect(cx - 14, 14, 28, 24);
    graphics.fillRect(cx - 24, 22, 48, 12);

    graphics.fillStyle(0xfed7aa, 1);
    graphics.fillRect(cx - 26, 14, 4, 26);
    graphics.fillRect(cx + 22, 14, 4, 26);
    graphics.fillRect(cx - 8, 8, 16, 5);

    graphics.fillStyle(0xef4444, 1);
    graphics.fillRect(cx - 12, 28, 24, 4);
    graphics.fillStyle(0xfacc15, 1);
    graphics.fillRect(cx - 4, 28, 8, 4);
  } else {
    graphics.fillStyle(0x991b1b, 1);
    graphics.fillRect(cx - 11, 6, 22, 26);
    graphics.fillRect(cx - 20, 14, 40, 14);

    graphics.fillStyle(0xef4444, 1);
    graphics.fillRect(cx - 8, 8, 16, 20);
    graphics.fillRect(cx - 16, 16, 32, 10);

    graphics.fillStyle(0xfca5a5, 1);
    graphics.fillRect(cx - 20, 8, 4, 12);
    graphics.fillRect(cx + 16, 8, 4, 12);
    graphics.fillRect(cx - 14, 30, 4, 8);
    graphics.fillRect(cx + 10, 30, 4, 8);

    graphics.fillStyle(0xfacc15, 1);
    graphics.fillRect(cx - 5, 16, 10, 5);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(cx - 2, 17, 3, 3);
  }
}

export function draw8BitBullet(graphics, owner = 'player', width = 8, height = 18) {
  if (!graphics) return;
  const isEnemy = owner === 'enemy';
  const outer = isEnemy ? 0xef4444 : 0x22d3ee;
  const inner = isEnemy ? 0xfacc15 : 0xffffff;

  graphics.fillStyle(outer, 1);
  graphics.fillRect(2, 0, 4, height);
  graphics.fillRect(0, 3, width, height - 6);

  graphics.fillStyle(inner, 1);
  graphics.fillRect(2, 2, 4, height - 4);
}

export function createPixelExplosion(scene, x, y, options = {}) {
  if (!scene || !scene.add) return;
  const count = options.count ?? 8;
  const color = options.color ?? 0xfacc15;
  const colors = Array.isArray(color) ? color : [color, 0xf97316, 0xffffff];
  const distance = options.distance ?? 26;

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = Phaser.Math.Between(distance * 0.6, distance * 1.3);
    const targetX = x + Math.cos(angle) * speed;
    const targetY = y + Math.sin(angle) * speed;
    const size = Phaser.Math.Between(2, 4);
    const particleColor = colors[i % colors.length];

    const particle = scene.add.rectangle(x, y, size, size, particleColor, 1).setDepth(60);

    scene.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY,
      alpha: 0,
      scale: 0.2,
      duration: Phaser.Math.Between(180, 280),
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (particle && particle.destroy) {
          particle.destroy();
        }
      }
    });
  }
}

export function createPixelMuzzleFlash(scene, x, y, color = 0x22d3ee) {
  if (!scene || !scene.add) return;
  const flash = scene.add.rectangle(x, y, 6, 6, color, 0.95).setDepth(55);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    scaleX: 1.6,
    scaleY: 0.4,
    duration: 75,
    onComplete: () => {
      if (flash && flash.destroy) {
        flash.destroy();
      }
    }
  });
}

export function createPixelHitSparks(scene, x, y, color = 0xf87171) {
  if (!scene || !scene.add) return;
  for (let i = 0; i < 4; i += 1) {
    const sx = x + Phaser.Math.Between(-4, 4);
    const sy = y + Phaser.Math.Between(-4, 4);
    const spark = scene.add.rectangle(sx, sy, 3, 3, color, 1).setDepth(60);
    scene.tweens.add({
      targets: spark,
      x: spark.x + Phaser.Math.Between(-12, 12),
      y: spark.y + Phaser.Math.Between(-12, 12),
      alpha: 0,
      duration: 150,
      onComplete: () => {
        if (spark && spark.destroy) {
          spark.destroy();
        }
      }
    });
  }
}
