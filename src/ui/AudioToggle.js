import Button from './Button.js';

export default class AudioToggle {
  constructor(scene, x, y, audioManager, options = {}) {
    this.audioManager = audioManager;
    this.showLabel = Boolean(options.showLabel);
    const width = options.width ?? 54;
    const height = options.height ?? 44;
    this.button = new Button(scene, x, y, '', () => this.toggle(), {
      width,
      height,
      fontSize: options.fontSize ?? 11,
      iconPixelSize: options.iconPixelSize ?? 2,
      accessibleName: 'Sonido'
    });
    this.updateLabel();
  }

  toggle() {
    this.audioManager.toggleMute();
    this.updateLabel();
  }

  updateLabel() {
    const muted = this.audioManager.isMuted();
    this.button.setIcon(muted ? 'speaker_muted' : 'speaker');
    this.button.accessibleName = muted ? 'Activar sonido' : 'Silenciar sonido';
    if (this.showLabel) {
      this.button.setLabel(muted ? 'MUTE' : 'AUDIO');
    } else {
      this.button.setLabel('');
    }
  }

  destroy() {
    this.button.destroy();
    this.audioManager = null;
  }
}
