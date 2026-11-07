# REQ-061 - Parcela del estacionario (REQ-057 fase S3, grupo estacionario)

| Campo | Valor |
|---|---|
| Estado | **E1 implementada** (2026-11-07) - probar: usuario. E2 propuesta |
| Alcance | `#modalEditRiegoEstacionario` (379 lineas), `#modalDefineFechaRiego`, `#modalEditFechaRiego`, `core.js` region PLAN DE RIEGO |
| Pruebas | 352/352 en Node (7 nuevas en `parcela.test.js`) |
| Compilacion | `26.11.07.007` |

## 1. Inventario

"Editar parcela" tiene dos secciones: **Configurar parcela** (nombre, cultivo, caudal, valvula, suelo,
poligono) y **Estrategia de riego** con 4 modos: Manual (iniciar/detener), Plan (fecha de siembra,
riegos programados, plan del cultivo), Demanda (red y sensor; 3 reglas de ajuste y 5 de paro con
umbrales) y Predictivo (texto). Los riegos programados se agregan y editan en dos modales aparte.

**Acoplamiento** que obliga a ir por pasos: muchas funciones leen y escriben campos por `id` repartidos
entre los tres modales (`editName`, `editPlotCaudal`, `editType`, `editDay/Hour/Minutes`,
`editScheduleIndex`, `scheduleDate`, `schDate`, `startDate`, `planEstacionarioId`, `selectPlotCulture`),
y **la planificacion de riego de Servicios** (`selectCulture`, `#modalDefineFechaHoraInicio`) usa
tambien `startDate`, `planEstacionarioId` y `selectPlotCulture`. `setEditPlanEstacionario` se llama
ademas desde el listado y el panel del estacionario antes de regar o detener un sector.

## 2. Fase E1 - errores de datos, sin cambiar la interfaz (implementada)

| ID | Defecto | Correccion |
|---|---|---|
| PE-1 | **"Aceptar" en Configurar parcela dejaba en 0 la duracion del primer riego programado**: `dataEditionPlanEstacionario` leia tambien los campos (vacios) de "Editar fecha" y escribia `schedule[0].value = 0` | Guardar la parcela ya no toca los riegos; la fecha editada se guarda con la nueva `guardarFechaRiego()` (boton de "Editar fecha de riego") |
| PE-2 | **Los ceros se cambiaban por el valor por defecto**: `!valor ? defecto` convertia 0 °C de paro en 20 °C, 0 % de reduccion en -30 %, 0 mm en 3 mm, 0 km/h en 100... | `logic/parcela.js -> normalizarConfiguracion`: mismos valores por defecto y limites, respetando el 0 |
| PE-3 | Los valores por defecto del riego a demanda nunca llegaban a una parcela real: los ponian 8 `ng-init` que se ejecutaban **una vez al cargar la pagina** sobre un objeto de relleno (`actualSystem.plots.undefined`) | Se aplican al abrir la parcela (`setEditPlanEstacionario`); se quitan los `ng-init` |
| PE-4 | "Editar fecha de riego" mostraba `NaN` en dias (`getDayFromMs()` sin argumento) | `getDayFromMs(data)` |
| PE-5 | `#modalConfirmRiegoEstacionario` sin uso (nada lo abria) | Eliminado |

## 3. Fase E2 - componente (propuesta)

`<dta-parcela-estacionario>` con el estilo comun y pestañas **Parcela** / **Riego**:

- Trabaja sobre una **copia**: "Cancelar" descarta (hoy los cambios se aplican al objeto vivo al escribir).
- Riegos programados en la misma ventana (lista + formulario en linea con fecha y hora nativas y
  duracion), sustituyendo `#modalDefineFechaRiego` y `#modalEditFechaRiego`.
- Riego a demanda con interruptores y campos con unidad (sin el modo "editar parametros").
- Modo manual con duracion visible y editable (hoy esos campos estan ocultos con `display: none`).
- `setEditPlanEstacionario`, `selectProgram`, `selectCulture` y `createPlanEstacionario` dejan de leer el
  DOM: reciben los datos. **Antes** hay que mover el flujo de Servicios (`selectCulture`,
  `#modalDefineFechaHoraInicio`) para que no dependa de los campos de este modal.
- Mismo formato de datos (R-01): `plots[pN]` con `name, culture, caudal, valve, soil, poligon, startDate,
  schedule[{ t, date, time, value }], irrigationPlan, irrigationConfig, sensor, sensorId`.

## 4. Prueba manual de E1

Estacionario con una parcela que tenga riegos programados: Configurar parcela -> cambiar el caudal ->
Aceptar -> comprobar en Firebase que `schedule[0].value` **no** cambio. Riego a demanda: poner 0 °C de
paro, guardar, reabrir -> sigue en 0. Parcela sin configuracion: los umbrales aparecen con sus valores
por defecto. Editar un riego programado: se ven los dias; guardar cambia solo ese riego.
