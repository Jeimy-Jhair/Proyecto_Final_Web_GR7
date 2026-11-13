/**
 * StorageManager
 * Clase estática que gestiona la persistencia en localStorage.
 * Guarda y recupera: récord (high score), nivel alcanzado y estado de audio (mute/unmute).
 */
const KEYS = {
  HIGH_SCORE: 'game_high_score',
  LEVEL: 'game_level_reached',
  MUTED: 'game_audio_muted'
};

export default class StorageManager {
  static _safeGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (e) {
      console.warn('StorageManager: no se pudo leer localStorage', e);
      return fallback;
    }
  }

  static _safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('StorageManager: no se pudo escribir en localStorage', e);
    }
  }

  // --- High Score ---
  static getHighScore() {
    const raw = this._safeGet(KEYS.HIGH_SCORE, '0');
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }

  static setHighScore(score) {
    const current = this.getHighScore();
    if (score > current) {
      this._safeSet(KEYS.HIGH_SCORE, String(score));
      return true;
    }
    return false;
  }

  // --- Nivel alcanzado ---
  static getLevel() {
    const raw = this._safeGet(KEYS.LEVEL, '1');
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : 1;
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

  // --- Utilidades ---
  static reset() {
    try {
      localStorage.removeItem(KEYS.HIGH_SCORE);
      localStorage.removeItem(KEYS.LEVEL);
      localStorage.removeItem(KEYS.MUTED);
    } catch (e) {
      console.warn('StorageManager: no se pudo resetear', e);
    }
  }
}
