# Web Services v7 — Sensores / Neveras

Refactorización de `sensor_v6.php`, `updateSensorDB.php`, `updateNeveraDB.php`,
`alertas.php` y `sensor_service_cron.php` (estos dos se quitaron el 2026-11-22). **Corre en paralelo**: los archivos v6
de `WS/` no se modificaron y los equipos actuales siguen funcionando igual.

Publicación: subir la carpeta `v7/` a `public_html/ws/v7/` →
`http://dtaamerica.com/ws/v7/sensor.php?id=...&data=[...]&si=..&qos=..&rx=..`

## Estructura

```
v7/
├── config.php               URLs, tiempos máximos, banderas (único lugar a editar)
├── sensor.php               Entrada del gateway (reemplaza sensor_v6.php)
├── updateSensorDB.php       Procesa sistemas "Sensor" (dayLogs + resumen diario)
├── updateNeveraDB.php       Procesa sistemas "Nevera" (logs)
├── tools/migrar_station.php Crea settings.station = { region, id } en los sistemas de la tabla (solo CLI)
├── data/estaciones.json     Respaldo del catálogo /stations (copia del de PWA3)
├── lib/                     Código compartido (sin acceso web)
│   ├── HttpClient / FirebaseClient   cURL con tiempos máximos, un solo handle
│   ├── Request                       Parámetros GET + validación del id
│   ├── LocalClock / SystemSettings   Zona horaria y settings con valores por defecto
│   ├── SensorDataParser              Parser único (perfil Sensor 4 valores / Nevera 3)
│   ├── SensorFallback                Relleno de lecturas faltantes
│   ├── WeatherService / Agronomy     Open-Meteo, ETc, horas frío
│   ├── DayLogAggregator              Registro de 8 valores/sensor y resumen diario
│   ├── SensorDiscovery / SensorNetwork / AsyncCaller / FileLogger
├── src/                     Lógica de cada endpoint (sin acceso web)
├── logs/                    Logs diarios (sin acceso web)
└── test/                    Pruebas PHPUnit
```

## Qué se mantiene igual (contrato con los equipos y la PWA)

- Parámetros de entrada: `id, data, si, qos, rx`.
- Respuesta al gateway: `"frecuencia"id0"id1"..."` (frecuencia dinámica 10/30 si operationMode = 10).
- Rutas y formato en Firebase: `dayLogs`, `logs`, `settings`, fechas `Ymd hia`,
  `dataRaw` con 8 valores/sensor (Sensor) o 3 (Nevera).
- Algoritmos de validación, relleno, ETc y horas frío.
  Verificado contra el código v6: parser idéntico en 40 000 casos aleatorios;
  registro de dayLogs y resumen diario idénticos (salvo la corrección de Tmax).

## 🆕 Problemas resueltos

| # | Problema en v6 | v7 |
|---|---|---|
| 1 | Comandos `curl … &` armados con texto (en v6 los parámetros ya iban codificados con `http_build_query`, así que no había inyección; corrección del 2026-11-21) | Defensa adicional: `escapeshellarg` (`AsyncCaller`) |
| 2 | El `id` se pegaba tal cual en la ruta de Firebase (`id=../users` leía otro nodo) | `Request::systemId()` rechaza `/ . # $ [ ] ? & %` y espacios |
| 3 | Resumen diario: Tmax bajo cero quedaba como `"NaN"` (`PHP_FLOAT_MIN`) | Se usa `-INF` |
| 4 | Modo descubrimiento en Sensor terminaba en error fatal (recibía números en vez de Id) | Usa los tokens crudos, como Nevera |
| 5 | `updateSensorDB` descargaba `dayLogs` completo hasta 4 veces por petición | 1 lectura por petición |
| 7 | Cada línea de log de `sensor_v6` lanzaba un `curl` a `log_writer.php` | Escritura directa en `logs/AAAA-MM-DD_log.txt` |
| 8 | Sin tiempos máximos en cURL (un Firebase lento bloqueaba el proceso) | Conexión 5 s / total 15 s |
| 10 | Humedad de suelo de respaldo sin dato ⇒ valor falso ≈ 0 | Queda `NaN` |
| 11 | 🆕 Estaciones locales no se usaban (URL inválida) y v6 tomaba el primer renglón del día | Se toma la lectura más reciente ≤ hora actual (ver abajo) |
| 12 | 5 copias de cliente Firebase, settings, zona horaria y log | Una sola en `lib/` |

## ⚠️ Cambios de comportamiento a revisar antes de migrar equipos

1. **Firebase no responde** → `sensor.php` devuelve HTTP 503. En v6 respondía `"0"`,
   que el gateway interpretaría como modo descubrimiento. Confirmar que el firmware
   reintenta ante un error HTTP.
