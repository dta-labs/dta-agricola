# REQ-166 - Acceso: autocompletado legible y "Mostrar contraseñas" como casilla

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-24) - probar: usuario (Chrome con contraseñas guardadas) |
| Alcance | `assets/css/style.css`, `components/login/*` |
| Pruebas | 1 ajustada en `test/unit/componentes/login.test.js` |
| Compilacion | `26.11.24.003` |

1. **Autocompletado**: Chrome pinta su fondo celeste (rectangular) en los campos autocompletados y el texto blanco del
   acceso no se leía. Además del truco anterior (fondo transparente con transición), el fondo se recorta al texto
   (`background-clip: text`) y el texto se pinta en blanco: el fondo deja de verse y se conserva la forma de píldora.
   En la ventana de alta (fondo blanco) el autocompletado se ve blanco con texto oscuro.
2. **Mostrar/ocultar contraseña**: el ojo dentro del campo quedaba fuera de lugar y afectaba a los dos campos. Ahora
   es una casilla general **"Mostrar contraseñas"** debajo de la confirmación.
