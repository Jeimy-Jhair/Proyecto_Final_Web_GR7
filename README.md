# Galaxy Striker

Galaxy Striker es un juego de disparos espaciales en 2D desarrollado con **Phaser 3 y JavaScript** para la asignatura de Aplicaciones Web. El objetivo es controlar una nave, esquivar ataques y eliminar enemigos para avanzar en la partida y conseguir la mayor puntuación posible.

El juego utiliza una estética arcade de **8 bits**, con naves e iconos pixel art, efectos de impacto, música, controles de teclado y una interfaz adaptada a distintos tamaños de pantalla.

## Requisitos

- Node.js y npm instalados.
- Un navegador actualizado (Chrome, Edge o Firefox).

## Instalación y ejecución

Clonar el repositorio:

```bash
git clone https://github.com/Jeimy-Jhair/Proyecto_Final_Web_GR7.git
cd Proyecto_Final_Web_GR7
```

Instalar las dependencias:

```bash
npm install
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abrir en el navegador la dirección local que muestre Vite, normalmente `http://localhost:5173/`.

> Si las mejoras de interfaz todavía no se han integrado a `main`, se pueden consultar desde la rama `feature/interfaz-ui` mediante `git switch feature/interfaz-ui` después de clonar y actualizar las referencias remotas.

## Controles

| Tecla | Acción |
| --- | --- |
| `W`, `A`, `S`, `D` o flechas | Mover la nave |
| `Espacio` | Disparar |
| `P` | Pausar |
| `Esc` | Volver o reanudar, según la pantalla |
| `M` | Activar o silenciar el sonido |
| `Enter` | Iniciar o confirmar en las pantallas correspondientes |

En dispositivos táctiles se muestran botones de dirección y disparo, además de accesos a pausa y sonido.

## Cómo funciona

Durante la partida aparecen enemigos con distintos comportamientos y niveles de resistencia. El jugador gana puntos al eliminarlos, pierde vidas cuando recibe impactos y puede avanzar a niveles de mayor dificultad. El HUD muestra la información principal de la partida, como puntos, vidas, nivel y oleada.

El juego incluye menú principal, instrucciones, pausa, pantalla de derrota y pantalla de victoria. Se utiliza `localStorage` para conservar información como el récord, el nivel alcanzado y las preferencias de sonido.

## Organización del proyecto

```text
src/
├── assets/        Recursos gráficos y de audio
├── managers/      Audio y almacenamiento local
├── objects/       Jugador, enemigos y proyectiles
├── scenes/        Menú, juego, pausa, instrucciones y finales
├── systems/       Colisiones, puntuación, oleadas y niveles
├── ui/            Botones, HUD, iconos y controles táctiles
└── main.js        Configuración e inicio de Phaser

tests/             Pruebas del gameplay
public/            Recursos públicos, como el favicon
```

La separación por escenas, objetos y sistemas permite trabajar las mecánicas y la interfaz de manera independiente y facilita la integración de los cambios.

## Pruebas y compilación

Ejecutar las pruebas disponibles:

```bash
node --test tests/gameplay.test.js
```

Generar la versión de producción:

```bash
npm run build
```

Los archivos compilados se generan en `dist/`. Para revisar esa compilación localmente:

```bash
npm run preview
```

## Tecnologías

- **Phaser 3:** escenas, renderizado y físicas Arcade.
- **JavaScript:** lógica, controles e interacción.
- **Vite:** desarrollo local y compilación.
- **HTML y CSS:** página contenedora y adaptación visual.
- **localStorage:** datos guardados en el navegador.

## Créditos

Proyecto desarrollado para **Aplicaciones Web**, carrera de Ingeniería en Software. El código, las escenas, las mecánicas y la interfaz se desarrollaron de forma colaborativa. El historial de contribuciones puede consultarse en el repositorio.

**Repositorio:** https://github.com/Jeimy-Jhair/Proyecto_Final_Web_GR7
