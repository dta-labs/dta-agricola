# REQ-088 - Marcador de equipo en el mapa: pin con icono, nombre y color del estado

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-08) - probar: usuario |
| Alcance | `logic/panel.js` (`estadoDeEquipo`, `htmlMarcadorEquipo`), `core.js` (`addMarker`, `processSystemLogSnapshot`, `initializeMap`), `style.css` |
| Pruebas | 394/394 en Node (4 nuevas en `marcador-equipo.test.js`) |
| Compilacion | `26.11.08.012` |

Antes: el logo de 50 px (`marcador.png`) para pivotes, pozos, gateways de redes de sensores, etc.: grande y sin
informacion. El usuario eligio, de 5 propuestas, una mezcla de **pin con icono** y **nombre**, con el color del
estado y un **borde exterior blanco** para resaltar en cualquier fondo.

## Diseño

- Gota (pin) de 30 px del color del estado, con borde blanco de 3 px y sombra ligera; la punta marca la posicion.
- Icono del tipo (FontAwesome, blanco): pivote central `fa-dot-circle-o`, lineal `fa-arrows-h`, pozo `fa-tint`,
  red de sensores `fa-wifi`, estacionario `fa-th`, nevera `fa-snowflake-o`; otro, `fa-map-marker`.
- Nombre a la derecha en una etiqueta blanca con borde blanco y una franja del color del estado. Con zoom < 14 se
  ocultan los nombres (se taparian entre si). El titulo (al pasar el cursor) dice nombre y estado.
- Area de toque: pin y etiqueta (34 x 40 px mas el nombre). El popup del equipo se abre como antes.

## Estado (= color de la tarjeta del listado, `getSystemBackgroundColor`; prueba de equivalencia)

| Estado | Color | Cuando |
|---|---|---|
| Funcionando | turquesa `#20b2aa` | encendido y sin fallas |
| Apagado | gris `#9e9e9e` | `status = OFF` |
| Esperando confirmacion | amarillo `#fdd835` (icono oscuro) | encendido y el equipo reporta apagado |
| Falla electrica | rojo `#e53935` | `voltage = false` |
| Falla de seguridad | rosa `#db7093` | `safety = false` |
| Comunicacion inestable | gris oscuro `#616161` | `commDelay != -1` |
| Nevera | azul `#204eb2` | siempre |

Añadido: una red de sensores cuyo gateway lleva mas de 24 h sin reportar se ve gris oscuro ("Sin reportar en mas
de 24 h"), coherente con las rayas de las parcelas (REQ-072).

El icono se actualiza con cada log y cada cambio de ajustes, pero solo se reemplaza si cambia su aspecto.
