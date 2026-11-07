# REQ-045 - "Mi perfil" moderno, funcional y sencillo

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `index.html` (`#modalMiPerfil`), `assets/css/perfil.css` (nuevo), `core.js` (`abrirPerfil`, `guardarPerfil`), `logic/fechas.js`, `ui/campos-fecha.directive.js` |
| Pruebas | 248/248 en Node (7 nuevas en `perfil-moderno.test.js`) |
| Origen | Usuario: "mejora la interfaz visual del perfil que se vea moderna, funcional y sencilla" |
| Leccion de REQ-043 aplicada | Solo cambia el **contenido**; el modal (abrir/cerrar) sigue siendo el de Materialize que ya funcionaba |

## 1. Diseno

| Zona | Antes | Ahora |
|---|---|---|
| Ventana | 92 % de ancho, 88 % de alto, rectangular | Hasta 720 px, esquinas redondeadas; en el movil ocupa la pantalla |
| Cabecera | Titulo "Mi perfil" | Foto (o inicial), nombre, correo e insignia del plan; boton cerrar |
| Campos | Etiquetas de Materialize sobre el campo | `form-label` encima + `form-control`, 2 columnas en pantalla ancha, 1 en el movil; `*` en lo obligatorio; el correo explica por que no se edita |
| Problemas | Lista de casillas | **Chips** seleccionables (se rellenan al elegir) |
| Preguntas | Textos largos | Mas cortos y en segunda persona ("Tu rol", "¿Quien decide en tus parcelas?") |
| Plan | Bloque al final | Seccion "Plan" al final con el plan actual y el boton **Plan** (REQ-044) |
| Botones | Al final del contenido (habia que desplazarse) | **Pie fijo**: Cancelar / Guardar siempre visibles |
| Errores | Ventana `swal` | Alerta dentro del perfil, encima de los campos |
| Guardar | Sin indicacion | "Guardando…" con indicador; aviso breve "Perfil guardado" al confirmar |

## 2. Defectos corregidos

| ID | Defecto | Correccion |
|---|---|---|
| P-1 (REQ-041) | "Perfil actualizado" se anunciaba sin esperar a Firebase | `guardarPerfil` espera la promesa; el aviso y el cierre solo al resolver; si falla, mensaje en el perfil y no se cierra |
| P-2 (REQ-041) | El estado local cambiaba aunque fallara la escritura | `userProfile` se actualiza tras resolver |
| **P-6** (nuevo) | Fecha de nacimiento: `<input type="date" ng-model>` exige un `Date` en AngularJS; Firebase lo guardaba como texto y al **reabrir el perfil Angular lanzaba `ngModel:datefmt`** y el campo salia vacio | Directiva `dta-fecha-iso`: el modelo es texto `AAAA-MM-DD`; tambien lee lo guardado antes como `Date` serializado (`1990-05-20T06:00:00.000Z`) |
| Doble envio | Se podia pulsar Guardar varias veces | Boton deshabilitado mientras guarda |

## 3. Notas tecnicas

- `perfil.css`: reglas `.bs.perfil input.form-control...` con mas especificidad que las de Materialize
  sobre `<input>` (borde inferior, alto fijo, sombra de foco).
- El `top` del modal se fija con `!important` porque Materialize lo anima en linea al abrir.
- Los selects conservan `browser-default` (REQ-043 A1) ademas de `form-select`.
- `style.css?v=26.11.06.002` (salen las reglas `.perfil-plan*` de REQ-044, ahora en `perfil.css`);
  `core.js?v=26.11.06.006`.

## 4. Ajustes tras la prueba del usuario (REQ-046, 2026-11-06)

| Reportado | Causa | Correccion |
|---|---|---|
| "El selector multiple no esta funcionando" (chips de problemas) | Los chips eran `checkbox.btn-check` oculto + `label for`; Materialize aplica sus propias reglas a **todos** los `[type=checkbox]` de la pagina y el mecanismo no respondia | Cada chip es un `<button>` con `ng-click="alternarProblema(opcion)"`, `ng-class` (relleno al elegir) y `aria-pressed`; muestra una palomita cuando esta elegido. Sin checkbox oculto |
| "Debes dejar espacio en la parte inferior" | La ventana ocupaba del 5 % al 95 % de la altura; en el movil, el 100 % (la barra del navegador tapaba los botones) | Escritorio: alto maximo 85vh (queda 10vh libre abajo); movil: 92dvh con esquinas inferiores redondeadas y el pie respeta la zona segura (`env(safe-area-inset-bottom)`); mas relleno al final del contenido |

`core.js?v=26.11.06.007`, `perfil.css?v=26.11.06.002`. Pruebas: 250/250.

| "El footer no sale completo, se cortan Cancelar y Guardar" | `style.css` tiene `.modal { max-height: 80% !important }` para **todos** los modales: la ventana media 80% y el contenido 85% -> el pie quedaba fuera | `.modal.perfil-modal { max-height: 85vh !important }` y `.bs.perfil { max-height: inherit }` (una sola fuente de altura); cabecera y pie con `flex-shrink: 0`. `perfil.css?v=26.11.06.003` |
