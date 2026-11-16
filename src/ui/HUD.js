import { drawSteppedBox, drawPixelIcon, drawSteppedProgressBar } from './PixelArt.js';

export default class HUD {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.depth = options.depth ?? 80;
    this.currentLives = 3;
    this.maxLives = 3;
    this.currentScore = 0;
    this.currentRecord = 0;
    this.currentLevel = 1;
    this.currentWave = 1;
    this.defeatedInLevel = 0;
    this.neededForLevel = 20;
    this.totalDefeated = 0;

    this.container = scene.add.container(0, 0).setDepth(this.depth);
    this.panelGraphics = scene.add.graphics();
    this.panel = scene.add.rectangle(0, 0, 316, 74, 0x000000, 0.001).setOrigin(0, 0);

    this.titleText = scene.add.text(0, 0, 'GALAXY STRIKER', this.titleStyle());
    this.scoreText = scene.add.text(14, 12, 'PUNTOS 000000', this.textStyle());
    this.recordText = scene.add.text(14, 32, 'RÉCORD 000000', this.secondaryStyle());
    this.levelText = scene.add.text(188, 12, 'NIVEL 01', this.textStyle());
    this.waveText = scene.add.text(188, 32, 'OLEADA 01', this.secondaryStyle());

    this.livesGraphics = scene.add.graphics();
    this.livesText = scene.add.text(64, 52, '3/3', this.secondaryStyle());
    this.statusText = scene.add.text(188, 52, '', this.secondaryStyle());

    this.enemiesText = scene.add.text(0, 0, '0 / 20 ENEMIGOS', this.secondaryStyle());
    this.progressGraphics = scene.add.graphics();

    this.container.add([
      this.panelGraphics,
      this.panel,
      this.titleText,
      this.scoreText,
      this.recordText,
      this.levelText,
      this.waveText,
      this.livesGraphics,
      this.livesText,
      this.statusText,
      this.enemiesText,
      this.progressGraphics
    ]);

