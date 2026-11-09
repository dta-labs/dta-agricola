# Especificaciones (SDD)

| ID | Titulo | Estado | Pruebas |
|---|---|---|---|
| REQ-001 | Logica pura: formulas, fechas, secuencias | Implementado | 17 |
| REQ-004 | Dominio devices: estado y tiempos | Implementado | 8 |
| REQ-005 | Correccion de estado (D-07, D-08, D-10) | Implementado | 8 |
| REQ-006 | Dominio riego: programacion de parcelas | Implementado | 9 |
| REQ-007 | Correccion de la logica pura | Implementado | - |
| REQ-008 | Codigo muerto (D-05) y cierre de D-11 | Implementado | - |
| REQ-009 | Avisos de riego en la UI | Implementado | - |
| REQ-009b | Mensaje de resultado como funcion pura | Implementado | 3 |
| REQ-010 | Repositorio de datos + adaptador Firebase | Implementado | 8 |
| REQ-011 | Escrituras a traves del repositorio | Implementado | 10 |
| REQ-012 | Servicio de autenticacion | Implementado | 5 |
| REQ-013 | Servicios de dominio: equipos | Implementado | 19 |
| REQ-014 | Robustez de plantillas y auditoria de consola | Parcial | - |
| REQ-015 | Login con un solo SDK (Google no entraba) | Implementado | 5 |
| REQ-016 | Widget del tiempo de terceros bajo demanda | Implementado | - (navegador) |
| REQ-017 | El login no se queda colgado si falla /users | Implementado | 1 |
| REQ-018 | Cache-busting y trazas de arranque | Implementado | - (navegador) |
| REQ-019 | La sesion no se revierte; Google por redireccion | Confirmado | 6 |
| REQ-020 | Google ofrece elegir cuenta | Confirmado | 1 |
| REQ-021 | Claves de servicio fuera del indice | Implementado (rotar: usuario) | - |
| REQ-022 | Reglas de BD cerradas, CSP y tooling | Implementado (desplegar: usuario) | 5 |
| REQ-023 | Gestion de usuarios: menu, perfil y planes | Implementado (probar con sesion) | 10 |
| REQ-024 | Arreglos del log: imagenes, interpolaciones y CSP | Implementado | - (navegador) |
| REQ-025 | El aviso de salida no puede romper el inicio de sesion | Implementado (probar con Google) | 12 |
| REQ-026 | Diagnostico de sesion (herramienta `diagnostico.html`) | Implementado | - (headless) |
| REQ-027 | Acceso con Google sin el iframe de Firebase (GIS) | **Revertido** (REQ-028) | 9 |
| REQ-028 | Acceso con Google: flujo oficial de Firebase | Implementado | - |
| REQ-029 | Un solo boton de salida | Implementado | 5 |
| REQ-030 | Popup bloqueado por COOP: via principal redireccion | Implementado | 4 |
| REQ-031 | Acceso con Google simple (solo redireccion) | Implementado (no fiable, ver REQ-035) | 4 |
| REQ-032 | Cache de meteorologia | Implementado | 9 |
| REQ-033 | Precache ligero del service worker | Implementado | 4 |
| REQ-034 | **Refactorizacion total: especificacion base** | Propuesto | - |
| REQ-035 | **Login fiable: Google, correo y salida** | Confirmado (Google) | 13 |
| REQ-036 | Foto del usuario, perfil en el menu lateral y plan actual | Implementado (probar: usuario) | 7 |
| REQ-037 | No aparecian los equipos: CSP bloqueaba la base de datos | Implementado (probar: usuario) | 2 |
| REQ-038 | **Arquitectura por componentes** (capas, contrato, procedimiento) | Base implementada | 8 |
| REQ-039 | Componente `dta-login` (piloto) | Implementado (probar: usuario) | 28 |
| REQ-040 | Componentes `dta-ayuda` y `dta-fichas-tecnicas` | Implementado (probar: usuario) | 20 |
| REQ-041 | Componentes `dta-perfil`, `dta-planes` y `dta-notificaciones` | Propuesto | - |
| REQ-042 | Selector de cultivos del pivote (select nativo) | Implementado (probar: usuario) | 3 |
| REQ-043 | **Salida de Materialize hacia Bootstrap 5** | Fases A-B; C: Ayuda, Fichas | 13 |
| REQ-044 | Perfil desde la cabecera del menu y Plan dentro del perfil | Implementado (probar: usuario) | 3 |
| REQ-045 | "Mi perfil" moderno (Bootstrap dentro del modal; fecha de nacimiento; guardar real) | Aprobado por el usuario (con ajustes REQ-046) | 9 |
| REQ-047 | **Tema comun**: botones, modales, campos y ventanas con el estilo del perfil | Implementado (probar: usuario) | 5 |
| REQ-048 | Fichas tecnicas en un modal (lista con buscador, ficha como linea de tiempo) | Implementado (probar: usuario) | 2 |
| REQ-049 | Convivencia de modales Bootstrap / Materialize (capa blanca, contenido encimado, cabecera fija) | Implementado (probar: usuario) | 5 |
| REQ-050 | Notificaciones, Ayuda, Invitar y Programa de riego con el estilo comun (`ventana.css`) | Implementado (probar: usuario) | 9 |
| REQ-051 | **Geolocalizacion con mapa**: posiciones de sensores/equipos y poligonos de parcela, con ayuda visual | Implementado (probar: usuario) | 18 |
| REQ-052 | Parcelas sombreadas por humedad y clicables, parcela del sensor, lector QR/barras/NFC, modales de sensor | Implementado (probar: usuario) | 23 |
| REQ-053 | Modales de sensor: margenes, pasos y botones solo con icono en el movil (ver REQ-052 §8) | Implementado (probar: usuario) | - |
| REQ-054 | Alertas del sensor con umbrales separados ("Regar/No regar" segun tipo, "Helada/Exceso de calor"); iconos centrados | Implementado (probar: usuario) | 2 |
| REQ-055 | Planes con borde verde claro; ayuda (?) del pivote dentro del campo Velocidad/Volumen | Implementado (probar: usuario) | 2 |
| REQ-056 | Ventana de velocidades del pivote: estilo comun, mm, fila actual, estados; (?) de "Nuevo plan" cargaba nada | Implementado (probar: usuario) | 3 |
| REQ-057 | **"Sistema" por componentes** (paneles por tipo + modales; fases S1-S4) | S1 completa: 6 paneles (probar: usuario) | 12 |
| REQ-058 | Version y compilacion al fondo del menu lateral, en dos lineas seguidas | Implementado (probar: usuario) | 1 |
| REQ-059 | Plan de riego del pivote: un solo componente (nuevo/editar); velocidad guardada al maximo por comparar textos; suelo no guardado | Implementado (probar: usuario) | 8 |
| REQ-060 | Pivote: los sectores del plan no pueden solaparse (formulario y aviso en la lista) | Implementado (probar: usuario) | 3 |
| REQ-061 | Parcela del estacionario: E1 errores de datos (borraba la duracion del 1er riego; ceros cambiados; defaults que no llegaban) | E1 implementada (probar: usuario) | 7 |
| REQ-062 | Pivote: 0 % = zona de paro (valido; se explica en el formulario y se marca en la lista) | Implementado (probar: usuario) | 1 |
| REQ-063 | Estacionario: sin la imagen del motor; parcelas 1-7 y la M (motor) con el color de su estado | Implementado (probar: usuario) | 1 |
| REQ-064 | Estacionario: gris apagado / amarillo sin confirmar / verde encendido (blanco en el listado, REQ-065), en panel, listado y mapa | Implementado (probar: usuario) | 3 |
| REQ-066 | Sensores: umbrales de temperatura en °C/°F del sistema (guardados en °C), sin tooltips fijos, tarjetas compactas | Implementado (probar: usuario) | 5 |
| REQ-067 | Mapa de sensores: tocar la parcela muestra los datos; tocar el sensor abre su configuracion | Implementado (probar: usuario) | 1 |
| REQ-068 | Ficha del sensor: medidores con degradado (humedad 0-100 %, WM 240 cb = 0 %; temperatura -50..125 °C), umbrales y medicion | Implementado (probar: usuario) | 5 |
| REQ-069 | Ficha del sensor: barras mas gruesas y de todo el ancho (debajo del valor) | Implementado (probar: usuario) | 1 |
| REQ-070 | Ficha del sensor: tensiometro en 6 zonas no lineales con su nombre como etiqueta; temperatura helada/adecuada/calor; alto compacto | Implementado (probar: usuario) | 3 |
| REQ-071 | Ficha del sensor: iconos de humedad del suelo y temperatura centrados en vertical | Implementado (probar: usuario) | 1 |
| REQ-072 | Mapa: parcela como estimacion, punto de medicion, rayas grises si la lectura tiene mas de 24 h, area repartida entre sensores | Implementado (probar: usuario) | 4 |
| REQ-073 | Mapa: el marcador del sensor es rojo/verde/azul segun su lectura (en vez del circulo de color) | Implementado (probar: usuario) | 1 |
| REQ-074 | Fichas de sensores con el formato del listado: lectura, zona, fondo por nivel de humedad, ficha clicable | Implementado (probar: usuario) | 2 |
| REQ-075 | Fichas de sensores: textos del tamaño del listado, clima en la esquina, menos alto, degradado horizontal, boton bajo | Implementado (probar: usuario) | 1 |
| REQ-076 | Fichas de sensores: columna derecha alineada (clima, grafica, bateria con %), bateria en 4 niveles, intercambio humedad/temperatura | Implementado (probar: usuario) | 2 |
| REQ-077 | Preferencias de vista en el usuario | Sustituido por REQ-078 | - |
| REQ-078 | Vista mapa/mosaico guardada en la red y humedad/temperatura en cada sensor (ajustes del equipo); ids sin repetir | Implementado (probar: usuario) | 3 |
| REQ-079 | Fichas de sensores: degradado de oscuro a claro, borde y sombra como el listado | Implementado (probar: usuario) | - |
| REQ-080 | El sombreado de las parcelas se perdia al volver del mosaico al mapa | Diagnostico incompleto (ver REQ-081) | 1 |
| REQ-081 | Tras guardar un ajuste del equipo el mapa quedaba gris (los ajustes llegan sin log); colores que no se actualizaban con cada lectura | Corregido (probar: usuario) | 1 |
| REQ-082 | Fichas de sensores: icono en lugar del valor; Ms, Temp y Hr | Sustituido por REQ-083 | - |
| REQ-083 | Fichas de sensores: icono, valor y unidad en vertical sin crecer; "Temp." | Implementado (probar: usuario) | - |
| REQ-084 | Fichas de sensores: icono de la medicion principal mas grande (26 px) | Implementado (probar: usuario) | - |
| REQ-085 | La grafica de la ficha abre la de la medicion principal (Ms o temperatura) | Implementado (probar: usuario) | 1 |
| REQ-086 | Encabezado de la grafica segun el tipo mostrado (decia "Agua disponible" en la de temperatura) | Corregido (probar: usuario) | 1 |
| REQ-087 | Editar/Agregar sensor: el mapa de la parcela se situa en el sensor y muestra su pin | Implementado (probar: usuario) | 2 |
| REQ-088 | Marcador de equipo: pin del color del estado (como el listado) con icono del tipo, nombre y borde blanco | Implementado (probar: usuario) | 4 |
| REQ-089 | Vista satelital (NDVI): menu lateral y barra flotante; parcelas del usuario o circulo del pivote (fuente provisional Esri Sentinel-2) | Implementado (probar: usuario) | 8 |
| REQ-090 | Barra flotante: texto "Satelite" alineado con Historial y Sensores/Planes | Implementado (probar: usuario) | - |
| REQ-091 | Editar sensor: imagen centrada; nombre, tipo, cultivo, alertas (humedad, temperatura, amenazas biologicas) y geolocalizacion | Implementado (probar: usuario) | 1 |
| REQ-092 | Vista satelital: solo el borde de las parcelas, sin relleno sobre la imagen | Implementado (probar: usuario) | 1 |

