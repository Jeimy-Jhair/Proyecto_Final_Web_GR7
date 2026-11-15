# Assets y Audio — Arcade Shooter

> Documentación detallada de las imágenes: ver `docs/IMAGENES.md`.

## 1. Estructura de archivos
Los recursos se encuentran en:

```text
src/
├── assets/
│   ├── audio/
│   │   ├── musica-menú.ogg
│   │   ├── musica-gameplay.wav
│   │   ├── efecto-disparo.wav
│   │   ├── efecto-explosion.wav
│   │   ├── efecto-enemigo-disparo.wav
│   │   └── efecto-golpe.wav
│   └── images/
│       └── imagen-mute.png
```

## 2. Carga en `Preloader.js`
Los assets se importan con Vite usando `?url` y se cargan con Phaser:

| Archivo | Clave Phaser | Tipo |
| :--- | :--- | :--- |
| `musica-menú.ogg` | `musica-menu` | Música |
| `musica-gameplay.wav` | `musica-gameplay` | Música |
| `efecto-disparo.wav` | `sfx_disparo` | Efecto |
| `efecto-explosion.wav` | `sfx_explosion` | Efecto |
| `efecto-enemigo-disparo.wav` | `sfx_enemigo_disparo` | Efecto |
| `efecto-golpe.wav` | `sfx_golpe` | Efecto |
| `imagen-mute.png` | `imagen-mute` | Imagen |

## 3. Uso del audio
- `musica-menu`: menú y pantalla de game over.
- `musica-gameplay`: durante la partida.
- `sfx_disparo`: disparo del jugador.
- `sfx_explosion`: impacto o derrota de enemigo.
- `sfx_enemigo_disparo`: disparo enemigo.
- `sfx_golpe`: daño al jugador.

## 4. Volúmenes
En `src/managers/AudioManager.js`:

- `musicVolume = 0.5`: volumen base de la música.
- `sfxVolume = 0.7`: volumen base general de efectos.
- `sfxVolumes`: mezcla base por efecto:
  - `sfx_disparo: 0.5`
  - `sfx_explosion: 0.8`
  - `sfx_enemigo_disparo: 0.5`
  - `sfx_golpe: 0.7`
- `masterSfxVolume`: volumen maestro de efectos (0.0 a 1.0), persistido en `localStorage`.

El volumen final de cada efecto se calcula como:

```text
volumen final = volumen base del efecto * masterSfxVolume
```

## 5. Imagen de mute
- Archivo: `src/assets/images/imagen-mute.png`.
- Clave Phaser: `imagen-mute`.
- Aparece en las cuatro escenas principales.
- Posición actual: esquina inferior derecha.
- Tamaño actual: `setScale(0.15)`.
- Se muestra solo cuando el audio está silenciado (tecla M).

## 6. Cómo agregar nuevos assets
1. Colocar el archivo en `src/assets/audio/` o `src/assets/images/`.
2. Importarlo en `Preloader.js` con `?url`.
3. Cargarlo con `this.load.audio(...)` o `this.load.image(...)`.
4. Registrar el efecto en `AudioManager.registerSfx(...)` si corresponde.
5. Usarlo desde las escenas mediante su clave.

## 7. Notas
- Vite procesa los assets importados con `?url`, por lo que funcionan en desarrollo y producción.
- Si se cambia la carpeta de assets, deben actualizarse las rutas de importación en `Preloader.js`.
- El estado de silencio y el volumen maestro de SFX se guardan en `localStorage`.
