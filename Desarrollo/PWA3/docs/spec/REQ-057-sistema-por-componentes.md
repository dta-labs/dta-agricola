# REQ-057 - "Sistema" por componentes: un panel por tipo de equipo y sus modales

| Campo | Valor |
|---|---|
| Estado | **Fase S1 implementada** (2026-11-07): los 6 paneles son componentes - probar: usuario |
| Depende de | REQ-038 (arquitectura), REQ-043 (Bootstrap), REQ-049/050 (estilo de ventanas) |
| Alcance | `index.html` `<section id="sistema">` (3.388 lineas), `core.js` (regiones DEVICES, CONFIGURACIONES, PLAN DE RIEGO, Leaflet, Chart.js) |
| Pruebas | 331/331 en Node (12 en `componentes/paneles-sistema.test.js`) |
| Riesgo | Alto en conjunto (es la pantalla principal): por eso por fases y **sin cambio visual** en la extraccion |

## 1. Inventario (2026-11-06)

**Paneles** (barras superpuestas al mapa, ~630 lineas):

| Panel | Lineas | Usa | Comandos |
|---|---|---|---|
| Pivote central (PC) | 71 | `actualSystem.log` | avanzar, retroceder, detener |
| Pivote lineal (PL) | 206 | `actualSystem`, `meteo` | avanzar, retroceder, detener; abre Suelo |
| Estacionario | 76 | parcelas, `isPlotActive`, `getPlotColor` | regar/detener parcela; abre Configurar, Historial, Usuarios |
| Pozo | 107 | `actualSystem`, duracion de parcela | encender, detener |
| Sensores (mapa + lista) | 91 | `meteo`, `getSensorPanelValue`, `signalToPercent` | editar sensor, grafica; abre Configurar, Historial, Usuarios |
| Nevera | 83 | `actualSystemDataRaw`, `voltageToPercent` | editar sensor, grafica; abre Configurar, Historial, Usuarios |

**Modales** (~2.700 lineas): Ajustes (231), Suelo (173), Configurar (391), Programa de riego (137),
Grafica de nevera (34), Historial (279), Usuarios (46), Invitar (45), Nuevo plan (70),
Planificacion (83), Reiniciar plan (13), Editar parcela (379), Confirmar movimiento (20), Confirmar
estacionario (20), Fecha y hora de inicio (33), Fecha de riego (35), Editar fecha (39),
Agregar sensor (390), Editar sensor (249), Buscar sensor (28).

## 2. Arquitectura destino

```
components/sistema/
  panel-pivote-central/   panel-pivote-lineal/   panel-estacionario/
  panel-pozo/             panel-sensores/        panel-nevera/
  paneles.css             (estilos comunes de los paneles)
  modales/
    pivote/        Nuevo plan, Planificacion, Reiniciar, Confirmar movimiento, Velocidades (REQ-056)
    estacionario/  Editar parcela, Programa de riego (REQ-050), Confirmar, Fechas (3)
    sensores/      Agregar (REQ-052), Editar, Buscar, Grafica de nevera
    comunes/       Ajustes, Suelo, Configurar, Historial, Usuarios, Invitar
logic/panel.js            reglas de vista de los paneles (senal, GPS, comunicacion, duracion, botones)
app/sistema.factory.js    (fase S4) comandos y datos del sistema actual, fuera de core.js
```

Contrato de un panel: entrada `sistema` (`<`) y, si hace falta, `meteo` (`<`); salidas `&` por comando
(`al-avanzar`, `al-detener`...) que en las fases S1-S3 llaman a las funciones de siempre de `core.js`.
Se monta con `ng-if="actualSystem.type == '...'"`. Sin `modal-trigger` dentro de un componente
(su plantilla llega despues de `M.AutoInit`): los modales se abren con una salida (`al-abrir="..."`) o `dtaUi`.

## 3. Fases

| Fase | Contenido | Regla | Sale cuando |
|---|---|---|---|
| **S1** | Paneles a componentes, **mismo aspecto** (mismo marcado de Materialize; estilos en linea -> `paneles.css`; calculos -> `logic/panel.js`) | Piloto PC + Pozo, el usuario lo valida, luego PL, Estacionario, Sensores, Nevera | Los 6 paneles son componentes; ~630 lineas fuera de `index.html` |
| S2 | Rediseno visual de los paneles en Bootstrap (estilo comun) | Uno por uno con revision en pantalla | Aprobacion del usuario |
| S3 | Modales a componentes por grupo (pivote, estacionario, sensores, comunes) | Primero los que ya tienen estilo comun; mismo comportamiento | ~2.700 lineas fuera de `index.html` |
| S4 | Logica de `core.js` a `services/` y `logic/` (comandos, planes de riego, sensores) con pruebas | Sin tocar el formato de los datos (R-01) | `core.js` sin las regiones de Sistema |

