# REQ-110 - Ajustes del listado y de los mapas (analisis rapido del usuario)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `logic/resumen.js`, `core.js`, `index.html`, `style.css`, `paneles.css`, paneles de pivote central y lineal |
| Pruebas | 455/455 en Node (3 nuevas; REQ-092/109 ajustadas) |
| Compilacion | `26.11.20.011` |

## Listado
- Textos mas grandes: nombre 1.35rem, linea y mensaje 1.05rem, fecha 0.95rem.
- Iconos del tipo de equipo **en negro** (`brightness(0)`; el pivote con esfera y brazo negros).
- Fecha y hora abajo de la columna del clima, alineadas con la ultima linea del texto.
- Liston izquierdo y **fondo muy tenue del color del estado** (`color-mix` 9 %): verde ok, naranja atencion, rojo
  emergencia, gris detenido.
- **Estacionario**: vuelven las valvulas (1..7) y el motor (M) con su estado (verde regando, amarillo sin confirmar,
  gris apagado), en lugar de la linea de texto.
- "Sin alertas" siempre con el **check**.
- Mensajes **cortos y precisos** (<= 26 caracteres): "Falla electrica", "Sin comunicacion", "Esperando confirmacion",
  "Suelo seco en Nogal", "Helada en 3 sensores", "Programar riego", "Sin reportar hace 2 d", "Temperatura fuera de
  rango". Si no caben: "Accion inmediata" (emergencia) o "Requiere atencion" (atencion).

## Mapas
- **No cargaban bien y las parcelas de sensores no se dibujaban al entrar**: el mapa se crea con la pantalla del
  sistema oculta (0x0) y Leaflet no se enteraba al mostrarse (no pedia las imagenes del satelite y recortaba las
  parcelas a un area nula). Ahora un `ResizeObserver` sobre el contenedor recalcula el tamaño y redibuja parcelas y
  areas cada vez que se hace visible o cambia de tamaño; ademas, al centrar un sistema se llama a `volverAMostrarMapa`.
- Vista satelital: el sombreado del estado de la parcela vuelve **encima** de la imagen, tenue (0.2), para que se vean
  ambos (antes REQ-092 lo quitaba).
- Pivote central: retroceso/avance con iconos de **giro** (`rotate_left` / `rotate_right`); pivote lineal con flechas.
- Mosaico de sensores: sin el hueco de la barra de opciones (oculta desde REQ-109).
