# Imágenes implementadas — Arcade Shooter

Este documento describe las imágenes (sprites y texturas) utilizadas por el juego,
su clave en Phaser, el archivo de origen y el uso dentro del sistema.

## 1. Carga de imágenes (`Preloader.js`)

Las imágenes se importan con Vite (`?url`) y se registran en Phaser con una clave estable.
Si un recurso no está disponible, `ensureTexture.js` genera una textura procedural de respaldo
para que las entidades sigan funcionando.

### 1.1 Sprites principales

| Clave Phaser | Archivo fuente | Uso |
| :--- | :--- | :--- |
| `player` | `src/assets/images/player/player.png` | Nave del jugador (`Player`). |
| `bullet_player` | `src/assets/images/player/laser-player.png` | Proyectil del jugador (`Bullet` con `owner: 'player'`). |
| `enemy_basic` | `src/assets/images/Enemies/enemy-one.png` | Enemigo básico (`Enemy` tipo `basic`). |
| `enemy_fast` | `src/assets/images/Enemies/enemy-two.png` | Enemigo rápido (`Enemy` tipo `fast`). |
| `enemy_tank` | `src/assets/images/Enemies/enemy-three.png` | Enemigo tanque (`Enemy` tipo `tank`). |
| `bullet_enemy` | `src/assets/images/Enemies/laser-enemy.png` | Proyectil enemigo (`Bullet` con `owner: 'enemy'`). |

### 1.2 Elementos de interfaz

| Clave Phaser | Archivo fuente | Uso |
| :--- | :--- | :--- |
| `imagen-mute` | `src/assets/images/mute/imagen-mute.png` | Icono de silencio en las escenas (`MenuScene`, `GameScene`, `PauseScene`, `GameOverScene`). Se muestra solo cuando el audio está silenciado. |

### 1.3 Meteoritos de fondo (decoración)

| Patrón de clave | Archivos fuente | Uso |
| :--- | :--- | :--- |
| `meteor_<nombre>` | `src/assets/images/Meteors/meteor*.png` (marrones y grises, tamaños big/med/small/tiny) | Meteoritos decorativos animados en `GameScene` (fondo). Las claves se guardan en `registry.meteorKeys`. |

## 2. Texturas de respaldo (`ensureTexture.js`)

`ensureTexture(scene, key, width, height, drawFn)` verifica si la clave ya existe en `scene.textures`.
Si no existe, genera una textura procedural con las dimensiones indicadas. Esto permite:

- Ejecutar el juego en tests headless sin assets.
- Mostrar figuras básicas si falta un sprite en `Preloader`.

## 3. Uso por entidad

- **Player**: usa `player` por defecto y dispara con `bullet_player`.
- **Enemy**: según tipo (`basic`, `fast`, `tank`) usa `enemy_basic`, `enemy_fast`, `enemy_tank`.
- **Bullet**: según propietario (`player`/`enemy`) usa `bullet_player`/`bullet_enemy`.
- **GameScene**: usa las claves de meteoritos para el fondo animado.
- **Escenas**: usan `imagen-mute` para el botón de silencio.

## 4. Notas

- Las imágenes se procesan por Vite, por lo que funcionan en desarrollo y producción.
- Las claves son estables y no dependen del nombre del archivo.
- Para agregar una nueva imagen: colocarla en `src/assets/images/`, importarla en `Preloader.js` con `?url` y registrarla con `this.load.image(clave, url)`.
EOF