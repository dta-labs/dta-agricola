# REQ-043 - Salida de Materialize hacia Bootstrap 5

| Campo | Valor |
|---|---|
| Estado | **Fases A y B implementadas; fase C iniciada** (2026-11-06): Ayuda y Fichas en Bootstrap. Login revertido a Materialize |
| Alcance | Toda la interfaz: `index.html`, componentes, `core.js` (llamadas `M.*`), CSS |
| Pruebas | 239/239 en Node |
| Origen | Usuario: "etiquetas que se solapan con la informacion, no se muestran las selecciones en los selectores, los componentes de datetime resultan complejos" |

## 1. Factibilidad

**Conviene dejar Materialize.** Esta abandonado (ultima version 1.0.0, 2018) y los tres problemas
reportados son de su diseno, no de uso:

| Problema | Causa en Materialize | Como lo resuelve Bootstrap 5 |
|---|---|---|
| Etiquetas encima del dato | `label` en `position: absolute` que su JS "sube" al detectar valor; con Angular no siempre se entera | `form-label` fija encima del campo |
| Selectores sin la seleccion | `FormSelect` oculta el `<select>` y dibuja una copia que solo se actualiza al reinicializar | `form-select` es el `<select>` nativo |
| Fecha y hora complejas | Datepicker/timepicker propios (reloj analogico, formato en ingles) | No trae selector propio: usa `type="date"/"time"` nativos (selector del sistema en el movil) |

**Pero el cambio de golpe no es viable:**

1. **Choque de nombres**: los dos definen `.row`, `.col`, `.btn`, `.modal`, `.card`, `.container`,
   `.collapse`, `.dropdown-*`, `.tabs`... Cargar los dos a la vez rompe las vistas actuales; cambiar
   todo de una vez es reescribir ~4.400 lineas de `index.html` sin poder probarlo entre medias.
2. **Tamano** (inventario del 2026-11-06): 364 columnas `col s*`, 118 `row`, 143 `btn`, 110
   `input-field`, 53 `modal-trigger`, 49 `modal-close`, 28 modales, 55 `collapsible`, 16 `sidenav`,
   109 `waves-effect`, 60 colores `teal`, 54 `lighten-*`; en JS: 16 `M.Modal`, 6 `M.AutoInit`,
   5 `M.toast`, 5 `M.FormSelect`, 3 `M.Dropdown`, 3 `M.Collapsible`.
3. **Sin red para paquetes** en el entorno de trabajo: Bootstrap y Sass se instalan en el PC (fase B).

**Decision**: salir de Materialize **por fases**, empezando por lo que el usuario sufre (fase A, que
es exactamente lo que haria Bootstrap con los formularios), y migrar el resto **componente a
componente** (REQ-038) con un Bootstrap aislado que no choque con Materialize mientras convivan.

## 2. Fase A - Formularios (implementada)

| Paso | Cambio |
|---|---|
| A1 | Los 22 `<select>` que usaban `FormSelect` pasan a nativos (`browser-default`); quedan 0 select de Materialize. Se quitan los 4 `M.FormSelect.init` de `core.js`. El valor se sigue leyendo igual (`ng-model` o `.value`/`selectedIndex` del select real, que es el mismo elemento) |
| A2 | `assets/css/formularios.css`: en todo `.input-field` la etiqueta va **fija encima** del campo (`position: static; order: -1`), como `form-label`; anula los apanos `top: -28px`. Select nativos con el mismo alto y borde que los campos |
| A3 | Programa de estacionario: fecha de inicio, hora de inicio y fecha fin pasan a `type="date"`/`type="time"` nativos con las directivas `dta-fecha-guardada` / `dta-hora-guardada`. **Lo guardado no cambia de formato** (`"Nov 06, 2026"`, `"8:30 AM"`), por R-01: conversiones puras en `logic/fechas.js` |

Prueba manual de la fase A: abrir varias pantallas con formularios (alta de equipo, configuracion,
plan de riego de pivote y de estacionario, sensores, perfil) y comprobar que ninguna etiqueta tapa
datos y que todos los selectores muestran lo elegido; crear y editar un programa de estacionario y
comprobar en la consola de Firebase que `fecha_inicio`/`hora_inicio`/`fecha_fin` siguen con el
formato de antes.

## 3. Fase B - Bootstrap aislado (propuesta)

1. En el PC: `npm i -D bootstrap@5.3 sass` (este entorno no tiene red para paquetes).
2. `assets/scss/bootstrap-dta.scss`: Bootstrap envuelto en `.bs { ... }` (sin el reboot global) +
   las capas que Bootstrap anade al `<body>` (`.modal-backdrop`, `.offcanvas-backdrop`) sin envolver.
   Script `npm run css:bootstrap` -> `assets/vendor/bootstrap/bootstrap-dta.css`.
3. `assets/vendor/bootstrap/bootstrap.bundle.min.js` (sin jQuery; sus atributos `data-bs-*` no chocan
   con Materialize).
4. `dtaUi` abre modales de Bootstrap (`bootstrap.Modal`) para los componentes ya migrados y de
   Materialize para el resto: los componentes no cambian de codigo.
5. Tema: colores de DTA como variables (`--bs-primary`...) para que lo migrado y lo pendiente se vean
   del mismo producto.

## 4. Fase C - Migracion por componente (propuesta)

Cada componente se envuelve en `<div class="bs">` y cambia su plantilla con esta tabla:

| Materialize | Bootstrap 5 |
|---|---|
| `row` / `col s12 m6 l4` | `row` / `col-12 col-md-6 col-lg-4` |
| `input-field` + `label` despues | `mb-3` + `form-label` antes + `form-control` |
| `select` (`FormSelect`) | `form-select` |
| datepicker / timepicker | `type="date"` / `type="time"` + `form-control` |
| `btn`, `btn-flat`, `btn-floating` | `btn btn-success`, `btn btn-link`, `btn rounded-circle` |
| `modal` + `modal-trigger` / `modal-close` | `modal` > `modal-dialog` > `modal-content` + `data-bs-toggle` / `data-bs-dismiss` (o `dtaUi`) |
| `collapsible` | `accordion` |
| `sidenav` | `offcanvas offcanvas-start` |
| `dropdown-trigger` / `dropdown-content` | `dropdown` / `dropdown-menu` |
| `M.toast` | `toast` (via `dtaUi`) |
| `card` | `card` + `card-body` |
| `chip` | `badge rounded-pill` |
| `switch` | `form-check form-switch` |
| `waves-effect` | (se elimina) |
| `teal`, `lighten-*`, `darken-*` | clases de utilidad / variables del tema |
| `material-icons`, `fa fa-*` | se conservan (son fuentes de iconos, no dependen del framework) |

Orden: los componentes ya extraidos (Login, Ayuda, Fichas) y, desde REQ-041, cada componente nuevo
se escribe directamente en Bootstrap. Historicos sustituye ademas `daterangepicker.js` por fechas nativas.

## 5. Fase D - Retirada

Cuando ninguna vista use clases de Materialize: quitar `materialize.min.css/js` y `M.AutoInit`,
compilar Bootstrap sin el envoltorio `.bs` y borrar `formularios.css` (sus reglas quedan cubiertas).
Prueba de estructura: 0 apariciones de `M.` y de las clases de la tabla.

## 6. Riesgos

| Riesgo | Mitigacion |
|---|---|
| A2 cambia el aspecto de ~110 campos a la vez | Es solo CSS (`formularios.css`): se revierte quitando una linea de `index.html` |
| El firmware lee las fechas del programa | A3 guarda en el mismo formato; probado ida y vuelta |
| Convivencia larga de dos estilos | Tema comun (fase B) y migrar por pantallas completas, no por piezas sueltas |

## 7. Implementacion de las fases B y C (2026-11-06)

**Fase B**

| Pieza | Detalle |
|---|---|
| Dependencias | `firebase-admin` y `firebase-functions` salen del `package.json` raiz (eran de `functions/` y su conflicto de versiones impedia `npm i`); entran `bootstrap@5.3` y `sass` como `devDependencies` |
| `scripts/vendor-bootstrap.js` | `npm run vendor:bootstrap`: compila `assets/scss/bootstrap-dta.scss` y copia el JS. Quita el BOM que Sass anadia delante de `:root` (invalidaba las variables `--bs-*`) |
| `assets/vendor/bootstrap/` | `bootstrap-dta.css` (5.3.8, 225 KB, todo dentro de `.bs` salvo `:root`, media queries y fondos de modal) y `bootstrap.bundle.min.js` (79 KB). Se versionan; el despliegue no compila |
| Tema | `assets/scss/_tema-dta.scss`: primario `#26a69a` (el teal de la app), exito `#2e7d32` |
| `dtaUi` | Modales de Bootstrap con **portal**: al abrir, el modal se mueve a `<div class="bs dta-portal">` hijo de `<body>`; ningun contenedor puede taparlo. `destruirModal` lo retira y limpia el fondo si estaba abierto. Lo no migrado sigue con Materialize. Salen `iniciarPlegables`/`destruirPlegables` (ya no hay plegables de Materialize en componentes) |
| `index.html` | `bootstrap-dta.css` despues de Materialize; `bootstrap.bundle.min.js` antes de `core.js` |
| `firebase.json` | `scripts/**` y `assets/scss/**` fuera del hosting |

**Fase C (componentes ya extraidos)**

| Componente | Cambio |
|---|---|
| Login | Envuelto en `.bs`; sin `row`/`col`/`input-field`; boton de Google como `btn` con el mismo aspecto; **alta de cuenta en modal de Bootstrap** con `form-label` + `form-control`, error dentro del modal, "Minimo 6 caracteres" |
| Ayuda | 17 secciones `collapsible` -> **acordeon** de Bootstrap (4 niveles, `data-bs-parent` para abrir una a la vez, como antes); rejilla `col s*/m*` -> `col-*/col-md-*`; el controlador ya no inicializa nada. Corregido el enlace "Ver mas", que tenia la URL en `class` en vez de `href` |
| Fichas tecnicas | Lista -> `list-group`; ficha en **modal de Bootstrap** (desplazable, cabecera con cerrar); aviso de pago como `alert-warning`; carga con `spinner-border` |

Reglas nuevas en `estructura.test.js`: ninguna plantilla de componente usa clases de Materialize, todas
empiezan por `<div class="bs">`, el CSS de Bootstrap no tiene reglas fuera de `.bs` ni BOM.

### Incidencia: login roto tras migrarlo (2026-11-06)

El usuario reporto que el login "se destruyo completamente". Se revirtio el login a la version
aprobada (`login.html` de REQ-039 con Materialize, `?v=26.11.06.004`); Ayuda y Fichas siguen en Bootstrap.

Causa probable (no se pudo ver en navegador): dentro de `.bs`, reglas de Bootstrap con mas
especificidad pisan el diseno propio del login. Confirmado: `.bs .container` impone `max-width`
540/720/960 px y relleno sobre `.login-contenedor` (400 px). Ademas `formularios.css` (fase A) aplicaba
`display: flex` a `.input-field.login-campo`; el login queda fuera de esa regla.

**Leccion para la fase C**: un componente con diseno propio no se envuelve en `.bs` entero; se migran
sus piezas (p. ej. solo el modal de alta) y se revisa en navegador antes de cerrar. El login queda
en `PENDIENTES_DE_BOOTSTRAP` (`estructura.test.js`).
