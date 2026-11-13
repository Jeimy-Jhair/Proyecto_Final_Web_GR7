import StorageManager from './StorageManager.js';

/**
 * AudioManager
 * Gestiona la reproducción de música de fondo y efectos de sonido (SFX).
 * Incluye lógica para silenciar/activar audio, persistiendo el estado en StorageManager.
 */
export default class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.music = null;
    this.sfxKeys = [];
    this.muted = StorageManager.isMuted();
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;
  }

  /**
   * Registra las claves de efectos de sonido disponibles (al menos dos).
   */
  registerSfx(...keys) {
    keys.forEach((k) => {
      if (!this.sfxKeys.includes(k)) this.sfxKeys.push(k);
    });
  }

  /**
   * Reproduce música de fondo en loop.
   * @param {string} key - Clave del audio cargado en la escena.
   * @param {object} [config] - Configuración adicional de Phaser Sound.
   */
  playMusic(key, config = {}) {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`AudioManager: música "${key}" no encontrada.`);
      return;
    }
    this.music = this.scene.sound.add(key, {
      loop: true,
      volume: this.musicVolume,
      ...config
    });
    this.music.setMute(this.muted);
    this.music.play();
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }
  }

  /**
   * Reproduce un efecto de sonido.
   * @param {string} key - Clave del audio cargado en la escena.
   */
  playSfx(key) {
    if (this.muted) return;
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`AudioManager: SFX "${key}" no encontrado.`);
      return;
    }
    const sfx = this.scene.sound.add(key, { volume: this.sfxVolume });
    sfx.setMute(this.muted);
    sfx.play();
    sfx.on('complete', () => sfx.destroy());
  }

  /**
   * Alterna el estado de silencio y lo persiste.
   * @returns {boolean} Nuevo estado (true = silenciado).
   */
  toggleMute() {
    this.muted = !this.muted;
    StorageManager.setMuted(this.muted);
    if (this.music) this.music.setMute(this.muted);
    // Actualizar SFX activos
    this.scene.sound.sounds.forEach((s) => s.setMute(this.muted));
    return this.muted;
  }

  /**
   * Establece explícitamente el estado de silencio.
   */
  setMuted(muted) {
    this.muted = Boolean(muted);
    StorageManager.setMuted(this.muted);
    if (this.music) this.music.setMute(this.muted);
    this.scene.sound.sounds.forEach((s) => s.setMute(this.muted));
  }

  isMuted() {
    return this.muted;
  }

  /**
   * Aplica el estado de silencio guardado (útil al iniciar).
   */
  applyStoredMute() {
    this.muted = StorageManager.isMuted();
    if (this.music) this.music.setMute(this.muted);
    this.scene.sound.sounds.forEach((s) => s.setMute(this.muted));
  }
}
