# REQ-038 - Arquitectura por componentes

| Campo | Valor |
|---|---|
| Estado | **Base implementada** (2026-11-06): `app/`, `ui/`, `components/`, pruebas de estructura |
| Alcance | Estructura de `assets/js/`, registro de componentes AngularJS, reglas de capas, pruebas |
| Sustituye | Las fases 1 y 2 de REQ-034 (partir `index.html` y partir `core.js`) se fusionan en cortes verticales: un componente a la vez |
| Hijos | REQ-039 Login, REQ-040 Ayuda y Fichas tecnicas, REQ-041 Perfil, Planes y Notificaciones |
| Riesgo | Bajo por componente si se respeta el procedimiento de la seccion 7 |

## 1. Decision

La interfaz se organiza en **componentes de pantalla** (vista + controlador de presentacion).
Las **reglas de negocio** siguen en `logic/` (puras) y el **acceso a datos** en `services/`.
Se usa `.component()` de AngularJS 1.6: **no se cambia de framework** en esta etapa (D-1 de REQ-034
sigue abierta y se decide con la app ya partida).

## 2. Capas

```
assets/js/
  logic/        Reglas puras. Sin DOM, sin Angular, sin Firebase. Probadas en Node.
  services/     Datos y plataforma: repositorio, autenticacion, equipos, mensajeria.
                Unicos que tocan firebase.*. Sin DOM.
  app/          Arranque: modulo Angular, rutas, adaptadores de services/ a inyeccion (factories).
  ui/           Ayudas de interfaz compartidas: modales, avisos (swal), Materialize.
  components/   Un directorio por componente.
    <nombre>/
      <nombre>.component.js   Definicion + controlador
      <nombre>.html           Plantilla
      <nombre>.css            Estilos propios (opcional)
    comunes/                  Componentes pequenos reutilizables
```

| Capa | Puede usar | No puede usar |
|---|---|---|
| `logic/` | Otras reglas de `logic/` | DOM, Angular, Firebase, `localStorage`, `swal`, `M` |
| `services/` | `logic/`, `firebase.*`, almacenamiento | DOM, Angular, `swal`, `M` |
| `app/` | `services/` (los envuelve en factories) | Reglas de negocio |
| `ui/` | `M` (Materialize), `swal` | `firebase.*`, reglas de negocio |
| `components/` | `logic/` (via factory), factories de `app/`, `ui/` | `firebase.*`, `document.getElementById`, `$scope.$parent`, `$rootScope` para datos, globales |
| `core.js` (transitorio) | Todo lo anterior | Recibir codigo nuevo: solo pierde codigo |

## 3. Contrato de un componente

1. **Nombre**: `dta` + nombre en kebab en la etiqueta (`<dta-login>`), camelCase en el registro
   (`dtaLogin`). Carpeta y ficheros en minusculas con guiones (`fichas-tecnicas/`).
2. **Entradas** solo con `'<'` (una via) o `'@'`. **Salidas** solo con `'&'`. Prohibido `'='`.
3. **Ciclo de vida**: suscripciones y temporizadores se crean en `$onInit` y se cancelan **todos**
   en `$onDestroy`. Ningun listener de `document`/`window` sin su retirada.
4. **Estado**: el componente es dueno de su estado de vista (campos de formulario, pasos, filtros).
   El estado de la app (usuario, perfil, sistemas) llega por entrada o por factory.
5. **Sin reglas de negocio**: validaciones, calculos y mensajes de error salen de `logic/`.
6. **Sin `style=""`** en la plantilla; clases en su `.css` o en `style.css`. `ng-style` solo para
   valores calculados.
7. **Modales**: los propios del componente viven en su plantilla y se abren con `ui/modales`.
   Nada de `M.Modal.getInstance($('#id'))` en controladores.
8. **Accesibilidad**: cada campo con `<label>` o `aria-label`; formularios dentro de `<form>` con
   `ng-submit` (Enter funciona y el navegador ofrece guardar la contrasena).
9. **Cargable en Node**: el `.component.js` sigue el patron de `logic/` (exporta su definicion con
   `module.exports` y se registra en Angular solo si `angular` existe), para probar el controlador
   con dobles de las factories.

Esqueleto:

```js
(function (raiz) {
    "use strict";
    function ControladorLogin(dtaAuth, dtaReglas, dtaUi) {
        var vm = this;
        vm.$onInit = function () { /* estado inicial */ };
        vm.$onDestroy = function () { /* cancelar suscripciones */ };
    }
    ControladorLogin.$inject = ["dtaAuth", "dtaReglas", "dtaUi"];

    var definicion = {
        templateUrl: "./assets/js/components/login/login.html?v=26.11.06.001",
        controller: ControladorLogin,
        bindings: { alEntrar: "&" }
    };

    if (typeof module !== "undefined" && module.exports) module.exports = { definicion: definicion, Controlador: ControladorLogin };
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaLogin", definicion);
})(typeof window !== "undefined" ? window : globalThis);
```

