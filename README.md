# Arcade Shooter — Proyecto Final Web GR7

Juego arcade shooter desarrollado con **Phaser 3** y **Vite**. El jugador controla una nave,
dispara a oleadas de enemigos, progresa por niveles y guarda su récord, nivel alcanzado
y preferencias de audio en el navegador mediante `localStorage`.

## 1. Requisitos

- Node.js 18 o superior (probado con Node.js 24).
- npm (incluido con Node.js).
- Navegador moderno con soporte de Canvas y `localStorage`.

## 2. Instalación

Clona el repositorio e instala las dependencias:

```bash
git clone <url-del-repositorio>
cd Proyecto_Final_Web_GR7
npm install
```

## 3. Ejecución

### Desarrollo

```bash
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

### Compilación para producción

```bash
npm run build
```

Los archivos listos para desplegar quedan en la carpeta `dist/`.

### Vista previa de producción

```bash
npm run preview
```

### Pruebas

```bash
node --test tests/gameplay.test.js
```

## 4. Controles

| Tecla / Acción | Función |
| :--- | :--- |
| Flechas / WASD | Mover la nave |
| Espacio | Disparar |
| M | Silenciar / activar audio |
| P | Pausar el juego |
| ESC | Reanudar desde la pausa |
| R | Reiniciar partida (en Game Over) |
| ENTER | Volver al menú (en Game Over) o iniciar (en Menú) |
| Clic | Iniciar / reiniciar partida |

## 5. Estructura del proyecto

```text
Proyecto_Final_Web_GR7/
├── docs/                      # Documentación técnica
│   ├── ASSETS_Y_AUDIO.md
│   ├── ENTREGA_GAMEPLAY.md
│   ├── IMPLEMENTACION_COMPLETA.md
│   ├── IMAGENES.md
│   ├── INTEGRACION_GAMEPLAY.md
│   └── LOCAL_STORAGE.md
├── src/
│   ├── assets/                # Imágenes y audio
│   ├── managers/              # AudioManager, StorageManager
│   ├── objects/               # Player, Enemy, Bullet, utilidades
│   ├── scenes/                # Boot, Preloader, Menu, Game, Pause, GameOver
│   ├── systems/               # Score, Level, Wave, Collision
│   └── main.js                # Configuración de Phaser
├── tests/                     # Pruebas automatizadas
│   ├── gameplay.test.js
│   └── phaserTestHarness.js
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 6. Persistencia (`localStorage`)

El juego guarda automáticamente:

- **Récord**: mayor puntuación obtenida.
- **Nivel alcanzado**: último nivel desbloqueado/completado.
- **Audio**: estado de silencio y volúmenes.

Los datos se mantienen aunque se cierre o actualice la página.
Ver `docs/LOCAL_STORAGE.md` para detalles de la API.

## 7. Assets e imágenes

Las imágenes y sonidos se cargan en `Preloader.js` y se referencian por claves estables
(`player`, `enemy_basic`, `bullet_player`, `imagen-mute`, `meteor_*`, etc.).
Si falta un recurso, se genera una textura procedural de respaldo.
Ver `docs/IMAGENES.md` y `docs/ASSETS_Y_AUDIO.md`.

## 8. Créditos

- **Equipo GR7** — Proyecto Final de Aplicaciones Web.
- Desarrollado con [Phaser 3](https://phaser.io/) y [Vite](https://vitejs.dev/).
- Assets gráficos y de audio incluidos en `src/assets/`.

## 9. Licencia

Proyecto académico. Uso educativo.
EOF