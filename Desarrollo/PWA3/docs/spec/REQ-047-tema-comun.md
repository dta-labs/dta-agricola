# REQ-047 - Tema comun: todos los botones, modales y ventanas con el estilo del perfil

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `assets/css/tema.css` (nuevo, ultimo CSS global de `index.html`) |
| Pruebas | 255/255 en Node (5 nuevas en `tema.test.js`) |
| Origen | Usuario: "mejora todos los modales y todas las ventanas siguiendo el mismo estilo; cambia todos los botones por estos que definiste para que haya homogeneidad" |

## 1. Enfoque

24 modales y ~140 botones (30 combinaciones de clases de color de Materialize) siguen en Materialize.
Reescribir su marcado de golpe repetiria el riesgo del login (REQ-043). Se aplica una **capa de CSS**
que les da el aspecto del perfil (REQ-045); el marcado se migra a Bootstrap pantalla a pantalla
despues (REQ-043 fase C). Se revierte quitando un `<link>`.

**Fuera del tema**: lo que ya es Bootstrap (`.bs`: perfil, Ayuda, Fichas) y el login (`<dta-login>`).
Una prueba exige estas exclusiones en cada regla de boton, modal y campo.

## 2. Botones

| Tipo | Aspecto | Clases de Materialize que lo reciben |
|---|---|---|
| Principal | Verde `#2e7d32` relleno, blanco | `btn` sin color o `teal`/`green`/`blue` (con o sin `lighten-*`), `btn-small`, `btn-flat teal/green/blue` |
| Secundario | Blanco con borde gris | `btn grey`, `btn white`, `btn-flat grey`, `btn-flat` sin color |
| Peligro | Blanco con borde rojo; rojo relleno al pasar el cursor | `btn red`, `btn-small red`, `btn-flat red` |
| Flotante | Redondo verde (rojo si `red`), sombra suave | `btn-floating` |

Comun: esquinas de 0.5rem, sin mayusculas, sin sombra, 38 px de alto (32 px `btn-small`), anillo de
foco al usar teclado, opacidad en desactivados.

## 3. Modales

- Esquinas de 16 px, fondo blanco, sombra amplia.
- Si el contenido empieza con `.swal-title` (13 modales), ese titulo se convierte en **cabecera** con
  el degradado verde del perfil.
- `.modal-footer` **fijo abajo** (`position: sticky`): los botones siempre visibles; separador y fondo gris
  claro; botones alineados a la derecha con separacion.

## 4. Campos y ventanas

- Campos de texto dentro de `.input-field`: caja con borde y esquinas (como `form-control`), anillo de
  foco teal; solo margenes verticales (no se toca el margen de los iconos `.prefix`). Con REQ-043 A2,
  la etiqueta ya va encima.
- `select.browser-default`: mismas esquinas y borde.
- Titulos de pantalla en verde; tarjetas con esquinas de 12 px y sombra suave; avisos (`toast`) redondeados.

## 5. Defecto evitado (detectado por la prueba)

Una primera version aplicaba las reglas de `.modal` tambien dentro de `.bs`; en Bootstrap `.modal` es la
capa a pantalla completa, y el modal de Fichas habria quedado cubierto de blanco. Todas las reglas de
modal excluyen `.bs`.

## 6. Prueba manual

Recorrer: listado, sistema de cada tipo (pivote, estacionario, pozo, sensores, nevera), sus modales
(Planes, Ajustes, plan de riego, sensores, alta de equipo, usuarios), notificaciones. Comprobar:
botones homogeneos y legibles (incluidos los de iconos `fa`), pies de modal visibles, campos con
icono sin encimarse, y que Ayuda, Fichas, Perfil y Login no cambian.
