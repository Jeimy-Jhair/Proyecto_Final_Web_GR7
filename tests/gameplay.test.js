import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupPhaserTestEnv, createHeadlessScene } from './phaserTestHarness.js';

setupPhaserTestEnv();

const { default: ScoreSystem } = await import('../src/systems/ScoreSystem.js');
const { default: LevelSystem } = await import('../src/systems/LevelSystem.js');
const { default: Player } = await import('../src/objects/Player.js');
const { default: Enemy, ENEMY_TYPES } = await import('../src/objects/Enemy.js');
const { default: Bullet } = await import('../src/objects/Bullet.js');
const { default: CollisionSystem } = await import('../src/systems/CollisionSystem.js');
const { default: WaveSystem } = await import('../src/systems/WaveSystem.js');

describe('ScoreSystem', () => {
  test('inicia en el puntaje esperado, suma puntos válidos, ignora inválidos y reinicia', () => {
    const events = [];
    const score = new ScoreSystem({
      initialScore: 0,
      onChange: (value, delta) => events.push({ value, delta })
    });

    assert.equal(score.getScore(), 0);
    assert.equal(score.addPoints(100), 100);
    assert.equal(score.addPoints(50.9), 150);

    // Entradas inválidas no alteran el puntaje ni disparan callback
    assert.equal(score.addPoints(-20), 150);
    assert.equal(score.addPoints(0), 150);
    assert.equal(score.addPoints(NaN), 150);
    assert.equal(score.addPoints('200'), 150);
    assert.equal(events.length, 2);

    score.reset();
    assert.equal(score.getScore(), 0);
    assert.deepEqual(events.at(-1), { value: 0, delta: 0 });
  });
});

describe('LevelSystem', () => {
  test('progresa por oleada sin duplicar avances para un mismo waveId y respeta límites', () => {
    const levelEvents = [];
    const levels = new LevelSystem({
      initialLevel: 1,
      wavesPerLevel: 1,
      maxLevel: 5,
      baseEnemyCount: 6,
      enemyCountIncrement: 2,
      maxEnemyCount: 10,
      baseSpawnInterval: 1000,
      spawnIntervalDecrement: 200,
      minSpawnInterval: 500,
      onLevelUp: (payload) => levelEvents.push(payload.level)
    });

    assert.equal(levels.getLevel(), 1);
    assert.deepEqual(levels.getDifficulty().enemyTypes, ['basic']);

    // Mismo waveId no debe incrementar dos veces
    const first = levels.recordWaveCompleted(1);
    assert.equal(first.leveledUp, true);
    assert.equal(levels.getLevel(), 2);

    const duplicate = levels.recordWaveCompleted(1);
    assert.equal(duplicate.leveledUp, false);
    assert.equal(levels.getLevel(), 2);
    assert.deepEqual(levels.getDifficulty().enemyTypes, ['basic', 'fast']);

    levels.recordWaveCompleted(2); // nivel 3
    assert.deepEqual(levels.getDifficulty().enemyTypes, ['basic', 'fast', 'tank']);

    levels.recordWaveCompleted(3); // nivel 4
    levels.recordWaveCompleted(4); // nivel 5 (maxLevel)
    const atCap = levels.recordWaveCompleted(5);
    assert.equal(atCap.leveledUp, false);
    assert.equal(levels.getLevel(), 5);

    const diff = levels.getDifficulty();
    assert.equal(diff.enemyCount, 10); // tope maxEnemyCount
    assert.equal(diff.spawnInterval, 500); // tope minSpawnInterval
    assert.deepEqual(levelEvents, [2, 3, 4, 5]);

    levels.reset();
    assert.equal(levels.getLevel(), 1);
    assert.equal(levels.recordWaveCompleted(1).leveledUp, true);
  });
});

