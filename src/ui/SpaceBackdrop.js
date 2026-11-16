import Phaser from 'phaser';

export function createSpaceBackdrop(scene, options = {}) {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const objects = [];
  const background = scene.add.rectangle(0, 0, width, height, options.color ?? 0x050716)
    .setOrigin(0)
    .setDepth(-30);
  objects.push(background);

  const starColors = [0x67e8f9, 0xa855f7, 0xfef08a, 0xffffff, 0x38bdf8];
  const starCount = options.starCount ?? 48;

  for (let index = 0; index < starCount; index += 1) {
    const x = Phaser.Math.Between(8, Math.max(8, width - 8));
    const y = Phaser.Math.Between(8, Math.max(8, height - 8));
    const size = index % 7 === 0 ? 4 : (index % 3 === 0 ? 3 : 2);
    const color = starColors[index % starColors.length];
    const initialAlpha = Phaser.Math.FloatBetween(0.3, 0.95);

    const star = scene.add.rectangle(x, y, size, size, color, initialAlpha)
      .setDepth(-28);

    scene.tweens.add({
      targets: star,
      alpha: Phaser.Math.FloatBetween(0.15, 0.95),
      duration: Phaser.Math.Between(500, 1600),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 1000),
      ease: 'Stepped'
    });
    objects.push(star);
  }

  return {
    objects,
    destroy() {
      objects.forEach((object) => {
        if (object && typeof object.destroy === 'function') {
          object.destroy();
        }
      });
      objects.length = 0;
    }
  };
}
