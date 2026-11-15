# Documentación de Integración — Gameplay (Integrante 1)

Este documento describe los módulos de gameplay desarrollados para el **Arcade Shooter** (Phaser `3.90.0` instalado según `package-lock.json` / `"^3.80.1"` en `package.json` + Vite) y los contratos de integración para **Integrante 2 (UI/HUD)** e **Integrante 3 (Escenas, Audio, Persistencia e Integración)**.

---

## 1. Archivos implementados

```text
src/
├── objects/
│   ├── ensureTexture.js   (utilidad interna de texturas de respaldo)
│   ├── poolHelper.js      (utilidad interna para object pooling)
│   ├── Player.js          (entidad del jugador)
│   ├── Enemy.js           (entidad de enemigos parametrizada por tipo)
│   └── Bullet.js          (proyectiles aliados y enemigos)
└── systems/
    ├── CollisionSystem.js (registro y resolución de colisiones Arcade)
    ├── ScoreSystem.js     (cálculo de puntuación en partida)
    ├── WaveSystem.js      (generación y control de oleadas)
    └── LevelSystem.js     (progresión de niveles y dificultad)
```

---

## 2. Responsabilidad de cada archivo

| Archivo | Responsabilidad principal |
| :--- | :--- |
| `src/objects/Player.js` | Movimiento normalizado en 8 direcciones sin vibración en bordes, disparo con cadencia e invulnerabilidad basadas en `delta` (pausables con la escena) y vidas. |
| `src/objects/Enemy.js` | Entidad de enemigo configurable mediante `ENEMY_TYPES` (`basic`, `fast`, `tank`), patrones (`straight`, `zigzag`), salud, daño por contacto, puntos y detección de salida por borde inferior. |
| `src/objects/Bullet.js` | Proyectiles reutilizables (`player` / `enemy`), dirección normalizada, prevención de doble impacto (`consumeHit`) y desactivación automática fuera de pantalla. |
| `src/systems/CollisionSystem.js` | Registra una sola vez los `overlap` de Phaser (`playerBullets` vs `enemies`, `player` vs `enemies`, `player` vs `enemyBullets`), aplica daño, suma puntos y actualiza `WaveSystem`. |
| `src/systems/ScoreSystem.js` | Mantiene el puntaje de la partida actual, valida incrementos positivos enteros y notifica cambios vía `onChange`. No toca `localStorage` ni el HUD. |
| `src/systems/WaveSystem.js` | Genera oleadas mediante `scene.time.addEvent` (respeta pausas), rastrea enemigos activos, detecta finalización de oleada y detiene spawns al finalizar la partida. |
| `src/systems/LevelSystem.js` | Controla el nivel actual y calcula parámetros de dificultad (`enemyCount`, `spawnInterval`, `speedMultiplier`, `healthBonus`, `enemyTypes`, `enableEnemyShooting`) sin duplicar spawns. |
| `src/objects/ensureTexture.js` | Genera texturas procedurales si `scene.textures` aún no tiene las claves cargadas en `Preloader.js`. |
| `src/objects/poolHelper.js` | Extrae o crea instancias reutilizables desde grupos de física con o sin `classType` configurado. |

---

## 3. Constructores y parámetros

### `Player` (`src/objects/Player.js`)
```js
new Player(scene, x, y, options)
```
- `scene` (`Phaser.Scene`): Escena activa.
- `x`, `y` (`number`): Posición inicial.
- `options` (`object`, opcional):
  - `texture` (`string`, default `'player'`): Clave de textura en Phaser.
  - `speed` (`number`, default `320`): Velocidad en px/s.
  - `maxLives` (`number`, default `3`): Vidas máximas e iniciales.
  - `lives` (`number`, default `maxLives`): Vidas iniciales opcionales.
  - `fireRate` (`number`, default `220`): Cadencia mínima entre disparos en ms.
  - `bulletSpeed` (`number`, default `540`): Rapidez de las balas del jugador.
  - `bulletDamage` (`number`, default `1`): Daño por proyectil.
  - `bulletTexture` (`string`, default `'bullet_player'`): Textura de proyectil.
  - `bulletGroup` (`Phaser.Physics.Arcade.Group|null`, default `null`): Grupo para pooling.
  - `invulnerabilityDuration` (`number`, default `1000`): Duración de invulnerabilidad tras daño (ms).
  - `bounds` (`{ minX, maxX, minY, maxY }`, default tamaño de escena): Área jugable.
  - `controls` (`object|null`, default teclado interno WASD/Flechas/Espacio): Controles externos `{ cursors, wasd, shootKey }`.
  - `onShoot` (`(bullet) => void`): Callback al disparar.
  - `onDamage` (`({ lives, maxLives, amount }) => void`): Callback al recibir daño.
  - `onDeath` (`() => void`): Callback al llegar a `0` vidas.