## 4. Fase S1 - piloto (implementado)

| Pieza | Detalle |
|---|---|
| `logic/panel.js` | `porcentajeSenal`, `comunicacionOk`, `gpsOk`, `seguridadOk`, `botonesMovimiento`, `duracionTexto`, `parcelaActual`. Prueba de **equivalencia** con las expresiones que habia en el HTML |
| `<dta-panel-pivote-central>` | Barra de control fija arriba (retroceder / detener / avanzar, verde el activo) y barra de estado abajo (velocidad, posicion, senal, GPS, seguridad) |
| `<dta-panel-pozo>` | Botones detener/encender, estado movil (caudal, presion, senal), parcela en curso, modo (manual / autorreversa / programado) y duracion |
| `paneles.css` | Los ~50 estilos en linea; `!important` donde Materialize (`.row .col.s12`) ganaba a la clase y antes ganaba el estilo en linea |
| `index.html` | -180 lineas |

Diferencias deliberadas: seguridad acepta tambien `safety: true` booleano (antes `true == "true"` daba
"inseguro"); la senal del pozo tiene tope de 100 % como la del pivote.

## 5. Prueba manual del piloto

Un pivote central y un pozo, en escritorio y movil: mismo aspecto que antes; los botones responden y el
activo se pinta; estado (velocidad, posicion, senal, GPS, seguridad / caudal, presion, parcela, duracion)
igual que antes. Cambiar entre sistemas de distinto tipo.

## 6. Fase S1 - resto de paneles (2026-11-07)

Pivote lineal, estacionario, red de sensores (barra + tarjetas) y nevera (barra + tarjetas) pasan a
`<dta-panel-pivote-lineal>`, `<dta-panel-estacionario>`, `<dta-panel-sensores>` y `<dta-panel-nevera>`.
`index.html` 4.566 -> 4.134 lineas (-432; -612 con el piloto).

**Conversion automatica, sin cambio visual** (script de conversion con reglas fijas, revisado):

| Regla | Detalle |
|---|---|
| Datos | `actualSystem` -> `vm.sistema`; `meteo[actualSystem.key]` -> `vm.clima`; `actualSystemDataRaw` -> `vm.datos` |
| Comandos -> salidas | avanzar / retroceder / detener; regar o detener una parcela (`al-alternar-parcela`, que en `index.html` hace exactamente lo de antes: `setEditPlanEstacionario` + `isPlotActive ? stop : start`); editar sensor; grafica |
| Calculos de core.js -> salidas-getter | `getPlotColor` (`color-parcela`), `getSensorPanelValue` (`valor-sensor`); `voltageToPercent` -> `logic/panel.js -> porcentajeBateria` (equivalencia probada) |
| `modal-trigger` | `ng-click="vm.alAbrir({ $modal: '...' })"` -> `$scope.abrirVentana(id)` en `core.js` (dentro de un componente `modal-trigger` no funciona) |
| Estilos en linea | Fijos -> clases `panel-s-eN` en `paneles.css` **con `!important`** (misma prioridad que tenian en linea); con `{{ }}` -> `ng-style` |
| Rarezas conservadas | Un elemento con dos `style` aplicaba solo el primero: se conserva solo el primero |
| Limpieza | Bloques de codigo comentado eliminados (y sus 5 clases); `ng-init` de `signalToPercent` sin uso; `ng-show="authUser && selectedWindow == 'sistema'"` (siempre cierto dentro del panel) |

Comprobaciones automaticas: las plantillas no nombran nada de `core.js`; no hay `style=`,
`modal-trigger` ni codigo comentado; cada clase generada se usa y lleva `!important`; ningun elemento
combina una clase `!important` de Materialize (`hide-on-*`) con un `display`/`float` generado.

## 7. Prueba manual de S1 completa

Un sistema de cada tipo (pivote central y lineal, estacionario, red de sensores en mapa y en tarjetas,
nevera, pozo), en escritorio y movil: mismo aspecto; botones y comandos; en estacionario, tocar un sector
lo riega o lo detiene; Historial / Planes / Usuarios / Suelo abren su ventana; en sensores y nevera,
grafica y engrane (editar sensor).

## 8. Fase S3 - grupo pivote (2026-11-07)

Ver REQ-059: "Nuevo plan" + "Planificacion" -> `<dta-plan-pivote>`; "Confirmar movimiento" eliminado (sin
uso); "Eliminar plan" con estilo comun; "Velocidades" ya tenia estilo comun (REQ-056).
Quedan para S3: estacionario (Editar parcela, Programa de riego, Confirmar, 3 de fechas), sensores (Agregar,
Editar, Buscar, Grafica de nevera) y comunes (Ajustes, Suelo, Configurar, Historial, Usuarios, Invitar).
