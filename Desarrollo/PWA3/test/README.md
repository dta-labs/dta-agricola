# Pruebas locales de PWA3

Banco de trabajo: la aplicacion corre **en local**, pero sigue consultando la **base de datos de
produccion** (no hay emuladores). Por eso las reglas de abajo no son recomendaciones: son la
condicion para que este entorno no haga dano.

## Las reglas

1. **Solo sistemas con prefijo `TEST_`.** Si un sistema no empieza por `TEST_`, no se toca: ni se
   renombra, ni se edita, ni se borra. Los scripts se niegan.
2. **Cuenta de prueba dedicada** (`qa.local@dta-agricola.test`, o la que uses). Nunca la de un
   cliente: el usuario que crea el sistema queda como propietario.
3. **Nada de `firebase deploy`.** El despliegue es un acto deliberado y documentado en `PROMOTE.md`.
4. **Los sistemas reales se miran, no se tocan.** Como maximo lectura. Nada de crear planes,
   cambiar configuraciones ni borrar sensores ahi.
5. **Antes de una prueba destructiva** (borrar, reasignar, cambiar de propietario), crea un sistema
   `TEST_` nuevo en vez de reutilizar uno existente.
6. **Si algo se comporta raro, se detiene la prueba.** Abre la consola y mira el error antes de
   volver a pulsar.
7. **Todo lo que crees, lo borras al terminar** con `borrar-sistema-prueba.js`.

## Puesta en marcha

```powershell
cd C:\Users\admin\Documents\GitHub\dta-agricola\Desarrollo\PWA3
copy assets\js\firebaseConfig.example.js assets\js\firebaseConfig.js   # solo la primera vez
# rellena los valores reales en assets\js\firebaseConfig.js

node test/servir-local.js          # -> http://localhost:8090
```

### Opciones para servir la app

| Opcion | URL | Notas |
|---|---|---|
| **Live Server (VSCode)** | `http://127.0.0.1:5502` | Ya configurado en `.vscode/settings.json`: clic derecho en `index.html` -> *Open with Live Server* |
| Script incluido | `http://localhost:8090` | `node test/servir-local.js`; `$env:PORT=8091` para otro puerto |

**La raiz servida tiene que ser la carpeta PWA3.** El `index.html` carga `./assets/...`, `./sw.js` y
`./firebase-messaging-sw.js` con rutas relativas: si sirves desde la raiz del repositorio y abres
`/Desarrollo/PWA3/index.html`, el service worker no se registra y las notificaciones no funcionan.
Abre **PWA3 como carpeta del workspace**.

La primera vez en el navegador:

- DevTools -> Application -> Service Workers -> marca **Bypass for network** (o "Update on reload"),
  para no depurar contra cache vieja (Live Server recarga, pero el service worker cachea).
```

La app se abre en el puerto que sirvas (5502 con Live Server, 8090 con el script).

- DevTools -> Application -> Service Workers -> marca **Bypass for network** (o "Update on reload"),
  para no depurar contra cache vieja.

## Sistema de prueba

```powershell
set DTA_TEST_EMAIL=qa.local@dta-agricola.test
set DTA_TEST_PASSWORD=unaClaveDePrueba

node test/crear-sistema-prueba.js --nombre="Estacion QA" --tipo=Sensor
node test/crear-sistema-prueba.js --nombre="Camara QA"   --tipo=Nevera
```

- El id resultante es `TEST_<nombre>-<sufijo>`; la cuenta de prueba queda como propietaria.
- Para que la app lo muestre tal como un equipo real: `--plantilla=<clave_de_un_sistema_real>` copia
  **solo la forma** de sus `settings` (lectura), no sus datos de lecturas.
- Se crean 8 lecturas (`logs` y `dayLogs`) para que las graficas tengan contenido.

Para limpiar:

```powershell
node test/borrar-sistema-prueba.js        # solo lista
node test/borrar-sistema-prueba.js --si   # borra los TEST_*
```

## Checklist de cada prueba

1. Login con la cuenta de prueba.
2. Listado de equipos: aparece el `TEST_…` y **solo los que te pertenecen**.
3. Abrir el sistema: configuracion, sensores, estado.
4. Historico y graficas: hay datos y las unidades son correctas.
5. Mapa: el marcador aparece en la ubicacion.
6. **Modo lectura de un sistema real**: abrirlo sin modificar nada.
7. Cerrar sesion y volver a entrar: los datos persisten.

## Limites conocidos

- **Push (FCM)** no es fiable en local: el token se registra, pero la entrega depende del origen y
  del proyecto. Las notificaciones se validan en produccion.
- El **service worker** cachea; si ves codigo viejo, "Bypass for network" o desregistra el SW.
- La base de datos es **la real**: las reglas permiten escribir a cualquier usuario autenticado, de
  ahi la regla 1.

## Si algo va mal

1. No repitas la accion a ciegas.
2. Consola (errores) + Network (peticiones 401/403) dicen casi siempre que pasa.
3. Si creaste algo por error: `borrar-sistema-prueba.js` lo lista. Si no empieza por `TEST_`, **no lo
   borres con el script**: avisa y se trata a mano.

## Si lo abres desde el movil o por IP de red

`localhost` y `127.0.0.1` estan autorizados por defecto en Firebase Auth. Una **IP de LAN**
(`http://192.168.x.x:5502`) **no**: el login falla con `auth/unauthorized-domain` hasta que la anadas
en Firebase Console -> Authentication -> Settings -> Authorized domains. Y como el service worker y
las notificaciones exigen contexto seguro, en LAN necesitas HTTPS (tunel tipo cloudflared o ngrok).

Live Server puede exponerse en la red con `liveServer.settings.host` = `0.0.0.0`, pero para probar
notificaciones push en un movil real lo practico es un tunel HTTPS con un dominio autorizado.