**Total: 404 pruebas en Node (2026-11-06), todas en verde.** `npm test` funciona en Node 20 y 22.

## Bloque de autenticacion (cerrado y confirmado por el usuario)

| Reclamacion | Que resolvio |
|---|---|
| REQ-015 | dos SDK con dos sesiones -> un solo SDK (v8) |
| REQ-017 | el login se quedaba colgado si fallaba `/users` |
| REQ-018 | `core.js` cacheado + trazas de arranque |
| REQ-019 | el observador revertia la sesion (el "entro una vez y ya no") |
| REQ-020 | Google ofrece elegir cuenta (`prompt=select_account`) |

## Pendiente

| Item | Nota |
|---|---|
| REQ-014 | `TypeError` de `ngModel.$render` (solo aparece con sesion; requiere DevTools) |
| Prueba manual del resto | listado de equipos, retraso de comunicacion, alarma de nevera, plan de riego |
| Empaquetado nativo | Capacitor (Android/iOS), objetivo final de la refactorizacion |

## Version de los assets

`core.js?v=26.11.07.001`, `logic/login.js?v=26.11.06.002`; componentes y factories con su propio `?v=` (la prueba de estructura exige que plantilla y script coincidan). Al modificarlos hay que **subir ese
valor** en `index.html`, o el navegador puede seguir ejecutando la copia anterior.

