# REQ-048 - Fichas tecnicas en un modal

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `components/fichas-tecnicas/` (controlador, plantilla, CSS), `ui/ui.factory.js`, `index.html` (menu y montaje), `core.js` (3 lineas) |
| Pruebas | 257/257 en Node |
| Origen | Usuario: "las fichas tecnicas no se ven bien, conviertelas en un modal" |

## 1. Diseno

Un solo modal de Bootstrap con el estilo de "Mi perfil" (REQ-045), abierto sobre la pantalla actual:

| Vista | Contenido |
|---|---|
| Lista | Cabecera "Fichas tecnicas" con degradado; **buscador**; cada cultivo con icono, nombre, detalle, insignia "Gratis"/"De pago" y flecha; aviso de pago dentro del modal |
| Ficha | La cabecera cambia al nombre del cultivo con boton **atras**; etapas como **linea de tiempo** (circulo con el dia, accion, margen de aplicacion, detalle) |
| Pie | "Volver a la lista" (en la ficha) y "Cerrar" |

En el movil ocupa la pantalla (`modal-fullscreen-sm-down`) y el pie respeta la zona segura.
Antes: una pantalla completa con la lista y un segundo modal encima para cada ficha.

## 2. Mecanica

- `index.html`: `<dta-fichas-tecnicas ng-if="fichasAbiertas" al-cerrar="cerrarFichas()">`; el menu llama
  a `abrirFichas()`. `core.js` solo guarda `fichasAbiertas` (funciones, no asignaciones en la plantilla,
  para que el valor no quede en un scope hijo).
- El componente abre el modal en `$postLink`. Al cerrarse por cualquier via (boton, Esc, clic fuera),
  `dtaUi` llama a `alCerrar` (evento `hidden.bs.modal`, una sola vez) y el `ng-if` lo desmonta;
  `$onDestroy` lo retira del portal.
- La ficha se muestra dentro del mismo modal (`vm.ficha`); `volverALista()` regresa.
- Se mantienen F-1 (no mutar), F-3/F-5 (leer al abrir) y el aviso de pago de REQ-040.
- Desaparece la ventana `fichasTecnicas` de `selectedWindow`.
