# REQ-034 - Refactorizacion total de PWA3: especificacion base

| Campo | Valor |
|---|---|
| Estado | **Aprobado como marco** (2026-11-05); decisiones de la seccion 7 abiertas. Fases 1-2 redefinidas por REQ-038 |
| Alcance | Toda la aplicacion web de PWA3 (`index.html`, `assets/`, service workers, `functions/`, reglas de BD) |
| Pruebas de partida | 140/140 en Node (`node --test "test/unit/*.test.js"`) |
| Riesgo | Alto si se hace de golpe; bajo si se respeta el orden de la seccion 8 |
| Primer paso | **REQ-035** (el login), porque bloquea la verificacion de todo lo demas |

## 1. Objetivo

Convertir PWA3 en una aplicacion **modular, verificable y empaquetable** (Capacitor) **sin cambiar
lo que el usuario puede hacer** ni el contrato con los equipos de campo. Refactorizar significa:
mismo comportamiento, otra estructura. Las funcionalidades nuevas van en REQ aparte.

## 2. Punto de partida (medido el 2026-11-05)

| Elemento | Medida |
|---|---|
| `index.html` | 5.065 lineas, 437 KB; todas las vistas en un archivo; 290 `ng-show`, ~950 `style=""` |
| `assets/js/core.js` | 5.503 lineas; un unico controlador `ControladorPrincipal`; 134 funciones en `$scope` |
| Lint de `core.js` | 47 funciones globales implicitas, 21 `JSON.parse` sin proteger |
| Ruteo | `ngRoute` con plantillas `<p ng-init='showX()'>`; la vista real la decide `selectedWindow` |
| Logica ya extraida | `assets/js/logic/` (11 modulos) y `assets/js/services/` (5 modulos), con pruebas |
| Stack | AngularJS 1.6.9 (sin soporte), Firebase JS v8, FirebaseUI 4 (cargado y sin uso), Materialize, jQuery |
| Scripts por CDN | sweetalert (unpkg), hammer (jsdelivr), AngularJS (googleapis), Firebase (gstatic) |
| Service workers | `firebase-messaging-sw.js` (cache + push, registrado); `sw.js` (no se registra) |
| Imagenes | 24,9 MB en 203 ficheros; duplicados jpg/webp y ficheros "- copia" |
| Hosting | `"public": "."` con 40 entradas de `ignore` |
| Base de datos | Desarrollo local contra **produccion** (sin emuladores); reglas abiertas a cualquier usuario autenticado |
| Login | **No funciona de forma fiable** (ver REQ-035) |

## 3. Actores

| Actor | Descripcion |
|---|---|
| Propietario | Dueno del sistema; control total y gestion de usuarios del equipo |
| Administrador | Opera y configura sistemas asignados |
| Trabajador | Opera (marcha/paro, planes) con permisos limitados |
| Desarrollador | Acceso a opciones tecnicas del equipo |
| Equipo de campo | Pivotes, estacionarios, pozos, sensores y neveras: leen comandos y escriben estado/logs en RTDB |
| Cloud Functions | Envian notificaciones push a partir de cambios en RTDB |

El rol se guarda por sistema en `users/{email-con-guiones}/systems/{systemId}`.

## 4. Requisitos funcionales

Prioridad: **P0** bloquea el uso; **P1** uso diario; **P2** secundario.
Cada RF se considera conservado cuando su criterio de aceptacion pasa **igual que en PWA2**.

### 4.1 Acceso y sesion

| ID | P | Requisito | Criterio de aceptacion |
|---|---|---|---|
| RF-AUT-01 | P0 | Acceso con Google | En Chrome, Edge, Firefox y Safari (escritorio y movil), con prevencion de seguimiento activa, el usuario elige cuenta y entra al listado en el primer intento |
| RF-AUT-02 | P0 | Acceso con correo y contrasena | Credenciales validas llevan al listado; las invalidas muestran el mensaje de `logic/login.js` |
| RF-AUT-03 | P1 | Alta con correo | Crea la cuenta, inicia sesion y crea el nodo `users/{email}` si no existe |
| RF-AUT-04 | P0 | Salir | Cualquier boton "Salir" **cierra la sesion de Firebase**, limpia los datos de sesion (conserva preferencias del dispositivo) y muestra el login; al recargar no se vuelve a entrar solo |
| RF-AUT-05 | P1 | Cambiar de usuario | Cierra la sesion y abre el selector de cuentas de Google |
| RF-AUT-06 | P0 | Persistencia | Al reabrir la app (o la PWA instalada) con sesion valida se entra directo al listado |
| RF-AUT-07 | P0 | Errores visibles | Ningun fallo de acceso queda en silencio: o se muestra un mensaje o queda una traza `[auth]` explicando el motivo |
| RF-AUT-08 | P1 | Recuperar contrasena | Envia el correo de restablecimiento (hoy no existe; ver D-6) |