### `Enemy` (`src/objects/Enemy.js`)
```js
new Enemy(scene, x = 0, y = 0, textureOrOptions = 'enemy_basic', frame)
```
- Normalmente es instanciado automáticamente por `Phaser.Physics.Arcade.Group` con `classType: Enemy`.
- `ENEMY_TYPES` exportado con tres perfiles base: `basic` (`1 HP`, `100 pts`), `fast` (`1 HP`, `150 pts`, `zigzag`), `tank` (`3 HP`, `300 pts`, `2` de daño por choque).
- Al reutilizarse, `WaveSystem` invoca `enemy.spawn(x, y, options)`.

### `Bullet` (`src/objects/Bullet.js`)
```js
new Bullet(scene, x = 0, y = 0, textureOrOptions = 'bullet_player', frame)
```
- Normalmente es instanciado por `Phaser.Physics.Arcade.Group` con `classType: Bullet`.
- Al dispararse se activa mediante `bullet.fire(x, y, { owner, damage, speed, direction, texture, bounds })`.

### `ScoreSystem` (`src/systems/ScoreSystem.js`)
```js
new ScoreSystem({ initialScore = 0, onChange = null })
// También acepta: new ScoreSystem(initialScore, onChange)
```
- `onChange(score, delta)`: Se ejecuta cada vez que cambia el puntaje.

### `LevelSystem` (`src/systems/LevelSystem.js`)
```js
new LevelSystem(options)
```
- `initialLevel` (`number`, default `1`)
- `maxLevel` (`number|null`, default `null`)
- `wavesPerLevel` (`number`, default `1`): Oleadas completadas para subir de nivel.
- `baseEnemyCount` (`6`), `enemyCountIncrement` (`2`), `maxEnemyCount` (`30`)
- `baseSpawnInterval` (`1100`), `spawnIntervalDecrement` (`75`), `minSpawnInterval` (`350`)
- `baseSpeedMultiplier` (`1`), `speedMultiplierStep` (`0.1`), `maxSpeedMultiplier` (`2.2`)
- `healthBonusEvery` (`3`), `maxHealthBonus` (`3`)
- `enemyShootingFromLevel` (`4`): Nivel desde el cual los enemigos pueden disparar (requiere `enemyBulletGroup`).
- `onLevelUp` (`({ level, difficulty }) => void`)

### `WaveSystem` (`src/systems/WaveSystem.js`)
```js
new WaveSystem(scene, enemyGroup, options)
```
- `scene` (`Phaser.Scene`)
- `enemyGroup` (`Phaser.Physics.Arcade.Group`)
- `options` (`object`, opcional):
  - `levelSystem` (`LevelSystem|null`): Fuente de parámetros de dificultad.
  - `enemyBulletGroup` (`Phaser.Physics.Arcade.Group|null`): Grupo opcional para disparos enemigos.
  - `bounds` (`{ minX, maxX, spawnY, minY, maxY }`)
  - `spawnImmediately` (`boolean`, default `true`)
  - `onWaveStart` (`({ waveNumber, totalEnemies, level }) => void`)
  - `onWaveComplete` (`({ waveNumber, defeatedCount, escapedCount, totalEnemies }) => void`)
  - `onEnemySpawn` (`(enemy) => void`)
  - `onEnemyEscape` (`(enemy) => void`)

### `CollisionSystem` (`src/systems/CollisionSystem.js`)
```js
new CollisionSystem(scene, groups, systems, callbacks)
```
- `groups`: `{ player, playerBullets, enemies, enemyBullets }` (`enemyBullets` es opcional).
- `systems`: `{ scoreSystem, waveSystem }`.
- `callbacks`: `{ onBulletHitEnemy, onEnemyDefeated, onPlayerHit, onPlayerDeath }`.

