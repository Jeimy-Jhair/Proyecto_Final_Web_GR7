# Persistencia con `localStorage` — Arcade Shooter

Este documento describe el mecanismo que guarda información del jugador en el navegador
para que no se pierda al cerrar o actualizar la página.

## 1. Módulo responsable

- Archivo: `src/managers/StorageManager.js`
- Tipo: clase estática (no requiere instancia).
- Dependencias: ninguna (usa `localStorage` cuando está disponible).

## 2. Información persistida

| Información | Qué se guarda | Clave en `localStorage` |
| :--- | :--- | :--- |
| Récord | Puntuación más alta obtenida. | `game_high_score` |
| Nivel alcanzado | Último nivel desbloqueado/completado. | `game_level_reached` |
| Audio (mute) | Si el audio está silenciado. | `game_audio_muted` |
| Volumen SFX | Volumen maestro de efectos (0 a 1). | `game_sfx_volume` |
| Volumen música | Volumen de música (0 a 1). | `game_music_volume` |
| Datos agregados | Resumen JSON del jugador. | `game_player_data` |

## 3. API principal

### Récord
- `StorageManager.getHighScore()` → `number`
- `StorageManager.setHighScore(score)` → `boolean` (true si supera el récord actual)

### Nivel
- `StorageManager.getLevel()` → `number` (mínimo 1)
- `StorageManager.setLevel(level)` → `boolean`

### Audio
- `StorageManager.isMuted()` → `boolean`
- `StorageManager.setMuted(muted)` → `void`
- `StorageManager.getSfxVolume()` → `number`
- `StorageManager.setSfxVolume(volume)` → `boolean`
- `StorageManager.getMusicVolume()` → `number`
- `StorageManager.setMusicVolume(volume)` → `boolean`

### Datos agregados
- `StorageManager.getPlayerData()` → `{ highScore, level, muted, sfxVolume, musicVolume, ... }`
- `StorageManager.savePlayerData(data)` → `boolean`

### Utilidades
- `StorageManager.reset()` / `StorageManager.clear()`: elimina todas las claves persistidas.

### Alias de compatibilidad
El módulo incluye nombres alternativos habituales (`getRecord`, `saveLevel`, `isAudioMuted`, etc.)
para facilitar integraciones y pruebas.

## 4. Ejemplo de uso

```js
import StorageManager from '../managers/StorageManager.js';

// Guardar récord si es mayor
StorageManager.setHighScore(1500);

// Guardar nivel alcanzado
StorageManager.setLevel(4);

// Guardar estado de audio
StorageManager.setMuted(true);
StorageManager.setSfxVolume(0.6);

// Leer datos
const record = StorageManager.getHighScore();
const nivel = StorageManager.getLevel();
const silenciado = StorageManager.isMuted();

// Reiniciar todo
StorageManager.reset();
```

## 5. Integración en el sistema

- `GameScene`: inicializa `LevelSystem` con `StorageManager.getLevel()`; al terminar la partida guarda récord y nivel.
- `AudioManager`: carga y persiste el estado de silencio y el volumen maestro de SFX.
- `MenuScene`: muestra el récord y el nivel alcanzado.
- `GameOverScene`: muestra el récord persistido.

## 6. Robustez

- Si `localStorage` no está disponible (por ejemplo, en pruebas Node), se usa un almacenamiento en memoria con la misma API.
- Las operaciones de lectura/escritura están protegidas con `try/catch` para evitar fallos por cuotas o permisos.
- Las entradas inválidas se validan y no sobrescriben valores válidos.
EOF