    this.layout();
    scene.scale.on('resize', this.layout, this);
  }

  titleStyle() {
    return {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#22d3ee',
      resolution: 2
    };
  }

  textStyle() {
    return {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#facc15',
      resolution: 2
    };
  }

  secondaryStyle() {
    return {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#67e8f9',
      resolution: 2
    };
  }

  layout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const isWidescreen = width >= 1000;

    this.panelGraphics.clear();
    this.progressGraphics.clear();

    if (isWidescreen) {
      const panelW = 290;
      const panelH = height - 20;
      const panelX = width - panelW - 10;
      const panelY = 10;

      this.container.setPosition(panelX, panelY);
      this.container.setScale(1);

      drawSteppedBox(this.panelGraphics, 0, 0, panelW, panelH, {
        fillColor: 0x0a0f24,
        fillAlpha: 0.96,
        borderColor: 0x22d3ee,
        borderWidth: 2,
        cornerStep: 6,
        shadowOffset: 6,
        shadowColor: 0x020617,
        accentColor: 0x38bdf8
      });

      this.titleText.setVisible(true).setPosition(panelW / 2, 28).setOrigin(0.5);

      this.scoreText.setPosition(20, 68).setOrigin(0, 0);
      this.recordText.setPosition(20, 100).setOrigin(0, 0);
      this.levelText.setPosition(20, 132).setOrigin(0, 0);
      this.waveText.setPosition(20, 164).setOrigin(0, 0);

      this.livesText.setPosition(90, 206).setOrigin(0, 0);
      this.redrawLives(20, 204);

      this.enemiesText.setVisible(true).setPosition(20, 246).setOrigin(0, 0);
      const progress = this.neededForLevel > 0 ? this.defeatedInLevel / this.neededForLevel : 0;
      drawSteppedProgressBar(this.progressGraphics, 20, 268, panelW - 40, 16, progress);

      this.statusText.setPosition(panelW / 2, 320).setOrigin(0.5);
    } else {
      this.container.setPosition(10, 10);
      this.container.setScale(width < 620 ? 0.8 : 1);

      drawSteppedBox(this.panelGraphics, 0, 0, 316, 78, {
        fillColor: 0x0a0f24,
        fillAlpha: 0.92,
        borderColor: 0x22d3ee,
        borderWidth: 2,
        cornerStep: 4,
        shadowOffset: 4,
        shadowColor: 0x020617,
        accentColor: 0x3b82f6
      });

      this.titleText.setVisible(false);
      this.scoreText.setPosition(14, 12).setOrigin(0, 0);
      this.recordText.setPosition(14, 32).setOrigin(0, 0);
      this.levelText.setPosition(188, 12).setOrigin(0, 0);
      this.waveText.setPosition(188, 32).setOrigin(0, 0);

      this.livesText.setPosition(64, 52).setOrigin(0, 0);
      this.redrawLives(14, 50);

      this.enemiesText.setVisible(false);
      this.statusText.setPosition(188, 52).setOrigin(0, 0);
    }
  }

  redrawLives(baseX = 14, baseY = 50) {
    if (!this.livesGraphics || !this.scene) return;
    this.livesGraphics.clear();
    const count = Math.max(1, this.maxLives);
    for (let i = 0; i < count; i += 1) {
      const active = i < this.currentLives;
      const x = baseX + i * 18;
      const y = baseY;
      drawPixelIcon(this.livesGraphics, 'ship', x, y, {
        pixelSize: 1,
        color: active ? 0x22d3ee : 0x1e293b,
        shadow: active,
        shadowColor: 0x020617
      });
    }
  }

  setScore(score) {
    this.currentScore = Math.max(0, Math.floor(Number(score) || 0));
    const pad = String(this.currentScore).padStart(6, '0');
    this.scoreText.setText(`PUNTOS ${pad}`);
  }

  setRecord(record) {
    this.currentRecord = Math.max(0, Math.floor(Number(record) || 0));
    const pad = String(this.currentRecord).padStart(6, '0');
    this.recordText.setText(`RÉCORD ${pad}`);
  }

  setLives(lives, maxLives) {
    this.currentLives = Number(lives) || 0;
    if (Number.isFinite(maxLives) && maxLives > 0) {
      this.maxLives = maxLives;
    }
    this.livesText.setText(`${this.currentLives}/${this.maxLives}`);
    this.livesText.setColor(this.currentLives <= 1 ? '#f87171' : '#67e8f9');
    const isWidescreen = this.scene?.scale?.width >= 1000;
    this.redrawLives(isWidescreen ? 20 : 14, isWidescreen ? 204 : 50);
  }

  setLevel(level) {
    this.currentLevel = level;
    const pad = String(level).padStart(2, '0');
    this.levelText.setText(`NIVEL ${pad}`);
  }

  setWave(wave, state = '') {
    this.currentWave = wave;
    const pad = String(wave).padStart(2, '0');
    this.waveText.setText(`OLEADA ${pad}`);
    this.statusText.setText(state === 'spawning' ? 'PREPARANDO' : state === 'active' ? 'EN CURSO' : '');
  }

  setEnemiesProgress(defeatedInLevel, neededForLevel, totalDefeated) {
    this.defeatedInLevel = Number(defeatedInLevel) || 0;
    this.neededForLevel = Number(neededForLevel) || 20;
    this.totalDefeated = Number(totalDefeated) || 0;
    this.enemiesText.setText(`${this.defeatedInLevel} / ${this.neededForLevel} ENEMIGOS`);

    const isWidescreen = this.scene?.scale?.width >= 1000;
    if (isWidescreen) {
      this.progressGraphics.clear();
      const panelW = 290;
      const progress = this.neededForLevel > 0 ? this.defeatedInLevel / this.neededForLevel : 0;
      drawSteppedProgressBar(this.progressGraphics, 20, 268, panelW - 40, 16, progress);
    }
  }

  showFeedback(message, color = '#67e8f9') {
    this.statusText.setText(message).setColor(color);
    this.scene.tweens.add({
      targets: this.statusText,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: 1,
      ease: 'Stepped',
      onComplete: () => {
        if (this.statusText && this.statusText.active) {
          this.statusText.setAlpha(1);
        }
      }
    });
  }

  destroy() {
    this.scene.scale.off('resize', this.layout, this);
    this.container.destroy(true);
    this.scene = null;
    this.panelGraphics = null;
    this.progressGraphics = null;
    this.panel = null;
    this.titleText = null;
    this.scoreText = null;
    this.recordText = null;
    this.levelText = null;
    this.waveText = null;
    this.livesGraphics = null;
    this.livesText = null;
    this.statusText = null;
    this.enemiesText = null;
  }
}
