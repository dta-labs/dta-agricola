# REQ-013 - Servicios de dominio: `equipos`

| Campo | Valor |
|---|---|
| Estado | **Implementado** (TDD: rojo -> verde) |
| Alcance | `logic/equipos.js`, `services/equipos.js`, `core.js`, `firebaseComm.js`, `index.html` |
| Pruebas | **19** en Node (`equipos-logica` 9 + `equipos-servicio` 10) + **3** en navegador |
| Riesgo | Medio: cambia de sitio las suscripciones y el dedupe de alarmas; comportamiento equivalente |

## 1. Objetivo

Sacar del controlador las **reglas** y el **estado** del dominio de equipos, para poder probarlos sin
navegador y reutilizarlos al empaquetar con Capacitor.

## 2. Dos piezas, no una (decision)

```
logic/equipos.js        reglas puras: carpetas, registros, normalizacion, retraso, alarmas, mensaje
services/equipos.js     estado + suscripciones + dedupe de alarmas (recibe el repositorio)
```

No se creo `services/riego.js`: **no hay estado que sostener**. `logic/riego.js` ya es puro y el
controlador solo aplica el resultado; un servicio alli seria un pasamanos. Se deja constancia para no
inventar simetria.

## 3. Requisitos

| ID | Requisito | Criterio |
|---|---|---|
| REQ-013.1 | `carpetaDeLogs`: Sensor -> `dayLogs`, resto -> `logs` | 4 casos |
| REQ-013.2 | `registrosIniciales`: Sensor 7, Nevera 300, resto el limite | 4 casos |
| REQ-013.3 | `normalizarSistema` anade `key` y tolera ausencias | 3 casos |
| REQ-013.4 | `etiquetaDeRetraso`: `+Nd`, `+Nh`, `Nm`, umbral 10 min | 3 casos |
| REQ-013.5 | exige `safety` y `voltage` en `"true"` | 4 casos |
| REQ-013.6 | `alarmasDeSensores` detecta temperatura bajo el minimo | 1 sensor, °C y °F |
| REQ-013.7 | respeta `notify`, el umbral, `NaN`, tipo y datos ausentes | 5 casos |
| REQ-013.8 | `mensajeDeAlarma` conserva el formato de la app | regex |
| REQ-013.9 | `cargar` suscribe una vez por clave y normaliza | 2 equipos |
| REQ-013.10 | un snapshot vacio no crea equipo | `null` |
| REQ-013.11 | `detenerTodo` cancela todo y limpia el estado | 4 cancelaciones |
| REQ-013.12 | `escucharUsuarios` reemplaza la suscripcion anterior | 1 cancelacion |
| REQ-013.13 | `escucharUltimoLog` no re-suscribe si la ruta no cambia | 1 vs 2 llamadas |
| REQ-013.14 | `evaluarAlertas` deduplica por fecha | suena 1 vez por lectura |
| REQ-013.15 | tolera `dataRaw` invalido | sin excepcion |
| REQ-013.16 | `marcarRetrasos` ignora tipo `Sensor` | 1 de 2 |
| REQ-013.17 | el error del repositorio llega a `alError` | 1 caso |
| REQ-013.18 | contrato explicito sin repositorio | 2 errores claros |
| REQ-013.19 | `carpetaDeHistorico` depende de opcion y tipo | 5 casos |

## 4. Trazabilidad

Todas en `test/unit/equipos-logica.test.js` y `test/unit/equipos-servicio.test.js` -> **PASS**.
Equivalentes en navegador (3) en `test/smoke.html`.

**Evidencia**: `npm test` -> **83/83**; smoke -> **24/24**; la app arranca (`ng-scope`, 375.308 B) y
`logic/equipos.js` aparece cargado en el DOM.

## 5. Cambios en el controlador

| Antes | Ahora |
|---|---|
| `listeners[clave] = __repo().escucharSistema(...)` y `listeners = {}` | `__equipos().cargar(claves, {alCambiarSistema, alError})` |
| `listenLatestSystemLog` con su guarda de ruta y contabilidad | `__equipos().escucharUltimoLog(...)` (la guarda vive en el servicio) |
| `loadSystemUsers` con bookkeeping propio | `__equipos().escucharUsuarios(...)` |
| `removeFirebaseListeners` recorriendo `listeners` | `__equipos().detenerTodo()` |
| `findCommErrors` calculando la etiqueta | `marcarRetrasos()` + asignacion a `log.commDelay` |
| `processingAlerts` decidiendo y deduplicando | `evaluarAlertas()` + toasts/`activarAlarma()` en la vista |
| `dir = type === "Sensor" ? "dayLogs" : "logs"` (x2) | `carpetaDeLogs(tipo)` |
| `option !== 'DIA' ? '/logs' : '/dayLogs'` en el historico | `carpetaDeHistorico(tipo, opcion)` |
| `items = Sensor ? 7 : limitRegisters` + override Nevera | `registrosIniciales(tipo, limite)` |

`core.js`: **5.370 -> 5.318 lineas**. La variable `listeners` desaparece (0 referencias).
`lastAlarmDate` deja de escribirse en el equipo: el dedupe vive en el servicio (solo se usaba en
`processingAlerts`, verificado por busqueda).

## 6. Decisiones

1. **El servicio nunca toca `$scope`**: avisa con callbacks y el controlador sigue haciendo
   `$evalAsync`/`$apply`. Es lo que permite probarlo con un repositorio falso.
2. **Dedupe por fecha en el servicio**, no en el objeto del equipo: deja de contaminar el documento
   que se comparte con la vista.
3. **`marcarRetrasos(ahora, mapa)`** acepta el mapa a evaluar: permite aplicar la regla a
   `$scope.systems` (lo que muestra la vista) y probarla con un mapa sintetico.
4. **`evaluarAlertas` tolera `dataRaw` invalido** (antes `JSON.parse` podia lanzar dentro del digest).
5. **Nombre global distinto**: `DTALogic.equipos` son las reglas y `DTALogic.equiposServicio` el
   servicio, para no colisionar.

## 7. Pendiente / fuera de alcance

| Item | Motivo |
|---|---|
| `services/riego.js` | no hay estado que sostener (ver §2) |
| `selectSystem`, graficas, Leaflet, Materialize | son vista (DOM) |
| Servicios de `alertas`/`usuarios` como piezas separadas | el dedupe y el estado de equipos ya viven juntos; separarlos ahora duplicaria estado sin ganancia |
| Prueba manual en la PWA | login, listado, retraso de comunicacion, alarma de nevera, plan de riego |