---

## 4. Métodos públicos disponibles

- **Player**: `update()`, `move()`, `shoot(targetGroup)`, `canShoot()`, `takeDamage(amount = 1, ignoreInvulnerability = false)`, `getLives()`, `getMaxLives()`, `isAlive()`, `isInvulnerable()`, `setMovementInput(input)`, `setBulletGroup(group)`, `reset(x, y)`, `destroy()`.
- **Enemy**: `spawn(x, y, options)`, `move(time)`, `takeDamage(amount = 1)`, `deactivate()`, `getHealth()`, `getMaxHealth()`, `isAlive()`, `getScoreValue()`, `getDamage()`, `getType()`, `destroy()`.
- **Bullet**: `fire(x, y, options)`, `consumeHit()`, `deactivate()`, `getDamage()`, `getOwner()`, `isFromPlayer()`, `isFromEnemy()`.
- **ScoreSystem**: `addPoints(amount)`, `getScore()`, `reset(notify = true)`.
- **LevelSystem**: `recordWaveCompleted(waveId)`, `nextLevel()`, `getLevel()`, `getWavesCompletedInLevel()`, `isAtMaxLevel()`, `getDifficulty()`, `reset()`.
- **WaveSystem**: `startWave(waveNumber, waveConfig)`, `spawnEnemies()`, `onEnemyDefeated(enemy)`, `onEnemyRemoved(enemy, reason)`, `isWaveComplete()`, `getWaveNumber()`, `getWaveState()`, `getActiveEnemyCount()`, `getRemainingEnemies()`, `stop()`, `reset()`, `destroy()`.
- **CollisionSystem**: `setupCollisions()`, `handleBulletEnemyCollision(bullet, enemy)`, `handlePlayerEnemyCollision(player, enemy)`, `handleEnemyBulletPlayerCollision(player, bullet)`, `setGroups(groups)`, `destroy()`.

---

## 5. Grupos de física requeridos

En `GameScene.create()`, Integrante 3 debe crear los grupos de física Arcade antes de instanciar `Player`, `WaveSystem` y `CollisionSystem`:

```js
this.playerBullets = this.physics.add.group({
  classType: Bullet,
  maxSize: 60,
  runChildUpdate: true,
  allowGravity: false
});

this.enemies = this.physics.add.group({
  classType: Enemy,
  maxSize: 40,
  runChildUpdate: true,
  allowGravity: false
});

// Opcional (necesario si se habilitan disparos enemigos a partir de nivel 4):
this.enemyBullets = this.physics.add.group({
  classType: Bullet,
  maxSize: 40,
  runChildUpdate: true,
  allowGravity: false
});
```

> **Nota:** `runChildUpdate: true` es indispensable para que `Bullet.preUpdate` y `Enemy.preUpdate` se ejecuten automáticamente en cada frame (movimiento, temporizadores pausables, salida de pantalla y limpieza). Asimismo, `Player`, `Enemy` y `Bullet` desactivan la gravedad en su cuerpo (`body.setAllowGravity(false)`), por lo que funcionan correctamente incluso con `gravity: { y: 300 }` en `src/main.js`.

### Creación, inserción manual y reutilización de proyectiles (`Bullet`)

- **Reutilización con pooling (forma recomendada):** configurar el grupo con `classType: Bullet`, `runChildUpdate: true` y `allowGravity: false`. Luego obtener y lanzar con:
  ```js
  const bullet = this.playerBullets.get(x, y);
  bullet?.fire(x, y, { owner: 'player', damage: 1, speed: 540 });
  ```
  `Player.shoot()` y `Enemy._tryShoot()` ya aplican este patrón automáticamente (mediante `poolHelper.js`).