describe('Módulos con Phaser HEADLESS y Físicas Arcade', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await createHeadlessScene();
  });

  afterEach(() => {
    ctx?.cleanup();
  });

  test('Player: movimiento normalizado, límites, cadencia de disparo, daño, muerte y reset', () => {
    const { scene } = ctx;
    const bullets = scene.physics.add.group({
      classType: Bullet,
      maxSize: 20,
      runChildUpdate: true
    });

    const damageEvents = [];
    let deathCount = 0;

    const player = new Player(scene, 400, 300, {
      speed: 200,
      maxLives: 2,
      fireRate: 250,
      invulnerabilityDuration: 500,
      bulletGroup: bullets,
      onDamage: (e) => damageEvents.push(e.lives),
      onDeath: () => { deathCount += 1; }
    });

    assert.equal(player.body.allowGravity, false);
    assert.equal(player.isAlive(), true);
    assert.equal(player.getLives(), 2);

    // Movimiento diagonal normalizado
    player.setMovementInput({ right: true, down: true });
    player.move();
    const speedMag = Math.hypot(player.body.velocity.x, player.body.velocity.y);
    assert.ok(Math.abs(speedMag - 200) < 0.01, `Velocidad diagonal esperada ~200, fue ${speedMag}`);

    // Límites del escenario y anulación de velocidad saliente en el borde
    player.setPosition(-50, 900);
    player.setMovementInput({ left: true, down: true });
    player.move();
    assert.ok(player.x >= player.displayWidth / 2);
    assert.ok(player.y <= 600 - player.displayHeight / 2);
    assert.equal(player.body.velocity.x, 0);
    assert.equal(player.body.velocity.y, 0);

    // En el borde derecho, desliza hacia arriba sin velocidad saliente en X
    player.setPosition(800, 300);
    player.setMovementInput({ right: true, up: true });
    player.move();
    assert.equal(player.body.velocity.x, 0);
    assert.equal(player.body.velocity.y, -200);

    // Cadencia de disparo controlada por delta en preUpdate
    const b1 = player.shoot();
    assert.ok(b1 instanceof Bullet);
    assert.equal(b1.body.allowGravity, false);
    assert.ok(b1.body.velocity.y < 0);

    player.preUpdate(100, 100); // quedan 150 ms de cadencia
    assert.equal(player.shoot(), null);

    player.preUpdate(250, 150); // cadencia cumplida (250 ms)
    const b2 = player.shoot();
    assert.ok(b2 instanceof Bullet);

    // Daño con invulnerabilidad temporal basada en delta
    assert.equal(player.takeDamage(1), true);
    assert.equal(player.getLives(), 1);
    assert.equal(player.isInvulnerable(), true);

    // Bloqueado durante i-frames (200 ms < 500 ms)
    player.preUpdate(450, 200);
    assert.equal(player.takeDamage(1), false);
    assert.equal(player.getLives(), 1);

    // Segundo daño letal tras terminar los 500 ms de i-frames
    player.preUpdate(800, 350);
    assert.equal(player.isInvulnerable(), false);
    assert.equal(player.takeDamage(1), true);
    assert.equal(player.getLives(), 0);
    assert.equal(player.isAlive(), false);
    assert.equal(deathCount, 1);
    assert.deepEqual(damageEvents, [1, 0]);

    // No puede disparar ni moverse estando eliminado
    player.preUpdate(2000, 1000);
    assert.equal(player.shoot(), null);

    // Reinicio completo
    player.reset(400, 540);
    assert.equal(player.isAlive(), true);
    assert.equal(player.getLives(), 2);
    assert.equal(player.x, 400);
    assert.equal(player.y, 540);
  });

  test('Bullet: prevención de impacto duplicado y destrucción al salir de pantalla', () => {
    const { scene } = ctx;
    const bullets = scene.physics.add.group({
      classType: Bullet,
      maxSize: 10,
      runChildUpdate: true
    });

    const bullet = bullets.get(400, 300);
    bullet.fire(400, 300, {
      owner: 'player',
      damage: 2,
      speed: 500,
      direction: { x: 0, y: -1 }
    });

    assert.equal(bullet.active, true);
    assert.equal(bullet.getDamage(), 2);
    assert.equal(bullet.getOwner(), 'player');
    assert.equal(bullet.body.allowGravity, false);

    // Impacto válido una sola vez
    assert.equal(bullet.consumeHit(), true);
    assert.equal(bullet.active, false);
    assert.equal(bullet.consumeHit(), false);

    // Reutilización y salida de límites
    const reused = bullets.get(400, -100);
    reused.fire(400, -100, { owner: 'player', speed: 500 });
    assert.equal(reused.active, true);
    reused.preUpdate(100, 16);
    assert.equal(reused.active, false);
  });

  test('Enemy: tipos configurables, daño único sin doble muerte y escape inferior', () => {
    const { scene } = ctx;
    const enemies = scene.physics.add.group({
      classType: Enemy,
      maxSize: 10,
      runChildUpdate: true
    });

    let defeatedCount = 0;
    const tank = enemies.get(200, 50);
    tank.spawn(200, 50, {
      type: 'tank',
      onDefeated: () => { defeatedCount += 1; }
    });

    assert.equal(tank.body.allowGravity, false);
    assert.equal(tank.getType(), 'tank');
    assert.equal(tank.getHealth(), ENEMY_TYPES.tank.health);
    assert.equal(tank.getScoreValue(), ENEMY_TYPES.tank.scoreValue);

    tank.takeDamage(1);
    assert.equal(tank.isAlive(), true);
    assert.equal(tank.getHealth(), ENEMY_TYPES.tank.health - 1);

    tank.takeDamage(5);
    assert.equal(tank.isAlive(), false);
    assert.equal(tank.active, false);
    assert.equal(defeatedCount, 1);

    // Daño posterior sobre enemigo muerto no vuelve a disparar onDefeated
    assert.equal(tank.takeDamage(1), false);
    assert.equal(defeatedCount, 1);

    // Escape por borde inferior
    let escapedCount = 0;
    const runner = enemies.get(300, 640);
    runner.spawn(300, 640, {
      type: 'fast',
      onEscape: () => { escapedCount += 1; }
    });
    runner.preUpdate(200, 16);
    assert.equal(runner.active, false);
    assert.equal(runner.isAlive(), false);
    assert.equal(escapedCount, 1);
  });

  test('CollisionSystem, WaveSystem y flujo completo de integración sin duplicados', () => {
    const { scene } = ctx;
    const playerBullets = scene.physics.add.group({ classType: Bullet, maxSize: 30, runChildUpdate: true });
    const enemyBullets = scene.physics.add.group({ classType: Bullet, maxSize: 20, runChildUpdate: true });
    const enemies = scene.physics.add.group({ classType: Enemy, maxSize: 20, runChildUpdate: true });

    const scoreSystem = new ScoreSystem({ initialScore: 0 });
    const levelSystem = new LevelSystem({ initialLevel: 1, baseEnemyCount: 2, spawnIntervalDecrement: 100 });

    const player = new Player(scene, 400, 540, {
      maxLives: 3,
      fireRate: 100,
      invulnerabilityDuration: 0,
      bulletGroup: playerBullets
    });

    const waveCompletedEvents = [];
    const waveSystem = new WaveSystem(scene, enemies, {
      levelSystem,
      enemyBulletGroup: enemyBullets,
      spawnImmediately: true,
      onWaveComplete: (info) => waveCompletedEvents.push(info)
    });

    let deathNotified = 0;
    const collisionSystem = new CollisionSystem(
      scene,
      { player, playerBullets, enemies, enemyBullets },
      { scoreSystem, waveSystem },
      { onPlayerDeath: () => { deathNotified += 1; } }
    );

    // Registro único de colisiones
    assert.equal(collisionSystem.setupCollisions(), true);
    assert.equal(collisionSystem.setupCollisions(), false);

    // Inicia oleada 1 con 2 enemigos (1 ya generado inmediatamente)
    assert.equal(waveSystem.startWave(1), true);
    assert.equal(waveSystem.startWave(1), false); // No inicia dos veces
    assert.equal(waveSystem.getActiveEnemyCount(), 1);
    assert.equal(waveSystem.getRemainingEnemies(), 2);

    // Generar el segundo enemigo manualmente (simulando tick del timer)
    const spawnedList = [...waveSystem.activeEnemies];
    const secondEnemy = waveSystem.spawnEnemies();
    assert.ok(secondEnemy instanceof Enemy);
    spawnedList.push(secondEnemy);

    assert.equal(waveSystem.getActiveEnemyCount(), 2);
    assert.equal(waveSystem.getWaveState(), 'active');

    // Disparar contra primer enemigo y procesar impacto
    scene.time.now = 1000;
    const b1 = player.shoot();
    assert.equal(collisionSystem.handleBulletEnemyCollision(b1, spawnedList[0]), true);
    // Impacto repetido con la misma bala no suma puntos ni daña
    assert.equal(collisionSystem.handleBulletEnemyCollision(b1, spawnedList[0]), false);
    assert.equal(scoreSystem.getScore(), 100);
    assert.equal(waveSystem.isWaveComplete(), false);

    // También en integración: avanzar preUpdate para habilitar el siguiente disparo tras 100ms
    player.preUpdate(1200, 150);
    const b2 = player.shoot();
    assert.equal(collisionSystem.handleBulletEnemyCollision(b2, spawnedList[1]), true);
    assert.equal(scoreSystem.getScore(), 200);
    assert.equal(waveSystem.isWaveComplete(), true);
    assert.equal(waveCompletedEvents.length, 1);
    assert.deepEqual(waveCompletedEvents[0], {
      waveNumber: 1,
      defeatedCount: 2,
      escapedCount: 0,
      totalEnemies: 2
    });

    // Avanzar nivel y verificar nueva oleada
    levelSystem.recordWaveCompleted(1);
    assert.equal(levelSystem.getLevel(), 2);
    assert.equal(waveSystem.startWave(2), true);
    assert.equal(waveSystem.getRemainingEnemies(), 4); // base 2 + inc 2

    // Choque enemigo-jugador hasta derrota: detiene oleada y notifica muerte
    const wave2Enemies = [...waveSystem.activeEnemies];
    player.takeDamage(2, true); // queda con 1 vida
    assert.equal(collisionSystem.handlePlayerEnemyCollision(player, wave2Enemies[0]), true);
    assert.equal(player.isAlive(), false);
    assert.equal(deathNotified, 1);
    assert.equal(waveSystem.getWaveState(), 'stopped');
    assert.equal(waveSystem.spawnEnemies(), null);

    // Reinicio limpio de todos los sistemas
    waveSystem.reset();
    levelSystem.reset();
    scoreSystem.reset();
    player.reset(400, 540);
    assert.equal(scoreSystem.getScore(), 0);
    assert.equal(levelSystem.getLevel(), 1);
    assert.equal(waveSystem.getWaveState(), 'idle');
    assert.equal(player.getLives(), 3);

    collisionSystem.destroy();
    waveSystem.destroy();
  });

  test('Física Arcade overlap real, temporizador de oleada, zigzag, balas enemigas y grupos sin classType', () => {
    const { scene } = ctx;
    // Grupos sin classType para validar compatibilidad con poolHelper
    const playerBullets = scene.physics.add.group({ runChildUpdate: true });
    const enemyBullets = scene.physics.add.group({ runChildUpdate: true });
    const enemies = scene.physics.add.group({ runChildUpdate: true });

    const scoreSystem = new ScoreSystem({ initialScore: 0 });
    const levelSystem = new LevelSystem({
      initialLevel: 1,
      baseEnemyCount: 2,
      baseSpawnInterval: 500
    });

    const player = new Player(scene, 400, 540, {
      maxLives: 3,
      fireRate: 50,
      invulnerabilityDuration: 0,
      bulletGroup: playerBullets
    });

    const waveSystem = new WaveSystem(scene, enemies, {
      levelSystem,
      enemyBulletGroup: enemyBullets,
      spawnImmediately: true
    });

    const collisionSystem = new CollisionSystem(
      scene,
      { player, playerBullets, enemies, enemyBullets },
      { scoreSystem, waveSystem }
    );
    collisionSystem.setupCollisions();

    // Iniciar oleada 1 (1 spawn inmediato + 1 pendiente en timer a 500ms)
    waveSystem.startWave(1);
    assert.equal(waveSystem.getActiveEnemyCount(), 1);
    assert.equal(waveSystem.getRemainingEnemies(), 2);

    // Simular avance del reloj de escena (preUpdate inserta el evento pendiente, update avanza delta)
    scene.time.preUpdate(100, 16);
    scene.time.update(650, 550);
    assert.equal(waveSystem.getActiveEnemyCount(), 2);
    assert.equal(waveSystem.getRemainingEnemies(), 2);

    // Posicionar bala sobre el primer enemigo y ejecutar overlap real del mundo Arcade
    const [e1, e2] = [...waveSystem.activeEnemies];
    e1.setPosition(300, 200);
    scene.time.now = 1000;
    const bullet = player.shoot();
    assert.ok(bullet instanceof Bullet);
    bullet.setPosition(300, 200);
    bullet.body.reset(300, 200);
    e1.body.reset(300, 200);

    scene.physics.world.singleStep();
    assert.equal(e1.isAlive(), false);
    assert.equal(bullet.active, false);
    assert.equal(scoreSystem.getScore(), 100);

    // Probar patrón zigzag en Enemy
    e2.spawn(795, 100, { type: 'fast' });
    e2.move(100);
    assert.ok(e2.x <= 800 - e2.displayWidth / 2);

    // Probar bala enemiga contra jugador (disparada desde el grupo sin classType)
    const eBullet = new Bullet(scene, 400, 540, { owner: 'enemy', autoFire: false });
    enemyBullets.add(eBullet);
    eBullet.fire(400, 540, { owner: 'enemy', damage: 1, speed: 250 });
    player.body.reset(400, 540);
    scene.physics.world.singleStep();
    assert.equal(player.getLives(), 2);
    assert.equal(eBullet.active, false);

    // Detener oleada y verificar limpieza de temporizadores
    waveSystem.stop();
    assert.equal(waveSystem.getWaveState(), 'stopped');
    waveSystem.destroy();
    collisionSystem.destroy();
  });

  test('Correcciones: pausa real de escena, limpieza de cursors, zigzag sin rebote repetido, Bullet.add y WaveSystem inválido', () => {
    const { scene } = ctx;
    const playerBullets = scene.physics.add.group({ classType: Bullet, runChildUpdate: true });
    const enemyBullets = scene.physics.add.group({ runChildUpdate: true });
    const enemies = scene.physics.add.group({ classType: Enemy, runChildUpdate: true });

    // 1. Pausa real en Phaser: invulnerabilidad y cadencia conservan tiempo restante al reanudar
    const player = new Player(scene, 400, 540, {
      maxLives: 3,
      fireRate: 300,
      invulnerabilityDuration: 1000,
      bulletGroup: playerBullets
    });

    assert.ok(player.shoot() instanceof Bullet);
    assert.equal(player.takeDamage(1), true);
    assert.equal(player.canShoot(), false);

    // Primer tick inserta Player en UpdateList._active; segundo tick avanza 500ms activos
    ctx.game.scene.update(100, 16);
    ctx.game.scene.update(600, 500);
    assert.equal(player.isInvulnerable(), true);
    assert.equal(player.canShoot(), true); // 516ms >= 300ms fireRate

    // Volver a disparar para probar también cadencia durante la pausa
    assert.ok(player.shoot() instanceof Bullet);
    ctx.game.scene.update(700, 100); // quedan ~200ms de fireRate y ~384ms de invulnerabilidad

    // Pausar escena y avanzar el reloj global 10 segundos mientras está pausada
    scene.scene.pause();
    ctx.game.scene.update(716, 16);
    assert.equal(scene.scene.isPaused(), true);
    ctx.game.scene.update(10716, 16); // sigue pausada: sys.step no se ejecuta

    // Reanudar y verificar que conserva el tiempo restante (no expiró por los 10s de pausa)
    scene.scene.resume();
    ctx.game.scene.update(10732, 16);
    assert.equal(scene.scene.isPaused(), false);
    assert.equal(player.isInvulnerable(), true);
    assert.equal(player.canShoot(), false);

    // Completar el tiempo restante tras reanudar
    ctx.game.scene.update(10932, 200); // supera los 200ms restantes de cadencia
    assert.equal(player.canShoot(), true);
    assert.equal(player.isInvulnerable(), true); // aún quedan ~168ms de i-frames

    ctx.game.scene.update(11132, 200);
    assert.equal(player.isInvulnerable(), false);

    // 2. Limpieza de teclas propias (incluidos cursors) al destruir Player sin destruir controles externos
    const ownedKeys = [
      ...Object.values(player.controls.cursors),
      ...Object.values(player.controls.wasd),
      player.controls.shootKey
    ];
    player.destroy();
    ownedKeys.forEach((k) => {
      assert.equal(scene.input.keyboard.keys.includes(k), false);
    });

    // 3. Enemigo zigzag invierte dirección suavemente al tocar el borde sin oscilar contra la pared
    const fastEnemy = enemies.get(15, 100);
    fastEnemy.spawn(15, 100, { type: 'fast', zigzagDirection: -1 });
    fastEnemy.move(0); // cos(0) = 1 -> con sign=-1 da vx = -110 hacia minX (15)
    assert.equal(fastEnemy.x, 15);
    assert.ok(fastEnemy.body.velocity.x > 0, 'Debe rebotar hacia adentro');
    fastEnemy.setPosition(18, 102); // siguiente frame ya separado del borde
    fastEnemy.move(16);
    assert.ok(fastEnemy.body.velocity.x > 0, 'Debe mantener dirección hacia adentro sin vibrar al borde');

    // 4. Bullet creado con autoFire y añadido manualmente a PhysicsGroup conserva vuelo y sin gravedad
    const manualBullet = new Bullet(scene, 400, 300, { owner: 'enemy', speed: 250 });
    enemyBullets.add(manualBullet); // PhysicsGroup.add reinicia allowGravity=true y velocity=(0,0)
    manualBullet.preUpdate(16, 16);
    assert.equal(manualBullet.body.allowGravity, false);
    assert.equal(manualBullet.body.velocity.y, 250);

    // 5. WaveSystem ignora speedMultiplier <= 0 y healthBonus < 0 en waveConfig
    const levelSystem = new LevelSystem({ initialLevel: 1, baseEnemyCount: 1 });
    const waveSystem = new WaveSystem(scene, enemies, { levelSystem, spawnImmediately: true });
    waveSystem.startWave(1, { speedMultiplier: -5, healthBonus: -3 });
    const spawned = [...waveSystem.activeEnemies][0];
    assert.ok(spawned.speed > 0);
    assert.ok(spawned.getHealth() >= 1);
    waveSystem.destroy();
  });
});

