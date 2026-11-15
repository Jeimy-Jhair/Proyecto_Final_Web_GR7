# Entrega — Gameplay, Entidades y Sistemas

## 1. Información general

- **Nombre del proyecto:** `proyecto-final-web-gr7` — Videojuego Arcade Shooter
- **Nombre de la entrega:** Gameplay — Integrante 1
- **Tecnologías utilizadas:** JavaScript (ES Modules), Phaser 3 y Vite
- **Versión de Phaser:** declarada en `package.json` como `"^3.80.1"`; versión instalada y verificada en ejecución: **`3.90.0`** (junto con Vite `5.4.21`, rango `"^5.4.0"`)
- **Rama de trabajo:** `gameplay`

---

## 2. Alcance de la implementación

### Responsabilidades cubiertas por el Integrante 1
Se desarrollaron y validaron las entidades y sistemas que gobiernan la lógica interna de una partida:

- Movimiento, disparo, cadencia, vidas e invulnerabilidad del jugador.
- Tipos de enemigos, patrones de desplazamiento, salud, daño y salida de pantalla.
- Proyectiles aliados y enemigos reutilizables, con prevención de impactos múltiples.
- Registro y resolución centralizada de colisiones mediante Phaser Arcade Physics.
- Cálculo de puntuación de la partida actual.
- Generación temporizada, conteo y finalización de oleadas.
- Progresión de niveles y escalado de dificultad.

### Responsabilidades fuera de alcance
No se implementaron ni modificaron módulos pertenecientes a los otros integrantes:

- **Integrante 2 (UI/UX):** menú principal visual, HUD en pantalla, menú de pausa, pantalla Game Over, botones táctiles y estilos.
- **Integrante 3 (Arquitectura e integración):** `src/main.js`, `Boot.js`, `Preloader.js`, `GameScene.js`, `PauseScene.js`, `GameOverScene.js`, `MenuScene.js`, `AudioManager.js` y `StorageManager.js`.

La implementación quedó desacoplada mediante métodos públicos y callbacks, lista para conectarse desde `GameScene.js` y ser consumida por la interfaz sin modificar la lógica de gameplay.

---

## 3. Estructura de archivos

Árbol de los archivos creados para el módulo de gameplay y su documentación/validación (rutas reales del repositorio):

```text
Proyecto_Final_Web_GR7/
├── docs/
│   ├── Guia_Integrante_1_Arcade_Shooter.md
│   ├── INTEGRACION_GAMEPLAY.md
│   └── ENTREGA_GAMEPLAY_INTEGRANTE_1.md
├── src/
│   ├── objects/
│   │   ├── Bullet.js
│   │   ├── Enemy.js
│   │   ├── Player.js
│   │   ├── ensureTexture.js
│   │   └── poolHelper.js
│   └── systems/
│       ├── CollisionSystem.js
│       ├── LevelSystem.js
│       ├── ScoreSystem.js
│       └── WaveSystem.js
└── tests/
    ├── gameplay.test.js
    └── phaserTestHarness.js
```

---

## 4. Entidades implementadas

### `src/objects/Player.js` (`Player extends Phaser.Physics.Arcade.Sprite`)
- **Función principal:** Representar al jugador y controlar su desplazamiento, disparos, recepción de daño, vidas e invulnerabilidad temporal.
- **Características implementadas:**
  - Movimiento en 8 direcciones con flechas, teclas `WASD` o entrada externa mediante `setMovementInput(input)`.
  - Normalización del vector diagonal (`Math.SQRT1_2`) para mantener velocidad uniforme.
  - Límites de área jugable (`bounds`) anulando la componente de velocidad saliente antes de `setVelocity()`, evitando vibración en los bordes.
  - Disparo hacia arriba con `SPACE` o `shoot()`, respetando `fireRate`.
  - Temporizadores de cadencia e invulnerabilidad basados en `delta` dentro de `preUpdate(time, delta)`, por lo que se pausan automáticamente con la escena.
  - Parpadeo visual de alfa durante la invulnerabilidad y desactivación del cuerpo físico al morir.
