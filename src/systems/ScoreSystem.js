/**
 * Administra la puntuación de la partida en curso.
 * No persiste en `localStorage` ni manipula el HUD directamente;
 * comunica cambios mediante el callback `onChange`.
 */
export default class ScoreSystem {
  /**
   * @param {number|object} [initialScoreOrOptions=0] - Puntuación inicial o mapa de opciones.
   * @param {number} [initialScoreOrOptions.initialScore=0] - Puntuación inicial.
   * @param {Function} [initialScoreOrOptions.onChange] - Callback `(score, delta) => void`.
   * @param {Function} [onChange=null] - Callback si el primer parámetro es numérico.
   */
  constructor(initialScoreOrOptions = 0, onChange = null) {
    const isOptionsObj = typeof initialScoreOrOptions === 'object' && initialScoreOrOptions !== null;
    const rawInitial = isOptionsObj ? initialScoreOrOptions.initialScore : initialScoreOrOptions;
    const callback = isOptionsObj ? initialScoreOrOptions.onChange : onChange;

    this.initialScore = this._normalizeScore(rawInitial);
    this.score = this.initialScore;
    this.onChange = typeof callback === 'function' ? callback : null;
  }

  _normalizeScore(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return 0;
    }
    return Math.floor(value);
  }

  /**
   * Suma puntos positivos enteros al puntaje actual y notifica el cambio.
   * Valores negativos, `0`, `NaN` o no numéricos son ignorados de forma segura.
   *
   * @param {number} amount - Puntos a sumar.
   * @returns {number} Puntuación total actualizada.
   */
  addPoints(amount) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return this.score;
    }

    const points = Math.floor(amount);
    if (points <= 0) {
      return this.score;
    }

    this.score += points;
    if (this.onChange) {
      this.onChange(this.score, points);
    }

    return this.score;
  }

  /**
   * Devuelve la puntuación actual de la partida.
   *
   * @returns {number}
   */
  getScore() {
    return this.score;
  }

  /**
   * Reinicia la puntuación al valor inicial configurado.
   *
   * @param {boolean} [notify=true] - Si debe invocar `onChange` tras reiniciar.
   * @returns {number}
   */
  reset(notify = true) {
    this.score = this.initialScore;
    if (notify && this.onChange) {
      this.onChange(this.score, 0);
    }
    return this.score;
  }
}