### 4.2 Listado y sistemas

| ID | P | Requisito | Criterio de aceptacion |
|---|---|---|---|
| RF-LIS-01 | P0 | Listado de sistemas del usuario | Muestra solo los sistemas de `users/{email}/systems`, con color/estado y ultimo dato |
| RF-LIS-02 | P1 | Retraso de comunicacion | Marca el equipo cuando el ultimo dato supera el umbral de `logic/equipos.js` (10 min) |
| RF-SIS-01 | P0 | Pivote central / lineal (`PC`, `PL`) | Marcha, paro, sentido, velocidad/lamina, con agua o en seco; el estado mostrado coincide con RTDB |
| RF-SIS-02 | P0 | Estacionario | Crear, editar, iniciar, detener y borrar programas por sector |
| RF-SIS-03 | P1 | Pozo | Marcha/paro y lecturas (presion, caudal, corriente) |
| RF-SIS-04 | P1 | Sensores (`WM`, `Ms`, `NPK`, `NPKML`, `Psi`, `Tr`, `Fl`, `Irms`, `Contact`, `SHT`) | Lectura actual, icono, nivel de bateria/senal y alta/edicion/borrado en la red de sensores |
| RF-SIS-05 | P1 | Nevera | Temperatura/humedad, grafica y alarma |
| RF-SIS-06 | P1 | Permisos por rol | Cada control visible/habilitado solo para los roles que hoy lo tienen (`isSystemOfRole`) |

### 4.3 Riego, mapas e historicos

| ID | P | Requisito | Criterio de aceptacion |
|---|---|---|---|
| RF-RIE-01 | P1 | Plan de riego por parcelas | Crear, editar, borrar y lanzar el plan; las fechas y tiempos se calculan con `logic/riego.js` y `logic/fechas.js` |
| RF-RIE-02 | P1 | Avisos de riego | Los avisos de `logic/aviso.js` aparecen igual que hoy |
| RF-MAP-01 | P1 | Mapa del sistema | Posicion del equipo, semicirculo del pivote, sensores y poligonos de parcela (Leaflet) |
| RF-MAP-02 | P2 | Mi posicion | Centrar el mapa en la ubicacion del dispositivo y guardar la posicion del equipo/sensor |
| RF-EST-01 | P1 | Historicos | Graficas de `logs`/`dayLogs` por rango de fechas, con zoom y avance/retroceso |

### 4.4 Configuracion, usuarios y notificaciones

| ID | P | Requisito | Criterio de aceptacion |
|---|---|---|---|
| RF-CFG-01 | P1 | Alta de equipo por QR | Escanear QR, completar parametros y crear el equipo |
| RF-CFG-02 | P1 | Configuracion de la maquina | Guardar ajustes y esquema de sensado sin alterar claves que lee el firmware |
| RF-USR-01 | P1 | Usuarios del equipo | Anadir/quitar usuarios con rol en un sistema |
| RF-USR-02 | P2 | Perfil y planes | Editar perfil (direccion, estado, CP, cuenta) y elegir plan |
| RF-NOT-01 | P1 | Notificaciones push | Activar/desactivar, guardar token FCM y recibir avisos de pivote, humedad de suelo, temperatura y riesgo de plaga |
| RF-NOT-02 | P2 | Sonido | Activar/desactivar el sonido; la preferencia sobrevive al cierre de sesion |
| RF-MET-01 | P2 | Meteorologia | Clima del sistema con la cache de `logic/meteo.js` |
| RF-AYU-01 | P2 | Ayuda, fichas tecnicas, cultivos y plagas | Contenido estatico accesible desde el menu |
| RF-PWA-01 | P1 | Instalacion | La app se puede instalar (manifest valido) y abre en modo standalone |
| RF-PWA-02 | P1 | Arranque sin red | Con la app ya instalada, sin conexion muestra la interfaz y un aviso de "sin conexion" en vez de pantalla en blanco |
| RF-PWA-03 | P1 | Compartir | Compartir por WhatsApp como hoy |

## 5. Requisitos no funcionales

Los valores son **objetivos propuestos**; se fijan al aprobar este REQ.