- **Métodos públicos relevantes:** `update()`, `move()`, `shoot(targetGroup)`, `canShoot()`, `takeDamage(amount = 1, ignoreInvulnerability = false)`, `getLives()`, `getMaxLives()`, `isAlive()`, `isInvulnerable()`, `setMovementInput(input)`, `setBulletGroup(group)`, `reset(x, y)`, `destroy(fromScene)`.
- **Parámetros importantes (`options`):** `texture` (`'player'`), `speed` (`320`), `maxLives` (`3`), `lives`, `fireRate` (`220`), `bulletSpeed` (`540`), `bulletDamage` (`1`), `bulletTexture` (`'bullet_player'`), `bulletGroup`, `invulnerabilityDuration` (`1000`), `bounds`, `controls`.
- **Callbacks:** `onShoot(bullet)`, `onDamage({ lives, maxLives, amount })`, `onDeath()`.
- **Consideraciones de uso:** Si no se entrega `options.controls`, `Player` crea sus teclas y las limpia en `destroy()`; si la escena administra teclas propias, debe pasarlas en `options.controls` para evitar lecturas duplicadas.

### `src/objects/Enemy.js` (`Enemy extends Phaser.Physics.Arcade.Sprite` + `ENEMY_TYPES`)
- **Función principal:** Representar a cada enemigo individual con comportamiento y atributos configurables según su tipo.
- **Características implementadas:**
  - Tres perfiles predefinidos en `ENEMY_TYPES`: `basic` (`1 HP`, `100 pts`, `straight`), `fast` (`1 HP`, `150 pts`, `zigzag`) y `tank` (`3 HP`, `300 pts`, `2` de daño por contacto).
  - Rebotes horizontales limpios en patrón `zigzag` invirtiendo `_zigzagSign` al alcanzar `minX` o `maxX`.
  - Disparo enemigo opcional hacia abajo (`canShoot` + `bulletGroup`) con cadencia basada en `delta`.
  - Prevención de doble muerte mediante `defeatedProcessed` y detección única de escape por borde inferior (`escaped`).
- **Métodos públicos relevantes:** `spawn(x, y, options)`, `move(elapsed)`, `takeDamage(amount = 1)`, `deactivate()`, `getHealth()`, `getMaxHealth()`, `isAlive()`, `getScoreValue()`, `getDamage()`, `getType()`, `destroy(fromScene)`.
- **Parámetros importantes (`options` en `spawn`):** `type`, `speed`, `health`, `scoreValue`, `damage`, `pattern`, `amplitude`, `frequency`, `zigzagDirection`, `canShoot`, `fireRate`, `bulletSpeed`, `bulletDamage`, `bulletGroup`, `bounds`.
- **Callbacks:** `onDefeated(enemy)`, `onEscape(enemy)`.
- **Consideraciones de uso:** Diseñada para reutilizarse en grupo mediante `spawn()` y `deactivate()`. Cuando se usa junto a `WaveSystem` y `CollisionSystem`, el conteo de bajas se canaliza por `CollisionSystem` y `WaveSystem` conecta únicamente `onEscape`.

### `src/objects/Bullet.js` (`Bullet extends Phaser.Physics.Arcade.Sprite`)
- **Función principal:** Representar proyectiles aliados y enemigos con soporte de reutilización en grupos físicos.
- **Características implementadas:**
  - Diferenciación de propietario (`'player'` o `'enemy'`).
  - Vector de dirección normalizado con velocidad y daño configurables.
  - Prevención de impactos múltiples en un mismo frame mediante `consumeHit()` (bandera `hasHit`).
  - Desactivación automática en `preUpdate` al salir de los límites de pantalla.
  - Resguardo automático en `preUpdate`: si un proyectil ya disparado se añade manualmente con `physicsGroup.add(bullet)`, restaura `allowGravity = false` y la velocidad configurada.
- **Métodos públicos relevantes:** `fire(x, y, options)`, `consumeHit()`, `deactivate()`, `getDamage()`, `getOwner()`, `isFromPlayer()`, `isFromEnemy()`.
- **Parámetros importantes (`options` en `fire`):** `owner` (`'player'`), `damage` (`1`), `speed` (`520`), `direction` (`{ x: 0, y: -1 }` o `{ x: 0, y: 1 }` para enemigos), `texture`, `bounds`.
- **Consideraciones de uso:** Para pooling estándar usar `group.get(x, y)` seguido de `bullet.fire(...)`; para inserción manual, crear con `{ autoFire: false }`, agregar con `group.add(bullet)` y luego llamar `bullet.fire(...)`.

