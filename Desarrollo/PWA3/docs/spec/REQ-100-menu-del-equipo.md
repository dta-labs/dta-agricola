# REQ-100 - Menu del equipo (ficha al tocar su marcador en el mapa)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `core.js` (`getMarkerText`), `style.css` |
| Pruebas | 422/422 en Node (3 nuevas en `menu-equipo.test.js`) |
| Compilacion | `26.11.20.003` |

Antes: icono generico (`golf_course`), nombre, una linea y cuatro opciones en tabla (Historial, Sensores/Planes,
Usuarios, Ir) con iconos de distinto tamaño y textos desalineados.

## Ahora

| Zona | Contenido |
|---|---|
| Cabecera | El **pin del equipo** del mapa (REQ-088: color del estado e icono del tipo), el **nombre** y debajo "**tipo · estado**" (p. ej. "Red de sensores · Funcionando") |
| Opciones | Rejilla de 4 columnas iguales, iconos Material de 24 px y texto debajo: **Historial**, **Sensores**/**Planes**, **Usuarios** y **Ajustes** (donde antes estaba "Ir") |
| Pie | **"Como llegar"** a todo el ancho (turquesa fijo, no el color del estado: navegar no es una alerta), abre Google Maps con la ruta; solo si el equipo tiene coordenadas |

Las opciones siguen abriendo los mismos modales (`modal-trigger`). "Ajustes" abre `#modalAdjust`, igual que en el menu
lateral (visible para cualquier usuario dentro de un sistema). La ficha se refresca con cada lectura (estado al dia).
