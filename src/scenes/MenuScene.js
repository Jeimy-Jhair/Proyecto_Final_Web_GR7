import Phaser from 'phaser';
import AudioManager from '../managers/AudioManager.js';
import StorageManager from '../managers/StorageManager.js';
import Button from '../ui/Button.js';
import AudioToggle from '../ui/AudioToggle.js';
import { createSpaceBackdrop } from '../ui/SpaceBackdrop.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  init() {
    this.transitioning = false;
  }

  create() {
    this.transitioning = false;
    this.cameras.main.fadeIn(150, 5, 7, 22);
    this.backdrop = createSpaceBackdrop(this);
    const { width, height } = this.scale;
    const audioManager = new AudioManager(this);
    audioManager.registerSfx('sfx_disparo', 'sfx_explosion', 'sfx_enemigo_disparo', 'sfx_golpe');
    this.registry.set('audioManager', audioManager);
    audioManager.playMusic('musica-menu');
    this.events.once('shutdown', this.cleanup, this);

    const targetWidth = Math.min(360, width * 0.58);
    const logoScale = targetWidth / 1536;

    this.logo = this.add.image(width / 2, height * 0.22, 'game_logo')
      .setOrigin(0.5)
      .setScale(0);

    this.tweens.add({
      targets: this.logo,
      scale: logoScale,
      duration: 420,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.logo && this.logo.active) {
          this.tweens.add({
            targets: this.logo,
            y: this.logo.y + 4,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      }
    });

    const highScore = StorageManager.getHighScore();
    const levelReached = StorageManager.getLevel();
    const padHigh = String(Math.max(0, highScore || 0)).padStart(6, '0');
    const padLevel = String(Math.max(1, levelReached || 1)).padStart(2, '0');

    this.add.text(width / 2, height * 0.44, `HI-SCORE ${padHigh}   LVL ${padLevel}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: width < 600 ? '9px' : '11px',
      color: '#facc15',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    this.startButton = new Button(this, width / 2, height * 0.56, 'JUGAR', () => this.startGame(), {
      width: 260,
      height: 50,
      fontSize: 13,
      icon: 'play',
      baseColor: 0x075985,
      hoverColor: 0x0284c7
    });

    this.instructionsButton = new Button(this, width / 2, height * 0.68, 'AYUDA', () => this.openInstructions(), {
      width: 260,
      height: 46,
      fontSize: 12,
      baseColor: 0x1e1b4b,
      hoverColor: 0x312e81
    });

    this.audioToggle = new AudioToggle(this, width / 2, height * 0.80, audioManager, {
      width: 140,
      height: 42,
      showLabel: true
    });

    this.buttons = [this.startButton, this.instructionsButton, this.audioToggle.button];
    this.selectedIndex = 0;
    this.updateFocus();

    this.add.text(width / 2, height - 20, '[ARRIBA/ABAJO] [ENTER] [M] SONIDO', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#64748b',
      align: 'center',
      resolution: 2
    }).setOrigin(0.5);

    this.navigationKeys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      mute: Phaser.Input.Keyboard.KeyCodes.M,
      instructions: Phaser.Input.Keyboard.KeyCodes.I
    });
  }

  updateFocus() {
    this.buttons.forEach((button, index) => button.setFocused(index === this.selectedIndex));
  }

  selectPrevious() {
    this.selectedIndex = (this.selectedIndex + this.buttons.length - 1) % this.buttons.length;
    this.updateFocus();
  }

  selectNext() {
    this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
    this.updateFocus();
  }

  activateSelected() {
    this.buttons[this.selectedIndex]?.activate();
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.navigationKeys.enter)) {
      this.activateSelected();
    } else if (Phaser.Input.Keyboard.JustDown(this.navigationKeys.up)) {
      this.selectPrevious();
    } else if (Phaser.Input.Keyboard.JustDown(this.navigationKeys.down)) {
      this.selectNext();
    } else if (Phaser.Input.Keyboard.JustDown(this.navigationKeys.mute)) {
      this.toggleAudio();
    } else if (Phaser.Input.Keyboard.JustDown(this.navigationKeys.instructions)) {
      this.openInstructions();
    }
  }

  toggleAudio() {
    this.audioToggle?.toggle();
  }

  startGame() {
    if (this.transitioning) return;
    this.transitioning = true;
    let transitioned = false;
    const executeTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.registry.get('audioManager')?.stopMusic();
      this.scene.start('GameScene');
    };
    this.cameras.main.fadeOut(150, 5, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', executeTransition);
    this.time.delayedCall(250, executeTransition);
  }

  openInstructions() {
    if (this.transitioning) return;
    this.transitioning = true;
    let transitioned = false;
    const executeTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('InstructionsScene');
    };
    this.cameras.main.fadeOut(150, 5, 7, 22);
    this.cameras.main.once('camerafadeoutcomplete', executeTransition);
    this.time.delayedCall(250, executeTransition);
  }

  cleanup() {
    this.transitioning = false;
    Object.values(this.navigationKeys || {}).forEach((key) => this.input.keyboard.removeKey(key, true));
    this.registry.get('audioManager')?.stopMusic();
    this.startButton?.destroy();
    this.instructionsButton?.destroy();
    this.audioToggle?.destroy();
    this.backdrop?.destroy();
  }
}