### 5.1 Mantenibilidad

| ID | Requisito | Meta |
|---|---|---|
| RNF-MAN-01 | Tamano de fichero | Ningun JS de la app > 400 lineas; ninguna plantilla > 300 lineas |
| RNF-MAN-02 | Una vista, un modulo | Cada vista (listado, sistema, mapas, historicos, plan de riego, usuarios, notificaciones, ayuda, fichas, login) con plantilla y controlador propios |
| RNF-MAN-03 | Sin globales implicitas | Lint: 0 globales implicitas, 0 `JSON.parse` sin `try` |
| RNF-MAN-04 | Capas | Vista -> controlador -> servicio -> repositorio/adaptador. Solo los adaptadores tocan `firebase.*` |
| RNF-MAN-05 | Estilos | 0 atributos `style=""` en plantillas, salvo valores calculados (`ng-style`) |
| RNF-MAN-06 | Sin codigo comentado ni muerto | 0 bloques de codigo comentado; ficheros sin referencias se eliminan |
| RNF-MAN-07 | Versionado de assets | Automatico (hash o version generada), nunca editado a mano en `index.html` |

### 5.2 Calidad y pruebas

| ID | Requisito | Meta |
|---|---|---|
| RNF-PRU-01 | Red de seguridad | Las 140 pruebas actuales siguen en verde en cada paso |
| RNF-PRU-02 | Cobertura | Todo `logic/` y `services/` con pruebas; cada RF P0 con al menos una prueba automatica (unitaria o de humo en navegador) |
| RNF-PRU-03 | Un comando | `npm run verificar` = lint + pruebas + humo, y funciona en Node 20 y 22 en Windows |
| RNF-PRU-04 | Entorno aislado | Pruebas destructivas en emuladores de Firebase o en sistemas `TEST_` (ver `test/README.md`) |
| RNF-PRU-05 | Paridad con PWA2 | Lista de comprobacion manual por RF firmada antes de promocionar |

### 5.3 Rendimiento

| ID | Requisito | Meta |
|---|---|---|
| RNF-REN-01 | Precarga del service worker | <= 500 KB |
| RNF-REN-02 | Primera carga en 4G | Interfaz utilizable (login o listado) en <= 3 s en un Android de gama media |
| RNF-REN-03 | Imagenes | `assets/images` <= 6 MB; ninguna imagen > 300 KB; formatos webp/avif |
| RNF-REN-04 | Carga diferida | Leaflet, Chart.js y el escaner QR se cargan al entrar a su vista |
| RNF-REN-05 | Listeners | Al salir de un sistema se cancelan sus suscripciones de RTDB (sin fugas) |

### 5.4 Seguridad

| ID | Requisito | Meta |
|---|---|---|
| RNF-SEG-01 | Reglas de BD por pertenencia | Un usuario solo lee/escribe los sistemas que tiene en `users/{email}/systems`, segun su rol, **sin romper la escritura de los equipos** (ver D-5) |
| RNF-SEG-02 | Nodo `users` | Cada usuario lee y escribe solo su propio nodo; hoy cualquiera autenticado puede leer todos |
| RNF-SEG-03 | Secretos | Ninguna clave de servicio en el repo ni en hosting; la clave expuesta, rotada |
| RNF-SEG-04 | Claves de terceros | La clave de OpenWeather no viaja en el cliente (proxy en Functions o restriccion por referer) |
| RNF-SEG-05 | CSP | Sin dominios de CDN; objetivo final sin `'unsafe-eval'` (implica dejar AngularJS, ver D-1) |
| RNF-SEG-06 | Publicacion | Hosting publica solo una carpeta de distribucion (`www/`), no la raiz |

### 5.5 Disponibilidad, compatibilidad y usabilidad

| ID | Requisito | Meta |
|---|---|---|
| RNF-COM-01 | Navegadores | Ultimas 2 versiones de Chrome, Edge, Firefox y Safari; Chrome Android e iOS Safari |
| RNF-COM-02 | Nativo | El mismo codigo corre en WebView de Capacitor (Android/iOS): sin dependencias que exijan red para arrancar |
| RNF-COM-03 | Sin CDN | Todas las librerias servidas desde `assets/vendor/` con version fija |
| RNF-USA-01 | Idioma | Espanol (Mexico); textos de la UI centralizados para una futura traduccion |
| RNF-USA-02 | Accesibilidad | Controles con etiqueta, contraste AA en botones de marcha/paro, objetivos tactiles >= 44 px |
| RNF-USA-03 | Responsivo | Uso completo desde 360 px de ancho |
| RNF-OBS-01 | Trazas | Prefijos `[app]`, `[auth]`, `[repo]`, `[sw]`; version de la app visible en consola y en "Acerca de" |