- **Inserción manual en un grupo físico:** si se instancia un `Bullet` directamente para añadirlo con `group.add(bullet)`, se recomienda crearlo con `autoFire: false`, añadirlo al grupo y luego llamar a `fire()`:
  ```js
  const bullet = new Bullet(this, x, y, { owner: 'enemy', autoFire: false });
  this.enemyBullets.add(bullet);
  bullet.fire(x, y, { owner: 'enemy', damage: 1, speed: 280 });
  ```
  Como resguardo adicional, `Bullet.preUpdate` restaura `allowGravity = false` y la velocidad configurada si `PhysicsGroup.add(bullet)` los sobrescribió después de `fire()`.

---

## 6. Eventos o callbacks disponibles

La comunicación sigue una estrategia uniforme de **callbacks en constructores + métodos de consulta públicos** (sin eventos globales ni dependencias con `HUD` o `StorageManager`):

| Origen | Callback | Parámetros | Uso sugerido |
| :--- | :--- | :--- | :--- |
| `Player` | `onShoot` | `(bullet)` | Reproducir SFX de disparo (`audioManager.playSfx(...)`). |
| `Player` | `onDamage` | `({ lives, maxLives, amount })` | Actualizar vidas en el HUD y reproducir SFX de daño. |
| `Player` | `onDeath` | `()` | Detener oleadas y transicionar a `GameOverScene`. |
| `ScoreSystem` | `onChange` | `(score, delta)` | Actualizar texto de puntuación en HUD y verificar récord en `StorageManager`. |
| `WaveSystem` | `onWaveStart` | `({ waveNumber, totalEnemies, level })` | Mostrar indicador de oleada/nivel en HUD. |
| `WaveSystem` | `onWaveComplete` | `({ waveNumber, defeatedCount, escapedCount, totalEnemies })` | Avanzar `LevelSystem`, guardar nivel alcanzado y lanzar siguiente oleada. |
| `LevelSystem` | `onLevelUp` | `({ level, difficulty })` | Actualizar nivel en HUD y `StorageManager.setLevel(level)`. |
| `CollisionSystem` | `onBulletHitEnemy` | `(bullet, enemy)` | Efectos visuales/sonido de impacto. |
| `CollisionSystem` | `onEnemyDefeated` | `(enemy)` | Efectos visuales/sonido de explosión. |
| `CollisionSystem` | `onPlayerHit` | `({ player, source, lives })` | Feedback visual de daño en HUD/cámara. |
| `CollisionSystem` | `onPlayerDeath` | `(player)` | Guardar récord y cambiar a `GameOverScene` con datos finales. |

---

## 7. Cómo inicializar cada módulo

1. Crear los grupos de física (`playerBullets`, `enemies`, `enemyBullets`).
2. Instanciar `ScoreSystem` y `LevelSystem`.
3. Instanciar `Player` pasándole `bulletGroup: this.playerBullets`.
4. Instanciar `WaveSystem` pasándole `this.enemies`, `levelSystem` y `enemyBulletGroup`.
5. Instanciar `CollisionSystem` conectando `{ player, playerBullets, enemies, enemyBullets }` y `{ scoreSystem, waveSystem }`.
6. Llamar **una sola vez** a `collisionSystem.setupCollisions()`.
7. Iniciar la primera oleada con `waveSystem.startWave(1)`.
8. En `GameScene.update()`, llamar a `this.player.update()`.

---

## 8. Cómo conectar los sistemas entre sí

- `CollisionSystem` actúa como puente en combate: al impactar una bala aliada, aplica daño al `Enemy`, consume el proyectil y, si muere, suma `enemy.getScoreValue()` en `ScoreSystem` y notifica `waveSystem.onEnemyDefeated(enemy)`.
- Cuando un `Enemy` choca con `Player`, `CollisionSystem` descuenta vida al jugador (respetando i-frames), desactiva al enemigo y llama a `waveSystem.onEnemyRemoved(enemy, 'collision')` sin otorgar puntaje.
- Cuando un `Enemy` cruza el borde inferior, se desactiva y notifica internamente a `WaveSystem` (`escaped`), evitando que la oleada quede bloqueada esperando enemigos fuera de pantalla.
- Al completarse una oleada, `WaveSystem` invoca `onWaveComplete`; desde ahí `GameScene` llama `levelSystem.recordWaveCompleted(waveNumber)` y programa la siguiente oleada.

---

## 9. Qué datos necesita el HUD (Integrante 2)

Integrante 2 puede consumir estos getters o recibir actualizaciones desde los callbacks de `GameScene`:

- **Puntuación actual:** `scoreSystem.getScore()` (o callback `ScoreSystem.onChange(score)`).
- **Vidas actuales / máximas:** `player.getLives()`, `player.getMaxLives()` (o callback `Player.onDamage({ lives, maxLives })`).
- **Estado del jugador:** `player.isAlive()`, `player.isInvulnerable()`.
- **Nivel actual:** `levelSystem.getLevel()` (o callback `LevelSystem.onLevelUp({ level })`).
- **Oleada actual y estado:** `waveSystem.getWaveNumber()`, `waveSystem.getWaveState()` (`'idle' | 'spawning' | 'active' | 'completed' | 'stopped'`), `waveSystem.getRemainingEnemies()`.

---

## 10. Cómo detectar el fin de una oleada

Existen dos vías equivalentes:
1. **Reactiva (recomendada):** Usar el callback `onWaveComplete` de `WaveSystem`.
2. **Por consulta:** Comprobar `waveSystem.isWaveComplete()`.

Una oleada se considera terminada únicamente cuando ya aparecieron todos sus enemigos programados (`spawnedCount >= totalToSpawn`) **y** no queda ningún enemigo activo en pantalla (`activeEnemies.size === 0`).

---

## 11. Cómo detectar la derrota

Existen tres vías coherentes entre sí:
1. Callback `onDeath` en `Player`.
2. Callback `onPlayerDeath` en `CollisionSystem` (además detiene automáticamente `WaveSystem.stop()`).
3. Consulta directa `!player.isAlive()`.

Desde `GameScene`, al detectar la derrota se debe detener cualquier temporizador de transición entre oleadas, guardar el récord con `StorageManager.setHighScore(scoreSystem.getScore())` y pasar a `GameOverScene` enviando los datos finales:
`this.scene.start('GameOverScene', { score: scoreSystem.getScore(), level: levelSystem.getLevel(), wave: waveSystem.getWaveNumber() });`

---

## 12. Cómo reiniciar una partida

Al iniciar `GameScene` mediante `this.scene.start('GameScene')`, Phaser ejecuta `create()` desde cero y emite el evento `'shutdown'` de la escena anterior:

- `WaveSystem` y `CollisionSystem` escuchan `scene.events.once('shutdown', () => this.destroy())`, limpiando automáticamente temporizadores y colliders al cambiar a `GameOverScene` o reiniciar.
- Si además se desea reiniciar dentro de la misma instancia de escena sin recargarla:
  1. `waveSystem.reset()`
  2. `levelSystem.reset()`
  3. `scoreSystem.reset()`
  4. `player.reset(width / 2, height - 60)`
  5. Desactivar hijos activos de los grupos (`bullets` y `enemies`) si hubiera alguno en pantalla.
  6. Llamar `waveSystem.startWave(1)`.

---

## 13. Ejemplo de integración desde `GameScene.js`

