# REQ-056 - Ventana de configuraciones (velocidades) del pivote

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `logic/pivote.js` (nuevo), `core.js` (`showSystemTable`, `setTimer`), `index.html` (`#systemConfigModal` y sus dos botones), `ventana.css` |
| Pruebas | 319/319 en Node (3 nuevas en `pivote.test.js`) |
| Origen | Usuario: "mejora la UI de la ventana que muestra las configuraciones del pivote" |

## 1. Diseno

Estilo comun de ventanas (`ventana.css`): cabecera "Velocidad del pivote" con la marca y la indicacion
"toca una fila para usarla"; nota breve (menor % = mas lento y mas agua); tabla con encabezado fijo:

| Columna | Contenido |
|---|---|
| Temporizador | `%` en negrita y barra proporcional (oculta en el movil) |
| Lamina de agua | pulgadas y su equivalente en **mm** |
| Horas por vuelta | `h` |

La fila del valor actual se resalta (fondo verde claro y marca a la izquierda) y el pie muestra
"Valor actual: X%". Tocar una fila (o Enter con el teclado) la usa y cierra, como antes (`setTimer`).

## 2. Defectos corregidos

| ID | Defecto | Correccion |
|---|---|---|
| PV-1 | En "Nuevo plan" el boton (?) no cargaba la tabla (la llamada estaba comentada): mostraba la ultima cargada o nada | Ambos botones llaman a `showSystemTable(actualSystem.brand, valorActual)` |
| PV-2 | Sin marca configurada, `type.toLowerCase()` lanzaba un error | `logic/pivote.js -> marcaDeConfiguracion` devuelve null y la ventana explica que falta la marca |
| PV-3 | Si la lectura fallaba, la ventana quedaba vacia sin aviso | Estados `cargando` / `sin-marca` / `vacia` / `error` / `lista` |
| PV-4 | No se veia que fila correspondia al valor del plan | Fila actual resaltada |

`$scope.systemConfig` se sigue llenando con los datos crudos (lo usa `showSystemVelocity`).
`core.js?v=26.11.06.012`, `ventana.css?v=26.11.06.006`.