2. **Estaciones locales activadas.** Cuando falta la HR o la temperatura de un sensor
   (y no hay otros sensores del sistema para promediar), se usa la estación local antes
   que Open-Meteo. En v6 esto nunca funcionó: la fecha llevaba un espacio sin codificar
   y cURL rechazaba la URL, así que siempre caía a Open-Meteo.

## Pendientes detectados (no cambiados)

- Estaciones: decidir cómo usar un dato diario para rellenar una lectura de 10–30 min
  (p. ej. corregir la hora de Open-Meteo con la diferencia entre el promedio diario de la
  estación y el de Open-Meteo, o usar la estación solo para ETo/ETc y el resumen diario).

- `send_push.php` y `VAPID.php` (pruebas antiguas de Web Push) siguen con la **clave privada VAPID dentro del
  código** en un repositorio público: conviene quitarlos o generar una clave nueva.

## 🆕 Estaciones meteorológicas locales

Orden de respaldo para HR (j=1) y temperatura (j=2) de un sensor sin lectura:
**promedio de los otros sensores → estación local → Open-Meteo**.

- **Qué estación:** `settings.station = { region, id }` (p. ej. `{ "region": "NAMIQUIPA", "id": "_osm" }`),
  que se elige en PWA3 → Ajustes del sistema → región y estación (REQ-121). También acepta el
  texto `"_fac"` y, si no hay `station`, la tabla de `lib/SensorNetwork.php`; en esos casos la
  región sale del catálogo.
- **Catálogo:** Firebase `/stations` (una lectura por petición, solo si hace falta). Si no se
  puede leer, viene vacío o el formato no se reconoce, se usa `data/estaciones.json` (copia del de
  PWA3) y queda en el log de PHP "StationCatalog: /stations vacío…". Formatos aceptados: lista u
  objeto de `{ id, name, region }` (o `estacion`/`nombre`), o agrupado por región.
- **Consulta:** `estaciones.php?fi=aaaa-mm-dd&ff=aaaa-mm-dd&tp=Hora&re=<region>&es=<id>`
  (v6 mandaba `re=DTA`).
- **Migración:** `php tools/migrar_station.php` (muestra) y `--aplicar` (escribe) crea
  `settings.station` en los 19 sistemas de la tabla. `_mmi` (4 sistemas) no está en el catálogo:
  se reporta y hay que asignarles estación desde PWA3.
- **Qué devuelve estaciones.php:** un renglón **por día** (aunque se pida `tp=Hora`), con
  `fecha` aaaa-mm-dd y valores diarios (`tmax, tmin, tprom, hmax, hmin, rad, pret, eto`).
  Al final añade "Promedio / Totales", "Maximo" y "Minimo"; sin datos devuelve solo esos tres
  con `tprom = "0.00"`. v7 descarta todo renglón sin fecha válida (nunca toma ese 0 °C).
- **Qué dato se usa:** el registro más reciente de hoy o ayer (`DTA_STATION_MAX_AGE_DAYS = 1`):
  `tprom` → T y `hmin` → HR. Más viejo ⇒ Open-Meteo.
- **Una consulta por estación y día** en cada petición.
- ⚠️ **Al 2026-11-20 las estaciones no publican desde julio** (`_osm` último dato 2026-07-12,
  `_fac` 2026-07-13), también con la región correcta en `re`; hoy siempre se cae a Open-Meteo.
- ⚠️ Son valores **diarios**: el promedio de T y la HR mínima de ayer no equivalen a la lectura
  de este momento. Ver pendientes.
- Se apaga con `DTA_USE_STATIONS = false` en `config.php`.

## 🆕 Cálculos (alineados con la corrección de v6 del 2026-11-21)

- **ETc:** cada registro guarda la tasa en mm/h (2 decimales); el resumen diario es promedio × 24 = mm/día.
  v6 sumaba la tasa horaria de cada registro de 10–30 min (2 a 6 veces de más).
- **Unidades frío:** modelo Utah (Richardson); resumen diario = promedio × 24.
- **Valores faltantes:** se completan SHT, SHT4, WM, Ms, NPK y NPKML con el promedio de su mismo tipo
  (SHT/SHT4 en %, WM en cb, PSI presión: no se mezclan). A un WM no se le asigna la humedad de suelo de
  Open-Meteo (% contra cb). Vcc faltante: 4 V.
- **Tmin / Tmax / T del día:** mínimo, máximo y promedio de los registros (Tmax bajo cero ya no queda NaN).

## 🆕 HR = -1: el sensor no mide humedad relativa

- Se trata como valor faltante, igual en todos los tipos (SHT, SHT4, WM, Ms, NPK, NPKML): promedio de los
  sensores del mismo tipo en la red → estación asignada → OpenWeatherMap → Open-Meteo.
  Clave de OpenWeatherMap: variable `OPENWEATHER_API_KEY` o archivo `openweather.key` en la carpeta de la
  cuenta (fuera de `public_html`). Si el sensor no tiene coordenadas (o tiene 0,0) se usan las del sistema.