```js
import Player from '../objects/Player.js';
import Enemy from '../objects/Enemy.js';
import Bullet from '../objects/Bullet.js';
import CollisionSystem from '../systems/CollisionSystem.js';
import ScoreSystem from '../systems/ScoreSystem.js';
import WaveSystem from '../systems/WaveSystem.js';
import LevelSystem from '../systems/LevelSystem.js';
import StorageManager from '../managers/StorageManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    const audioManager = this.registry.get('audioManager');
    this.isGameOver = false;

    // 1. Grupos de física
    this.playerBullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 60,
      runChildUpdate: true,
      allowGravity: false
    });

    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: 40,
      runChildUpdate: true,
      allowGravity: false
    });

    this.enemyBullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 40,
      runChildUpdate: true,
      allowGravity: false
    });

    // 2. Sistemas de puntuación y nivel
    this.scoreSystem = new ScoreSystem({
      initialScore: 0,
      onChange: (score) => {
        // Actualizar HUD: this.hud?.setScore(score);
      }
    });

    this.levelSystem = new LevelSystem({
      initialLevel: 1,
      onLevelUp: ({ level }) => {
        StorageManager.setLevel(level);
        // Actualizar HUD: this.hud?.setLevel(level);
      }
    });

    // 3. Jugador
    this.player = new Player(this, width / 2, height - 60, {
      bulletGroup: this.playerBullets,
      onShoot: () => audioManager?.playSfx('sfx_shoot'),
      onDamage: ({ lives }) => {
        // Actualizar HUD: this.hud?.setLives(lives);
      }
    });

    // 4. Sistema de oleadas
    this.waveSystem = new WaveSystem(this, this.enemies, {
      levelSystem: this.levelSystem,
      enemyBulletGroup: this.enemyBullets,
      onWaveStart: ({ waveNumber, level }) => {
        // Actualizar HUD: this.hud?.setWave(waveNumber, level);
      },
      onWaveComplete: ({ waveNumber }) => {
        if (this.isGameOver || !this.player.isAlive()) return;
        this.levelSystem.recordWaveCompleted(waveNumber);
        this.time.delayedCall(1500, () => {
          if (!this.isGameOver && this.player.isAlive()) {
            this.waveSystem.startWave(waveNumber + 1);
          }
        });
      }
    });

    // 5. Sistema de colisiones
    this.collisionSystem = new CollisionSystem(
      this,
      {
        player: this.player,
        playerBullets: this.playerBullets,
        enemies: this.enemies,
        enemyBullets: this.enemyBullets
      },
      {
        scoreSystem: this.scoreSystem,
        waveSystem: this.waveSystem
      },
      {
        onPlayerDeath: () => this.handleGameOver()
      }
    );
    this.collisionSystem.setupCollisions();

    // 6. Iniciar primera oleada
    this.waveSystem.startWave(1);
  }

  update() {
    if (!this.isGameOver) {
      this.player?.update();
    }
  }

  handleGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.waveSystem?.stop();

    const finalScore = this.scoreSystem.getScore();
    StorageManager.setHighScore(finalScore);
    StorageManager.setLevel(this.levelSystem.getLevel());

    this.scene.start('GameOverScene', {
      score: finalScore,
      level: this.levelSystem.getLevel(),
      wave: this.waveSystem.getWaveNumber()
    });
  }
}
```

---

## 14. Consideraciones y limitaciones conocidas

1. **Gravedad global en `src/main.js`:** Actualmente `src/main.js` define `arcade: { gravity: { y: 300 } }`. Todas las entidades de gameplay (`Player`, `Enemy`, `Bullet`) desactivan explícitamente `body.setAllowGravity(false)` para no caer por gravedad, aunque se recomienda que Integrante 3 ajuste `gravity: { y: 0 }` cuando configure definitivamente el shooter.
2. **Recursos gráficos pendientes (`Preloader.js`):** Aún no existen archivos en `public/assets/images/` ni texturas para enemigos o proyectiles en `Preloader.js`. `ensureTexture.js` genera formas vectoriales temporales automáticamente cuando falta la textura, y usará automáticamente los sprites definitivos en cuanto se carguen bajo las claves `'player'`, `'enemy_basic'`, `'enemy_fast'`, `'enemy_tank'`, `'bullet_player'` y `'bullet_enemy'`.
3. **Claves de audio:** `Preloader.js` registra actualmente `'sfx_jump'` y `'sfx_coin'`. Integrante 3 deberá agregar y registrar las claves de audio definitivas del shooter (disparo, explosión, daño) antes de conectarlas a los callbacks.
4. **Escenas sin modificar:** `GameScene.js`, `MenuScene.js`, `PauseScene.js`, `GameOverScene.js`, `Boot.js`, `Preloader.js` y `main.js` se mantienen intactos; la conexión final en `GameScene.js` corresponde a Integrante 3.
5. **Pausa:** Al usar `this.scene.pause()` y `this.scene.launch('PauseScene')` (como ya hace `GameScene.js`), Phaser detiene `scene.sys.step` (y por tanto `UpdateList` / `preUpdate`, `physics` y `TimerEvent`). Como la cadencia de disparo e invulnerabilidad de `Player` (y el patrón/cadencia de `Enemy`) acumulan `delta` dentro de `preUpdate(time, delta)` y `WaveSystem` usa `scene.time.addEvent`, el tiempo restante de invulnerabilidad, cadencia y spawns se congela exactamente al pausar y continúa desde el tiempo restante al reanudar.