---

## 5. Sistemas implementados

| Sistema | Archivo | Métodos clave | Responsabilidad e interacción |
| :--- | :--- | :--- | :--- |
| **Colisiones** | `src/systems/CollisionSystem.js` | `setupCollisions()`, `handleBulletEnemyCollision()`, `handlePlayerEnemyCollision()`, `handleEnemyBulletPlayerCollision()`, `setGroups()`, `destroy()` | Registra los `overlap` una sola vez (`initialized`). Aplica daño, consume el proyectil, suma puntos en `ScoreSystem`, descuenta enemigos en `WaveSystem`, desactiva enemigos tras choque con jugador sin dar puntos y detiene `WaveSystem` al morir el jugador. |
| **Puntuación** | `src/systems/ScoreSystem.js` | `addPoints(amount)`, `getScore()`, `reset(notify)` | Administra la puntuación entera no negativa de la partida actual. Ignora valores inválidos (`<= 0`, `NaN`, no numéricos) y notifica cambios mediante `onChange(score, delta)`. |
| **Oleadas** | `src/systems/WaveSystem.js` | `startWave(waveNumber, waveConfig)`, `spawnEnemies()`, `onEnemyDefeated()`, `onEnemyRemoved()`, `isWaveComplete()`, `getWaveNumber()`, `getWaveState()`, `getActiveEnemyCount()`, `getRemainingEnemies()`, `stop()`, `reset()`, `destroy()` | Consulta dificultad en `LevelSystem`, genera enemigos con `scene.time.addEvent`, valida `speedMultiplier > 0` y `healthBonus >= 0`, rastrea enemigos activos con un `Set` para evitar conteos duplicados y detecta el fin de oleada cuando todos aparecieron y `activeEnemies.size === 0`. |
| **Niveles** | `src/systems/LevelSystem.js` | `recordWaveCompleted(waveId)`, `nextLevel()`, `getLevel()`, `getWavesCompletedInLevel()`, `isAtMaxLevel()`, `getDifficulty()`, `reset()` | Controla el nivel actual y calcula parámetros acotados de dificultad (`enemyCount`, `spawnInterval`, `speedMultiplier`, `healthBonus`, `enemyTypes`, `enableEnemyShooting`). Evita incrementos repetidos por un mismo `waveId`. |

---

## 6. Utilidades internas

- **`src/objects/ensureTexture.js` (`ensureTexture`):**
  - **Qué hace:** Comprueba si una clave de textura existe en `scene.textures`; si falta, crea una textura procedural temporal (`scene.textures.createCanvas` cuando no hay renderer en modo Headless o `scene.make.graphics` + `generateTexture` en navegador).
  - **Por qué existe:** `Preloader.js` aún no cuenta con las imágenes de enemigos ni proyectiles en disco. Esta utilidad evita duplicar código gráfico en las entidades y garantiza dimensiones físicas válidas hoy, cediendo automáticamente a los sprites finales cuando se carguen.
  - **Módulos que la utilizan:** `Player.js`, `Enemy.js` y `Bullet.js`.

- **`src/objects/poolHelper.js` (`acquireFromGroup`):**
  - **Qué hace:** Obtiene una instancia reutilizable de un grupo de Phaser usando `group.get(...)` cuando `classType` coincide, o reutilizando/creando e insertando una instancia compatible si el grupo se creó sin `classType`.
  - **Por qué existe:** Centraliza la lógica de obtención desde grupos en un único lugar y previene errores si la escena instancia `physics.add.group()` sin especificar `classType`.
  - **Módulos que la utilizan:** `Player.js`, `Enemy.js` y `WaveSystem.js`.

---

## 7. Mecánicas implementadas