10. **Estilos**: desde que exista la fase B de REQ-043, un componente nuevo se escribe en Bootstrap 5
    dentro de `<div class="bs">`; nunca con clases nuevas de Materialize.

## 4. Factories de transicion (`app/`)

| Factory | Envuelve | Uso |
|---|---|---|
| `dtaAuth` | `DTAServices.autenticacion` + `firebase.auth()` (via adaptador) | Acceso, alta, recuperar, salir |
| `dtaRepo` | `DTAServices` repositorio | Lecturas/escrituras de RTDB |
| `dtaReglas` | `DTALogic` | Reglas puras por modulo (`dtaReglas.login`, `dtaReglas.perfil`...) |
| `dtaSesion` | Estado del usuario actual (usuario, perfil, plan) | Fuente unica para componentes; `core.js` la alimenta mientras exista |
| `dtaMensajeria` | `firebaseMessaging.js` | Activar/desactivar notificaciones, token FCM |
| `dtaUi` | `M.Modal`, `M.toast`, `swal` | Abrir/cerrar modales, avisos, confirmaciones |

Las factories son **delgadas**: no anaden reglas, solo inyeccion. Son el punto que se reemplaza si
D-1 decide migrar de framework.

Cada factory se crea **con el primer componente que la necesita** (no antes, para no dejar codigo
sin uso): `dtaReglas`, `dtaAuth` y `dtaUi` con REQ-039; `dtaRepo` con REQ-040; `dtaSesion` y
`dtaMensajeria` con REQ-041. Como los componentes, cada factory exporta `crear(...)` para Node y se
registra en Angular solo si `angular` existe.

## 5. Ruteo y montaje durante la transicion

- Las rutas de `ngRoute` y `selectedWindow` **no cambian** en REQ-039 a 041: el componente se monta
  dentro del mismo contenedor `ng-show` que hoy (`<dta-ayuda ng-if="selectedWindow == 'ayuda'">`).
  `ng-if` (no `ng-show`) para que `$onInit`/`$onDestroy` correspondan a entrar/salir de la vista.
- La comunicacion componente -> app va por salidas `&` que llaman a funciones ya existentes del
  controlador (`al-volver="showWindow('listado')"`).
- El ruteo real (`template: '<dta-ayuda>'` por ruta) se hace en un REQ posterior, cuando
  `listado` y `sistema` sean componentes.

## 6. Carga y fuera de linea

- Cada componente anade a `index.html` su `<script>` (despues de `core.js`, que define el modulo)
  y, si tiene, su `<link>` de CSS, con `?v=`.
- Las plantillas (`templateUrl`) **no** entran en el precache (REQ-033 lo mantiene minimo): el
  service worker ya guarda todo `.html`, `.js` y `.css` del mismo origen la primera vez que se usa
  (red primero, cache de respaldo). Criterio: con la app instalada y una vista ya abierta una vez,
  sin red la vista vuelve a abrir.
- Las trazas intencionadas usan `console.info`/`warn`/`error` con prefijo; `console.log` esta
  prohibido en `app/`, `ui/` y `components/` (lint, igual que en `logic/` y `services/`).
- Presupuesto: el precache total sigue en <= 500 KB (RNF-REN-01).

## 7. Procedimiento para extraer un componente

1. **Fijar el comportamiento**: lista de RF afectados y pruebas estructurales/logicas del estado actual.
2. **Mover reglas** que esten en `core.js` o en la plantilla a `logic/` con sus pruebas.
3. **Crear el componente** (definicion, plantilla, CSS) y sus pruebas de controlador en Node.
4. **Sustituir** el bloque de `index.html` por la etiqueta del componente.
5. **Borrar** de `core.js` las funciones y variables de `$scope` que ya no usa nadie (busqueda en
   `index.html` y `core.js`; ninguna queda "por si acaso").
6. **Verificar**: `npm test`, lint, prueba manual de los RF, consola sin errores ni violaciones de CSP.
7. **Medir**: lineas que salen de `index.html` y `core.js` (se anotan en el REQ).

## 8. Pruebas

| Nivel | Que se prueba | Donde |
|---|---|---|
| Reglas | Funciones de `logic/` | `test/unit/*.test.js` (como hoy) |
| Controlador | Metodos del controlador con factories falsas | `test/unit/componentes/<nombre>.test.js` |
| Estructura | `index.html` ya no contiene el bloque movido; la plantilla no tiene `style=""`; bindings sin `'='` | `test/unit/componentes/estructura.test.js` |
| Manual | RF afectados en Chrome y Safari iOS, en linea y sin red | Lista en cada REQ |

`test/ejecutar-pruebas.js` se amplia para incluir `test/unit/componentes/`.

## 9. Criterio de cierre de REQ-038

- Existen `app/`, `ui/` y `components/` con las factories que necesitan los componentes ya hechos.
- La prueba de estructura (seccion 8) existe y pasa.
- Los tres primeros componentes (REQ-039 a 041) siguen este contrato.