## 6. Restricciones

| ID | Restriccion | Consecuencia |
|---|---|---|
| R-01 | **Contrato con el firmware** | No se renombran rutas ni claves de RTDB que leen/escriben los equipos (`systems/{id}/...`, `logs`, `dayLogs`, comandos). Cualquier cambio de esquema va en un REQ con migracion y aprobacion del equipo de Embebido |
| R-02 | **Base de datos compartida** con PWA2 (produccion) | Los cambios de datos deben ser compatibles hacia atras mientras PWA2 siga publicada |
| R-03 | Clave de usuario | Se conserva `email` con `.` -> `-` como clave de `users` |
| R-04 | **Un solo proyecto Firebase** (`dta-agricola`) | Sin entorno de staging propio; vista previa solo por canal (`hosting:channel:deploy`) |
| R-05 | Sin despliegue automatico | Promocion solo segun `PROMOTE.md`; nunca desde un `.bat` |
| R-06 | Reglas de prueba | Solo sistemas `TEST_` y cuenta de QA (`test/README.md`) |
| R-07 | Incremental | Cada paso deja la app funcionando y las pruebas en verde; nada de reescritura en paralelo de meses |
| R-08 | Functions | Node 20, `firebase-functions` v4; las 4 funciones de notificacion no cambian su disparador sin REQ |
| R-09 | Entorno de desarrollo | Windows + VS Code; los scripts de `npm` deben funcionar en PowerShell |
| R-10 | Repositorio | PWA3 se versiona en el repo padre `dta-agricola`; cada REQ en su commit |
| R-11 | Metodo | Cada cambio nace de un REQ en `docs/spec` con pruebas antes de implementarse (SDD) |

## 7. Decisiones abiertas

| ID | Pregunta | Recomendacion |
|---|---|---|
| D-1 | Stack destino: mantener AngularJS modularizado o migrar | Modularizar primero en AngularJS (fases 1-3); decidir la migracion (vista por vista) al terminar la fase 3, con la app ya partida |
| D-2 | Arreglo del login con Google | `authDomain` = dominio de hosting (opcion 1 de Firebase); ver REQ-035 |
| D-3 | `landing/`, `dataconnect/`, `src/`, `public/`, `login/` | Archivar si no se usan; confirmar con el usuario |
| D-4 | Emuladores de Firebase para desarrollo | Si, para Auth + RTDB; elimina el riesgo de tocar produccion |
| D-5 | Como se autentican los equipos de campo al escribir en RTDB | Necesario antes de endurecer reglas (RNF-SEG-01) |
| D-6 | Recuperar contrasena (RF-AUT-08) | Incluirlo en REQ-035 por ser una linea de Firebase |
| D-7 | Enlace a `tos.html` | El fichero no existe; crear la pagina o quitar el enlace |

## 8. Orden de trabajo

| Fase | Contenido | Sale cuando |
|---|---|---|
| 0 | **REQ-035 login** + higiene: script de pruebas en Node 22, `www/` como carpeta publica, archivar basura, quitar FirebaseUI y `sw.js` | RF-AUT-* pasan en los 4 navegadores |
| 1-2 | **Componentes** (REQ-038): cada pantalla sale a la vez de `index.html` y `core.js`. Orden: Login (REQ-039), Ayuda y Fichas (REQ-040), Perfil, Planes y Notificaciones (REQ-041), Listado, Sistema con paneles por tipo, Mapas, Historicos, Plan de riego, Configuracion, Usuarios del equipo | RNF-MAN-01 a 05 |
| 3 | Dependencias locales, carga diferida, Firebase v9 compat | RNF-COM-03, RNF-REN-04 |
| 4 | Imagenes y precache | RNF-REN-01 y 03 |
| 5 | Seguridad de datos (reglas, OpenWeather, CSP) | RNF-SEG-* (tras D-5) |
| 6 | Decision D-1 y empaquetado Capacitor | RNF-COM-02 |

## 9. Definicion de terminado (para cada REQ hijo)

1. Especificacion en `docs/spec` con alcance, pruebas y riesgo.
2. `npm run verificar` en verde.
3. Prueba manual de los RF afectados en local con cuenta de QA.
4. Sin errores `Uncaught` ni violaciones de CSP en consola.
5. `README.md` de specs actualizado.