| Mecánica | Estado actual | Qué requiere conexión desde `GameScene.js` |
| :--- | :--- | :--- |
| Movimiento del jugador (8 direcciones, diagonal normalizada, límites) | Implementado | Llamar `this.player.update()` dentro de `GameScene.update()`. |
| Disparo del jugador y cadencia | Implementado | Proveer `playerBullets` y conectar `onShoot` con `AudioManager` si se desea SFX. |
| Enemigos (`basic`, `fast` zigzag, `tank`, disparo opcional) | Implementado | Proveer `enemies` (y `enemyBullets` si se habilitan disparos desde nivel 4). |
| Proyectiles aliados y enemigos + salida de pantalla | Implementado | Configurar `runChildUpdate: true` en los grupos físicos. |
| Colisiones y aplicación de daño | Implementado | Instanciar `CollisionSystem` y llamar `setupCollisions()` una vez en `create()`. |
| Vidas e invulnerabilidad temporal | Implementado | Conectar `onDamage` / `player.getLives()` con el HUD. |
| Puntuación en partida | Implementado | Conectar `ScoreSystem.onChange` con el HUD y `StorageManager.setHighScore` al finalizar. |
| Oleadas (inicio, spawn temporizado, conteo, fin y `stop()`) | Implementado | Llamar `waveSystem.startWave(1)` y encadenar nuevas oleadas en `onWaveComplete`. |
| Progresión de niveles y dificultad | Implementado | Llamar `levelSystem.recordWaveCompleted(waveNumber)` al completar oleada y pasar `onLevelUp` al HUD / `StorageManager.setLevel`. |
| Muerte del jugador y derrota | Implementado | Usar `onPlayerDeath` (o `Player.onDeath`) para guardar récord y cambiar a `GameOverScene`. |
| Reinicio y reutilización de entidades | Implementado | Al reiniciar escena con `scene.start('GameScene')` se limpia todo automáticamente en `shutdown`; para reinicio sin recargar escena, invocar `reset()` en sistemas/jugador y desactivar hijos activos de los grupos. |

---

## 8. Consideraciones técnicas importantes

- **Phaser Arcade Physics y gravedad:** `src/main.js` define `gravity: { y: 300 }` globalmente. `Player`, `Enemy` y `Bullet` ejecutan `body.setAllowGravity(false)` al crearse y reactivarse para no caer por gravedad.
- **Comportamiento durante la pausa (`delta`):** Al pausar con `scene.pause()`, Phaser detiene `scene.sys.step` (que ejecuta `preUpdate`, física y `TimerEvent`). Tanto los temporizadores de `WaveSystem` (`scene.time.addEvent`) como la cadencia e invulnerabilidad de `Player` y el patrón/cadencia de `Enemy` (basados en `delta` dentro de `preUpdate`) conservan exactamente el tiempo restante al reanudar.
- **Object pooling y reutilización:** `Bullet.fire()` y `Enemy.spawn()` reinician estado, textura, tamaño de cuerpo físico y banderas antes de reactivar la entidad; `deactivate()` usa `disableBody(true, true)` para devolverla al pool sin destruir memoria cada frame.
- **Prevención de duplicados:** `Bullet.consumeHit()` impide impactos múltiples; `Enemy.defeatedProcessed` impide muertes repetidas; `WaveSystem` usa un `Set` (`activeEnemies.delete`) para contar cada enemigo una sola vez; `LevelSystem.recordWaveCompleted(waveId)` ignora `waveId` repetidos; `CollisionSystem.setupCollisions()` se ejecuta una única vez.
- **Limpieza de ciclo de vida:** `WaveSystem` y `CollisionSystem` se suscriben a `scene.events.once('shutdown', ...)` para cancelar `TimerEvent` y remover colliders (`world.removeCollider`) automáticamente al abandonar o reiniciar la escena. `Player.destroy()` libera las teclas propias (`cursors`, `wasd`, `shootKey`).
- **Acoplamiento cero:** Ningún archivo de `src/objects/` o `src/systems/` importa ni modifica el DOM, el HUD, `AudioManager`, `StorageManager` ni las escenas. Toda comunicación hacia afuera ocurre mediante callbacks opcionales o métodos públicos de consulta.

---

## 9. Integración con los otros integrantes

