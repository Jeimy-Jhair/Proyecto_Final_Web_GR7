/**
 * StorageManager
 * Clase estática que gestiona la persistencia en localStorage.
 * Guarda y recupera: récord (high score), nivel alcanzado y estado de audio (mute/unmute).
 *
 * Es tolerante a entornos sin `localStorage` (por ejemplo, pruebas en Node):
 * en ese caso utiliza un almacenamiento en memoria con la misma API.
 */
const KEYS = {
  HIGH_SCORE: 'game_high_score',
  LEVEL: 'game_level_reached',
  MUTED: 'game_audio_muted',
  SFX_VOLUME: 'game_sfx_volume',
  MUSIC_VOLUME: 'game_music_volume',
  PLAYER_DATA: 'game_player_data'
};

const memoryStore = new Map();

export default class StorageManager {
  static KEYS = KEYS;

  static _getStorage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        return localStorage;
      }
    } catch (e) {
      // Ignorar: se usará el almacenamiento en memoria.
    }
    return null;
  }

  static _safeGet(key, fallback = null) {
    try {
      const storage = this._getStorage();
      if (storage) {
        const value = storage.getItem(key);
        return value === null ? fallback : value;
      }
      if (memoryStore.has(key)) {
        return memoryStore.get(key);
      }
      return fallback;
    } catch (e) {
      console.warn('StorageManager: no se pudo leer el almacenamiento', e);
      return fallback;
    }
  }

  static _safeSet(key, value) {
    try {
      const storage = this._getStorage();
      if (storage) {
        storage.setItem(key, value);
      } else {
        memoryStore.set(key, value);
      }
    } catch (e) {
      try {
        memoryStore.set(key, value);
      } catch (inner) {
        console.warn('StorageManager: no se pudo escribir en el almacenamiento', e);
      }
    }
  }

  static _safeRemove(key) {
    try {
      const storage = this._getStorage();
      if (storage) {
        storage.removeItem(key);
      }
      memoryStore.delete(key);
    } catch (e) {
      try {
        memoryStore.delete(key);
      } catch (inner) {
        console.warn('StorageManager: no se pudo eliminar del almacenamiento', e);
      }
    }
  }

  // --- High Score ---
  static getHighScore() {
    const raw = this._safeGet(KEYS.HIGH_SCORE, '0');
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  }

  static setHighScore(score) {
    const num = Number(score);
    if (!Number.isFinite(num) || num < 0) return false;
    const current = this.getHighScore();
    if (num > current) {
      this._safeSet(KEYS.HIGH_SCORE, String(num));
      return true;
    }
    return false;
  }

  // --- Nivel alcanzado ---
  static getLevel() {
    const raw = this._safeGet(KEYS.LEVEL, '1');
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 1;
  }

  static setLevel(level) {
    const num = Number(level);
    if (!Number.isFinite(num) || num < 1) return false;
    this._safeSet(KEYS.LEVEL, String(Math.floor(num)));
    return true;
  }

  // --- Estado de audio (mute/unmute) ---
  static isMuted() {
    return this._safeGet(KEYS.MUTED, 'false') === 'true';
  }

  static setMuted(muted) {
    this._safeSet(KEYS.MUTED, String(Boolean(muted)));
  }

  // --- Volumen maestro de SFX ---
  static getSfxVolume() {
    const raw = this._safeGet(KEYS.SFX_VOLUME, '1');
    const num = Number(raw);
    if (!Number.isFinite(num)) return 1;
    return Math.min(1, Math.max(0, num));
  }

  static setSfxVolume(volume) {
    const num = Number(volume);
    if (!Number.isFinite(num)) return false;
    const clamped = Math.min(1, Math.max(0, num));
    this._safeSet(KEYS.SFX_VOLUME, String(clamped));
    return true;
  }

  // --- Volumen de música ---
  static getMusicVolume() {
    const raw = this._safeGet(KEYS.MUSIC_VOLUME, '0.5');
    const num = Number(raw);
    if (!Number.isFinite(num)) return 0.5;
    return Math.min(1, Math.max(0, num));
  }

  static setMusicVolume(volume) {
    const num = Number(volume);
    if (!Number.isFinite(num)) return false;
    const clamped = Math.min(1, Math.max(0, num));
    this._safeSet(KEYS.MUSIC_VOLUME, String(clamped));
    return true;
  }

  // --- Datos agregados del jugador ---
  static getPlayerData() {
    const raw = this._safeGet(KEYS.PLAYER_DATA, null);
    let parsed = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) || {};
      } catch (e) {
        parsed = {};
      }
    }
    return {
      highScore: this.getHighScore(),
      level: this.getLevel(),
      muted: this.isMuted(),
      sfxVolume: this.getSfxVolume(),
      musicVolume: this.getMusicVolume(),
      ...parsed
    };
  }

  static savePlayerData(data = {}) {
    if (!data || typeof data !== 'object') return false;
    if (Object.prototype.hasOwnProperty.call(data, 'highScore')) {
      this.setHighScore(data.highScore);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'level')) {
      this.setLevel(data.level);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'muted')) {
      this.setMuted(data.muted);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'musicMuted')) {
      this.setMuted(data.musicMuted);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'sfxMuted')) {
      // Se conserva el estado global de silencio para compatibilidad.
      this.setMuted(data.sfxMuted);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'sfxVolume')) {
      this.setSfxVolume(data.sfxVolume);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'musicVolume')) {
      this.setMusicVolume(data.musicVolume);
    }

    const snapshot = {
      highScore: this.getHighScore(),
      level: this.getLevel(),
      muted: this.isMuted(),
      sfxVolume: this.getSfxVolume(),
      musicVolume: this.getMusicVolume()
    };
    this._safeSet(KEYS.PLAYER_DATA, JSON.stringify(snapshot));
    return true;
  }

  // --- Utilidades ---
  static reset() {
    try {
      this._safeRemove(KEYS.HIGH_SCORE);
      this._safeRemove(KEYS.LEVEL);
      this._safeRemove(KEYS.MUTED);
      this._safeRemove(KEYS.SFX_VOLUME);
      this._safeRemove(KEYS.MUSIC_VOLUME);
      this._safeRemove(KEYS.PLAYER_DATA);
    } catch (e) {
      console.warn('StorageManager: no se pudo resetear', e);
    }
  }

  static clear() {
    this.reset();
  }

  // --- Alias de compatibilidad (nombres alternativos habituales) ---
  static getRecord() { return this.getHighScore(); }
  static setRecord(score) { return this.setHighScore(score); }
  static saveHighScore(score) { return this.setHighScore(score); }
  static loadHighScore() { return this.getHighScore(); }
  static getBestScore() { return this.getHighScore(); }
  static setBestScore(score) { return this.setHighScore(score); }

  static getLevelReached() { return this.getLevel(); }
  static setLevelReached(level) { return this.setLevel(level); }
  static saveLevel(level) { return this.setLevel(level); }
  static loadLevel() { return this.getLevel(); }
  static getUnlockedLevel() { return this.getLevel(); }
  static setUnlockedLevel(level) { return this.setLevel(level); }

  static getMuted() { return this.isMuted(); }
  static setAudioMuted(muted) { this.setMuted(muted); }
  static isAudioMuted() { return this.isMuted(); }
  static saveAudio(muted) { this.setMuted(muted); }
  static loadAudio() { return this.isMuted(); }

  static getMusicMuted() { return this.isMuted(); }
  static setMusicMuted(muted) { this.setMuted(muted); }
  static getSfxMuted() { return this.isMuted(); }
  static setSfxMuted(muted) { this.setMuted(muted); }

  static getAudioSettings() {
    return {
      muted: this.isMuted(),
      musicMuted: this.isMuted(),
      sfxMuted: this.isMuted(),
      sfxVolume: this.getSfxVolume(),
      musicVolume: this.getMusicVolume()
    };
  }

  static setAudioSettings(settings = {}) {
    if (!settings || typeof settings !== 'object') return false;
    if (Object.prototype.hasOwnProperty.call(settings, 'muted')) this.setMuted(settings.muted);
    if (Object.prototype.hasOwnProperty.call(settings, 'musicMuted')) this.setMuted(settings.musicMuted);
    if (Object.prototype.hasOwnProperty.call(settings, 'sfxMuted')) this.setMuted(settings.sfxMuted);
    if (Object.prototype.hasOwnProperty.call(settings, 'sfxVolume')) this.setSfxVolume(settings.sfxVolume);
    if (Object.prototype.hasOwnProperty.call(settings, 'musicVolume')) this.setMusicVolume(settings.musicVolume);
    this.savePlayerData();
    return true;
  }
}