- En dayLogs anteriores, un -1 no entra en el promedio del resumen diario.

## 🆕 Puente desde la v6 (2026-11-22)

Los equipos en campo siguen llamando a `/ws/sensor_v6.php`; no hay que tocar el firmware. Ese archivo es un puente
de una línea (`require __DIR__ . '/v7/sensor.php';`) que ejecuta la v7 en el mismo servidor. No es una redirección
HTTP (los módulos GSM no las siguen): el equipo recibe la misma respuesta.

De la v6 solo quedan en `/ws/`:
- `sensor_v6.php` — el puente.
- `estaciones.php` — la v7 lo usa para las estaciones meteorológicas locales.

Se quitaron (respaldos en `ws_old/`): `sensor_v6.1.php`, `updateSensorDB.php`, `updateNeveraDB.php`, `alertas.php`,
`push.php`, `sensor_service_cron.php`, `sensor_service.php`, `log_writer.php` y archivos de prueba.
- Las alertas de humedad y temperatura las mandan las Cloud Functions de Firebase (`sendSoilMoistureNotifications`,
  `sendTemperatureNotifications`, en PWA3/functions) por FCM al crearse cada registro de `dayLogs`: aviso al cruzar
  el umbral, máximo cada 3 h. `push.php` usaba Web Push (VAPID) con `users/{u}/token`, que PWA3 ya no guarda.
- Sin el cron ya no se guardan registros estimados (`reception = "Cron"`) cuando un gateway deja de reportar.

## 🆕 `data=[]` (el gateway no tiene lecturas), 2026-11-22

- Sin registros en `dayLogs`: se crea un registro vacío (los 80 valores `NAN`; no se rellena nada).
- El último registro es de otro día: cambio de fecha, se calcula el resumen del día anterior en `logs` como siempre,
  se vacía `dayLogs` y se crea el registro vacío de hoy.
- Mismo día y el último registro es vacío: solo se actualiza su `date`.
- Mismo día y el último registro tiene valores: no se hace nada.

Los logs están en `v7/logs/`.

**Volver a la v6 corregida:** copiar desde `ws_old/` los archivos `*_261122_v6corregida.php` a `ws/` (sin el sufijo).

A partir de aquí los cambios se hacen solo en la v7.

## 🆕 Neveras e invernaderos (2026-11-22)

`type = "Nevera"` y `type = "Invernadero"` se procesan igual (`updateNeveraDB.php`, 3 valores por sensor) y escriben
directo en `logs` (no usan `dayLogs` ni resumen diario).

- `data=[...]`: registro nuevo en `logs`; si llega `lo`, se guarda en el registro.
- `data=[]` y ya hay un registro en `logs`: se actualiza su `date` y su `lo` (PATCH; las lecturas no cambian).
- `data=[]` sin registros: se crea uno vacío (30 valores `null`) con `lo`.
- `lo` = ciclos que el gateway lleva sin recibir de cada sensor, p. ej. `"[-17,-17,-17,-17,-17,0,0,0,0,0]"`
  (negativo = sin datos). Se guarda como texto, igual que `dataRaw`. Si no es una lista de enteros, se ignora.

## 🆕 Tensiómetros y `lo` en redes de sensores (2026-11-22)

- **REQ-146** — Resumen diario: en los sensores `type = "WM"` (tensiómetros) la tensión 0 ("no listo") y 240 o más
  ("error") ya no entran al promedio del día (antes lo sesgaban). En los demás tipos no cambia nada.
  `DayLogAggregator::summarize($dayLogs, $types)` recibe el tipo de cada sensor (S0..S9).
- **REQ-147** — Redes de sensores (`type = "Sensor"`): si el gateway envía `lo`, se guarda en el registro de
  `dayLogs` (igual que en neveras). Con `data=[]` se actualiza el `lo` del último registro del día. El resumen diario
  de `logs` no lleva `lo`.

## Pruebas

```bash
cd WS
composer install          # instala phpunit (require-dev de composer.json)
vendor/bin/phpunit -c v7/phpunit.xml
```

59 pruebas: parser, registro/resumen diario, respuesta al gateway, seguridad
(inyección e id), flujo completo de updateSensorDB/updateNeveraDB
(primer registro, cambio de día, lectura única de dayLogs, `data=[]`, descubrimiento) y
estaciones (renglón correcto, formatos de fecha, datos viejos, prioridad sobre Open-Meteo, fechas aaaa-mm-dd) y HR = -1.
Usan un Firebase falso en memoria: no tocan la base real.

Requisitos: PHP ≥ 7.4 con cURL.