Para detalles completos de firmas y un ejemplo íntegro de `GameScene.js`, consultar [INTEGRACION_GAMEPLAY.md](file:///c:/Users/David/Documents/Proyecto_Final_Web_GR7/docs/INTEGRACION_GAMEPLAY.md).

### Para Integrante 2 (Interfaz y HUD)
- **Datos que debe mostrar el HUD:** puntuación actual, vidas actuales/máximas del jugador, nivel actual, número y estado de la oleada, y transición visual ante daño o derrota.
- **Consultas directas disponibles:**
  - Puntuación: `scoreSystem.getScore()`
  - Vidas y estado: `player.getLives()`, `player.getMaxLives()`, `player.isAlive()`, `player.isInvulnerable()`
  - Nivel: `levelSystem.getLevel()`
  - Oleada: `waveSystem.getWaveNumber()`, `waveSystem.getWaveState()` (`'idle' | 'spawning' | 'active' | 'completed' | 'stopped'`), `waveSystem.getRemainingEnemies()`
- **Actualizaciones reactivas:** recibir valores desde los callbacks que `GameScene.js` conecte (`ScoreSystem.onChange`, `Player.onDamage`, `Player.onDeath`, `WaveSystem.onWaveStart`, `WaveSystem.onWaveComplete`, `LevelSystem.onLevelUp`, `CollisionSystem.onPlayerDeath`).
- **Dependencias a evitar:** el HUD no debe calcular puntos, vidas ni progresión de nivel, ni importar directamente las clases de `src/objects/` o `src/systems/` si `GameScene.js` le entrega los datos o métodos de actualización.

### Para Integrante 3 (Arquitectura e integración)
1. **Grupos físicos en `GameScene.create()`:** crear `playerBullets` (`classType: Bullet`), `enemies` (`classType: Enemy`) y opcionalmente `enemyBullets` (`classType: Bullet`), todos con `runChildUpdate: true` y `allowGravity: false`.
2. **Instanciación:** crear `ScoreSystem` y `LevelSystem`, luego `Player` (pasando `bulletGroup`), `WaveSystem` (pasando `enemies`, `levelSystem` y `enemyBulletGroup`) y `CollisionSystem`.
3. **Colisiones:** llamar `collisionSystem.setupCollisions()` una sola vez en `create()`.
4. **Inicio y bucle:** invocar `waveSystem.startWave(1)` en `create()` y `this.player?.update()` en `GameScene.update()`.
5. **Conexión con escenas, audio y persistencia:**
   - Conectar `onShoot` / `onBulletHitEnemy` / `onEnemyDefeated` / `onPlayerHit` con `this.registry.get('audioManager')?.playSfx(...)` una vez definidas las claves definitivas en `Preloader.js`.
   - En `onWaveComplete({ waveNumber })`, llamar `levelSystem.recordWaveCompleted(waveNumber)` y programar `waveSystem.startWave(waveNumber + 1)` verificando que el jugador siga vivo.
   - En `onPlayerDeath`, guardar puntuación máxima con `StorageManager.setHighScore(...)`, nivel con `StorageManager.setLevel(...)` y lanzar `this.scene.start('GameOverScene', { score, level, wave })`.
6. **Archivos a revisar al integrar:**
   - `GameScene.js`: reemplazar los textos temporales en la `ZONA PARA MECÁNICAS` manteniendo los atajos/transiciones necesarias.
   - `Preloader.js`: cargar las imágenes (`player`, `enemy_basic`, `enemy_fast`, `enemy_tank`, `bullet_player`, `bullet_enemy`) y los efectos de sonido del shooter.
   - `main.js`: evaluar cambiar `gravity: { y: 300 }` a `{ y: 0 }` para mantener coherencia de proyecto.

---

## 10. Pruebas y validación

- **Ejecución de pruebas automatizadas:**
  ```bash
  node --test tests/gameplay.test.js
  ```
  - **Resultado observado:** **8/8 pruebas aprobadas** (3 suites, 0 fallos, ~1.36 s) usando `Phaser v3.90.0-FB (Headless)` con física Arcade (`gravity: { y: 300 }`).
- **Compilación de producción:**
  ```bash
  npm run build
  ```
  - **Resultado observado:** **exit code 0** (`vite v5.4.21`, 15 módulos transformados, salida generada en `dist/`).
- **Cobertura de las pruebas (`tests/gameplay.test.js`):**
  - `ScoreSystem`: puntaje inicial, sumas válidas, rechazo de negativos/`0`/`NaN`/strings y reinicio.
  - `LevelSystem`: avance por oleadas, prevención de duplicados por `waveId`, desbloqueo progresivo de tipos, topes máximos y reinicio.
  - `Player`: velocidad diagonal normalizada, anulación de velocidad saliente en límites, deslizamiento por bordes, cadencia e invulnerabilidad basadas en `delta`, preservación exacta del tiempo restante tras `scene.pause()`/`scene.resume()`, muerte, `reset()` y limpieza de teclas propias (`cursors`, `wasd`, `shootKey`) en `destroy()`.
  - `Bullet`: dirección/daño, prevención de impacto duplicado (`consumeHit`), reutilización en pool, desactivación fuera de pantalla y conservación de vuelo/gravedad al añadirse manualmente con `PhysicsGroup.add()`.
  - `Enemy`: tipos `basic`/`fast`/`tank`, rebote `zigzag` en bordes sin vibración, muerte única, escape por borde inferior y balas enemigas.
  - `WaveSystem` + `CollisionSystem`: registro único de colisiones, overlap real del mundo Arcade (`singleStep`), disparo de `TimerEvent` mediante reloj de escena, validación segura ante `speedMultiplier <= 0` y `healthBonus < 0`, flujo completo hasta fin de oleada y muerte del jugador, y reinicio limpio.
- **Pruebas Headless vs. integración visual en navegador:**
  - Las pruebas automatizadas validan la lógica, físicas Arcade, temporizadores y ciclo de escena sin interfaz gráfica ni renderer WebGL/Canvas real (`Phaser.HEADLESS` con entorno DOM simulado en `tests/phaserTestHarness.js`).
  - **La integración visual interactiva en navegador aún no está terminada**, ya que `GameScene.js` conserva el cascarón base hasta la integración por el Integrante 3.

---

## 11. Limitaciones y tareas pendientes

1. **Conexión en `GameScene.js`:** falta integrar las instancias de gameplay dentro de la escena principal (responsabilidad de Integrante 3).
2. **Recursos gráficos y sonoros definitivos:** no existen aún archivos en `public/assets/` y `Preloader.js` registra claves de ejemplo (`sfx_jump`, `sfx_coin`); actualmente las entidades dibujan figuras vectoriales temporales vía `ensureTexture.js`.
3. **Verificación del HUD:** falta comprobar el enlace visual entre los datos del gameplay y la interfaz construida por Integrante 2.
4. **Prueba completa en navegador:** pendiente ejecutar una partida interactiva real (`npm run dev`) tras conectar `GameScene.js`, `HUD` y `Preloader.js`.
5. **Gravedad global en `src/main.js`:** `gravity: { y: 300 }` sigue activo en la configuración general; aunque los objetos de gameplay lo neutralizan internamente, conviene coordinar con Integrante 3 su ajuste a `{ y: 0 }`.

---

## 12. Recomendaciones para el equipo

- Respetar los límites de archivos de cada integrante y coordinar antes de editar escenas compartidas.
- No reimplementar cálculos de puntuación, conteo de enemigos ni progresión de nivel dentro de `GameScene.js` o del HUD: usar siempre `ScoreSystem`, `WaveSystem` y `LevelSystem` como única fuente de verdad.
- Consultar [INTEGRACION_GAMEPLAY.md](file:///c:/Users/David/Documents/Proyecto_Final_Web_GR7/docs/INTEGRACION_GAMEPLAY.md) antes de conectar los módulos en `GameScene.js` y mantener los nombres de métodos y payloads de callbacks acordados.
- Si se requiere cambiar alguna firma pública o callback durante la integración, comunicarlo al equipo antes de fusionar ramas hacia `main`.

---

## 13. Estado de entrega

- **Implementado:** Las 3 entidades (`Player.js`, `Enemy.js`, `Bullet.js`), los 4 sistemas (`CollisionSystem.js`, `ScoreSystem.js`, `WaveSystem.js`, `LevelSystem.js`) y las 2 utilidades internas (`ensureTexture.js`, `poolHelper.js`), más la documentación técnica en `docs/INTEGRACION_GAMEPLAY.md`.
- **Probado:** 8/8 pruebas unitarias y de integración aprobadas en `Phaser.HEADLESS` (`node --test tests/gameplay.test.js`) y compilación de producción exitosa (`npm run build`).
- **Pendiente para completar la integración general:** Conectar los módulos en `GameScene.js`, enlazar el HUD de Integrante 2, cargar los recursos finales en `Preloader.js`, ajustar la gravedad global en `src/main.js` si el equipo lo acuerda y validar la partida completa en navegador.