## Recarga limpia (si algo no cuadra)

DevTools -> Application -> Service Workers -> Unregister; Storage -> Clear site data; `Ctrl+Shift+R`.
Las trazas `[app] core.js <version>` confirman que se esta ejecutando el fichero correcto.

## Versionado y push

- El repositorio es el **padre** (`dta-agricola`): PWA3 no tiene `.git` propio y se versiona ahi.
- `Desarrollo/PWA2` **si** tiene su propio `.git`, pero ademas esta versionado en el padre: es una
  situacion hibrida y explica que en GitHub Desktop aparezcan dos proyectos distintos.
- `main` puede rechazar un push por **secret scanning** si el rango toca ficheros con credenciales.
  Herramienta correcta: **rotar la clave**, no desbloquear el aviso. `git rm --cached` solo evita que
  se siga versionando: el historial conserva el secreto.
- El arbol limpio en GitHub Desktop **no** significa que no haya commits: los commits estan en
  **History** de la rama `main`, y lo que aparece en "Changes" son ficheros sin commitear
  (por ejemplo, el trabajo de `Desarrollo/Embebido`).

```powershell
git -C C:\Users\admin\Documents\GitHub\dta-agricola status -sb      # main...origin/main
git -C C:\Users\admin\Documents\GitHub\dta-agricola log --oneline -5
git -C C:\Users\admin\Documents\GitHub\dta-agricola push origin main
```
