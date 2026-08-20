# Combo 2048

Una variante del clásico juego 2048 en la que encadenar fusiones seguidas multiplica tus puntos.

## Cómo jugar

Abre `index.html` en cualquier navegador moderno. No requiere instalación ni dependencias.

- **Teclado**: usa las flechas (`↑ ↓ ← →`) para mover las fichas.
- **Táctil**: desliza el dedo sobre el tablero en la dirección deseada.
- **Combo**: cada movimiento que produce al menos una fusión suma +1 al combo y multiplica los puntos ganados en ese movimiento. Un movimiento sin fusiones reinicia el combo a x1.
- **Objetivo**: alcanza la ficha 2048 para ganar. Puedes seguir jugando después para superar tu mejor combo.

Tu mejor puntaje se guarda automáticamente en el navegador (`localStorage`).

## Estructura

Todo el juego (HTML, CSS y JavaScript) vive en un único archivo: [`index.html`](./index.html).
