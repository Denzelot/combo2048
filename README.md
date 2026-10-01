# Canepa & Girbau — Landing premium

Experiencia editorial de lujo silencioso basada en el brief (`Brief_Web_Canepa_Girbau`) y el mockup de referencia.
HTML/CSS/JS sin build: abre `index.html` o sírvelo con cualquier servidor estático.

```
npx serve .      # o: python3 -m http.server
```

## Instalación local (una sola vez)
```bash
bash instalar-local.sh          # clona en ~/canepa-girbau-web, descarga la media, crea tu repo y arranca la web
```
Después, para ver la web: `cd ~/canepa-girbau-web && npx serve .` · para traer cambios: `git pull`.
Volver a ejecutar el script es seguro (actualiza en vez de reinstalar).

## Archivos
| Archivo | Qué contiene |
|---|---|
| `index.html` | Las 8 secciones (Hero, Historia, Origen, Experiencia sensorial, Producto, Perfil de taza, Prepara tu taza, Contacto) + footer y modal «Ver el ritual». |
| `styles.css` | Tokens de color/tipo, **sistema glass** (botones líquidos, barras, tarjetas, burbujas), secciones y responsive. |
| `particles.js` | Motor de partículas Canvas 2D sin dependencias: humo/vapor volumétrico, polvo dorado, micro-burbujas y pétalos de flor de café. |
| `app.js` | Scroll suave (Lenis), parallax, indicador lateral, cursor dorado, burbujas flotantes con física, audio «Respira el aroma», configurador de producto, radar animado, modal. |
| `download-assets.sh` | Descarga las imágenes y vídeos de Higgsfield a `./assets/media` y reescribe las URLs (la web deja de depender del CDN). |
| `instalar-local.sh` | Instalación local en un paso: clona, descarga la media, crea el repo en GitHub y arranca la web. |
| `netlify.toml` | Configuración para publicar como sitio estático en Netlify. |

## Assets generados en Higgsfield (proyecto «Canepa & Girbau Web»)
- **13 imágenes** (GPT Image 2.5, 2K): hero, historia, panorámica de Oxapampa, macro de granos, producto, V60, prensa francesa, moka, contacto y 4 notas con fondo transparente (cacao, panela, avellana, frutos secos).
- **5 vídeos en loop perfecto** (MiniMax H3, 2K, 6 s, mismo fotograma inicial y final): vapor de la taza + nubes en el hero, neblina en el origen, granos flotando con vapor, sombras de hojas sobre el producto, ramas y flores de café en contacto.

### Banner en capas 3D (hero)
El hero es un escenario de capas con profundidad real (`perspective` + `translateZ`), que se inclina con el cursor y se separa al hacer scroll:
1. Fondo: ventana a Oxapampa sin producto (Higgsfield, vídeo en loop).
2. Resplandor cálido.
3. Bloque de travertino en 3D (cara superior + frontal) con textura procedural (`assets/hero/travertine.webp`).
4. Bolsa verde «Molido» detrás y bolsa negra «En grano» delante — **recortadas de tus fotos limpias sobre travertino** (`assets/photos/*-travertino.webp` → `assets/hero/bag-*.webp`), apoyadas en la piedra con sombra de contacto, un leve balanceo y un barrido de luz enmascarado a la silueta.
5. Granos reales esparcidos en la base (sprites recortados de tu foto sobre granos, `assets/hero/bean-*.webp`).
6. Rama de cafeto desenfocada en primer plano y granos grandes flotando a distintas profundidades.
7. Neblina y polvo dorado (partículas) por encima.
En móvil el escenario ocupa la mitad superior y se mueve solo (balanceo lento), sin depender del cursor.

### Fotos reales del producto (de tu cuenta Higgsfield)
- **Referencias de etiqueta:** tus packshots subidos — bolsa etiqueta negra «Café en grano» (`3cd4d46a…`) y etiqueta verde «Café molido» (`aef4f230…`).
- **Hero y producto regenerados con tu bolsa real como referencia**, con su loop de vídeo. En la tienda, el selector **Grano / Molido** hace un fundido entre la bolsa negra y la verde.
- **Galería «Ver fotos»** (barra glass en la sección Tienda → visor a pantalla completa con flechas, teclado y swipe): tus 2 packshots + 5 fotos editoriales (sobre granos, en Oxapampa, mármol, molido sobre madera, bolsa levitando).

## Sistema glass
- `.btn` — vidrio con `backdrop-filter: blur(30px)`, reflejo que sigue al puntero y barrido líquido al hover; variantes `--dark`, `--gold` (CTA con «respiración» dorada) y `--ghost-dark`.
- `.glass` / `.glass--dark` — barras y tarjetas (header al hacer scroll, barra de datos del origen, mapa, ficha técnica, indicador lateral, tarjeta de contacto).
- `.note-bubble` — burbujas de jabón: borde iridiscente animado (`conic-gradient` + máscara), brillo especular, sombra interna y deformación elástica al moverse.

## Sistema de partículas
| Sección | Capas |
|---|---|
| Hero | Neblina suave + polvo dorado |
| Origen | Neblina volumétrica en modo `screen` |
| Experiencia | Vapor aromático, micro-burbujas y chispas doradas; **«Respira el aroma»** lanza columnas de vapor desde cada burbuja, un sonido de respiración sintetizado con WebAudio (vapor + acorde cálido + campana de cristal) y un anillo de progreso inhala/exhala |
| Producto | Polvo dorado que se aparta del cursor |
| Contacto | Pétalos de flor de café cayendo |

Cada lienzo solo se dibuja cuando está en pantalla; los vídeos se pausan fuera de vista y todo respeta `prefers-reduced-motion`.

## Pendiente / a revisar
- Datos de contacto (WhatsApp, email, Instagram) y «85 pts» provienen del mockup: confirmar con el cliente.
- El carrito es visual (contador + toast); conectar a la pasarela o tienda real.
- Los assets se sirven desde el CDN de Higgsfield; ejecuta `download-assets.sh` antes de publicar.
