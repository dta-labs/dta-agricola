# Cambios de PWA3

Formato: una entrada por version publicada; cada linea apunta a su especificacion en `docs/spec/`.
Versionado semantico (`package.json -> version`):

- **MAYOR**: cambia el contrato con el firmware o el esquema de la base de datos (requiere migracion).
- **MENOR**: funcionalidad nueva o refactorizacion visible (un componente nuevo, una pantalla).
- **PARCHE**: correcciones sin cambios visibles de alcance.

Cada version publicada lleva una etiqueta de git `pwa3-vX.Y.Z` sobre el commit desplegado.

## [Sin publicar] - candidata a 1.1.0

### Corregido
- El mapa de un equipo aparecia desplazado (el equipo en una esquina o fuera de la vista): ahora, al entrar al equipo
  o volver a la vista de mapa, se encuadra en su zona (sensores y parcelas, parcelas o circulo del pivote). (REQ-117)
- Listado en escritorio: tarjetas de alturas distintas dejaban huecos en la cuadricula; ahora todas miden lo mismo.
  (REQ-116)
- Login con Google fiable: `authDomain` = dominio de hosting; popup solo en local; errores visibles. (REQ-035)
- "Salir" cierra de verdad la sesion de Firebase. (REQ-035)
- Foto del usuario en la barra superior y en el menu lateral. (REQ-036)
- No aparecian los equipos: la CSP bloqueaba la conexion de respaldo de Realtime Database. (REQ-037)
- Mensajes de error del login visibles, debajo del formulario; `auth/internal-error` por credenciales se explica. (REQ-039)
- Los cultivos no se cargaban nunca (fichas, plan de riego, selector de cultivo, enfermedades). (REQ-040 F-5)
- Abrir una ficha tecnica por segunda vez ponia todas las etapas en el dia 0. (REQ-040 F-1)
- Enlace "Ver mas" de Ayuda roto (la URL estaba en `class`). (REQ-043)
- La fecha de nacimiento del perfil daba error al reabrirlo y salia vacia. (REQ-045 P-6)
- "Perfil actualizado" se anunciaba antes de guardar. (REQ-045)
- Modales de Bootstrap desfigurados por las reglas globales de Materialize/style.css (capa blanca a pantalla
  completa, contenido encima del titulo). (REQ-049)
- Programa de riego: "Iniciar" cerraba antes de validar; "Eliminar" sin confirmacion; "Repetir cada" vacio en
  programas nuevos; temporizadores con el mismo id. (REQ-050)
- La camara del lector QR seguia encendida al cerrar el modal sin pulsar el boton. (REQ-052)
- La tarjeta del sensor mostraba "Seco -99%" cuando no habia lectura; ahora "Sin dato". (REQ-052)
- Estacionario: "Aceptar" en Configurar parcela dejaba en 0 la duracion del primer riego programado; en el riego a
  demanda un 0 escrito se guardaba como el valor por defecto (0 °C -> 20 °C); los valores por defecto no llegaban a
  las parcelas; "Editar fecha de riego" mostraba NaN en los dias. (REQ-061 E1)
- `npm run verificar` (y por tanto publicar) no terminaba: la prueba de arranque dejaba el servidor abierto. (REQ-104)
- Al iniciar la app se veia en la esquina el contador de notificaciones como expresion sin procesar. (REQ-103)
- Publicar con `npm run publicar:vista-previa` y `npm run publicar:produccion`: comprueban exclusiones de secretos, git
  y pruebas antes de desplegar, y produccion pide confirmacion escrita. Corregido el comando de PROMOTE.md. (REQ-102)
- Vista satelital con la paleta estandar rojo-amarillo-verde de los servicios satelitales (antes amarillenta); numero
  de cada parcela en el mapa del estacionario; barra superior del listado en verde oscuro. (REQ-112)
- Listado: el color del estado no se aplicaba a las tarjetas (todas grises); ahora liston fuerte y fondo tenue por
  estado, alertas como etiqueta de color, iconos gris oscuro y valvulas en una fila. (REQ-111)
- Listado: textos mas grandes, iconos en negro, fondo tenue del color del estado, valvulas y motor del estacionario y
  mensajes cortos ("Suelo seco en Nogal", o "Requiere atencion" / "Accion inmediata"). (REQ-110)
- Los mapas no cargaban bien y las parcelas de sensores no se dibujaban al entrar (mapa creado oculto). (REQ-110)
- Aspecto de producto: barra superior oscura en dos lineas (el titulo ya no se corta), tarjetas del listado solidas con
  el estado en lenguaje claro ("Operando (237°) · Sin alertas", "Alerta: suelo seco en Sensor 2") y fecha/hora bajo el
  clima; boton flotante de mapa/mosaico en la red de sensores; notificaciones solo en el listado. (REQ-109)
- Corregida la hora con doble ":" (09::48) en la cabecera y el historial. (REQ-109)
- Pantalla de inicio con el icono de la app animado (rebote, destello, pulso y satelite en orbita) con barra de avance real de la carga y
  la version. (REQ-105)
- Notificaciones: ya no aparecen avisos emergentes al iniciar; boton flotante con contador cuando hay nuevas y ventana
  con "Sin leer" e "Historial" (tipo, fecha y hora, urgencia), incluidas las push recibidas con la app cerrada. (REQ-101)
- Menu del equipo en el mapa rediseñado: cabecera con el pin del equipo y su estado, opciones alineadas (Historial,
  Sensores/Planes, Usuarios y Ajustes) y boton "Como llegar". (REQ-100)
- Mapa de la red de sensores: sobre cada sensor flotan su temperatura y su etiqueta de humedad, sin recuadro y
  legibles sobre cualquier fondo, en letra grande. (REQ-098, REQ-099)
- Graficas del historial de sensores: iconos del clima de cada dia (la CSP bloqueaba Open-Meteo), datos de todas las
  series al tocar cualquier punto, barra con acercar/alejar/ver todo/ir a una fecha, exportar datos (CSV) y guardar
  imagen (PNG); la barra solo en las ventanas de graficas, no en la ficha del mapa. (REQ-093, REQ-094)
- Editar sensor reordenado: nombre, tipo, cultivo, alertas (humedad, temperatura y amenazas biologicas) y
  geolocalizacion; imagen del sensor centrada. (REQ-091)
- Vista satelital (NDVI de Sentinel-2) desde el menu lateral y la barra flotante: en la red de sensores y el
  estacionario, todas las parcelas del usuario; en el pivote, su area circular. Fuente provisional hasta integrar
  DTA-AgroSat; con la imagen visible, las parcelas solo muestran su borde. (REQ-089, REQ-092)
- Mapa: los equipos se marcan con un pin del color de su estado (el mismo que su tarjeta del listado), con el icono
  del tipo, su nombre y borde blanco, en lugar del logo de 50 px. (REQ-088)
- Editar/Agregar sensor: el mapa de "Parcela del sensor" se situa en la ubicacion del sensor y la marca con un pin. (REQ-087)
- El boton de grafica de las fichas de sensores abria siempre la humedad del suelo; ahora abre la de la medicion
  principal (Ms o temperatura), con su titulo e icono. (REQ-085, REQ-086)
- Historial: al desplazarse por una grafica ampliada, esta volvia a empezar (el clic al soltar la reconstruia). (REQ-096)
- No se podia guardar la imagen de las graficas (los iconos del clima de otro dominio bloqueaban el lienzo). (REQ-095)
- Tras guardar cualquier ajuste del equipo (p. ej. la vista mapa/mosaico) el mapa quedaba en gris: los ajustes llegan
  sin el log y se perdian las lecturas; ademas, el color de las parcelas no se actualizaba con cada lectura. (REQ-080, REQ-081)
- Los identificadores unicos podian repetirse si se generaban en el mismo milisegundo. (REQ-078)
- Pivote: se podian guardar sectores del plan solapados (p. ej. 0°-150° y 120°-180°). (REQ-060)
- Pivote: un plan nuevo se guardaba casi siempre a la velocidad maxima (comparaba textos: "50" <= "100" es falso);
  el tipo de suelo no se guardaba. (REQ-059)
- Selector de cultivos del pivote ("Nuevo plan" y "Editar plan") vacio o desfasado. (REQ-042)
- Etiquetas que tapaban los datos y selectores que no mostraban lo elegido, en toda la app. (REQ-043 A1-A2)

### Cambiado
- Resumen: el semaforo dice "N alertas requieren tu atencion" (antes "cosas"). (REQ-118)
- Menu de perfil dentro del menu lateral; plan actual destacado. (REQ-036)
- Mapa del sistema: parcelas y areas de sensores sombreadas segun la humedad del suelo (con leyenda); tocar una
  parcela abre "Editar parcela" y tocar el area de un sensor abre "Editar sensor". (REQ-052)
- Lector de identificadores con camara (QR y codigos de barras) y NFC en Agregar equipo y en los sensores. (REQ-052)
- Plan de riego del pivote: "Nuevo plan" y "Planificacion" en un solo formulario con validacion en linea y el
  estilo comun; "Eliminar plan" rediseñado. (REQ-059)
- La vista de la red de sensores (mapa o mosaico) se guarda en la red y la eleccion humedad/temperatura en cada sensor
  (ajustes del equipo): todos los que comparten la red ven lo mismo. (REQ-078)
- Fichas de sensores con el formato del listado: lectura grande, nombre y red, zona de humedad, temperatura y Hr,
  bateria, grafica y clima; fondo en degradado segun el nivel de humedad; toda la ficha abre la configuracion (REQ-074); textos del tamaño del listado y ficha mas baja (REQ-075); columna derecha con clima, grafica y bateria (4 niveles),
  e intercambio humedad del suelo / temperatura en cada ficha (REQ-076); degradado de oscuro a claro con el borde y la
  sombra del listado (REQ-079); icono, valor y unidad de la medicion principal en vertical y "Temp." abreviado. (REQ-083)
- Mapa: la parcela se muestra como estimacion (mas transparente) con el marcador del sensor del color de su lectura (REQ-073);
  rayas grises sobre el color si la lectura tiene mas de 24 h; si una parcela tiene varios sensores, el area se
  reparte entre ellos. (REQ-072)
- Ficha del sensor: barras de humedad (0-100 %, tensiometro 240 cb = 0 %) y temperatura (-50..125 °C) con degradado,
  umbrales en su lugar y triangulo de la medicion; la humedad ya no desborda la ficha y la temperatura se muestra
  en la unidad del sistema; barras gruesas y de todo el ancho. (REQ-068, REQ-069); humedad del tensiometro en 6 zonas (saturado ... fuera de rango) con el nombre de la zona como
  etiqueta y temperatura "Riesgo de helada / Temperatura adecuada / Calor extremo". (REQ-070); iconos centrados. (REQ-071)
- Mapa de la red de sensores: tocar la parcela muestra los datos del sensor y tocar el sensor abre su configuracion;
  la ficha abierta ya no se cierra al llegar datos nuevos. (REQ-067)
- Red de sensores: tarjetas compactas y modernas; sin tarjetas fijas sobre el mapa; los umbrales de temperatura se
  ven en la unidad del sistema (°C/°F) y se guardan en °C. (REQ-066)
- Estacionario: codigo de colores comun para parcelas y motor (gris apagado, amarillo sin confirmar, verde encendido;
  blanco en el listado por contraste) en el panel, el listado y el borde de la parcela en el mapa. (REQ-064, REQ-065)
- Estacionario: los botones inferiores son las parcelas 1-7 y la M (motor), que toma el color de su estado; sale la
  imagen del motor. (REQ-063)
- "Sistema": los 6 paneles por tipo de equipo (pivote central y lineal, estacionario, sensores, nevera, pozo) son
  componentes, sin cambio visual; `index.html` -612 lineas. (REQ-057 S1)
- Ventana de velocidades del pivote rediseñada (lamina en pulgadas y mm, fila actual resaltada); en "Nuevo plan"
  el boton (?) no cargaba la tabla y fallaba si el pivote no tenia marca. (REQ-056)
- Planes con borde verde claro; la ayuda (?) de los pivotes ya no se encima a otros campos en el movil. (REQ-055)
- Alertas del sensor: cada umbral separado con su accion (Regar / No regar segun el tipo de sensor; Helada /
  Exceso de calor); el umbral de helada admite valores bajo cero. (REQ-054)
- Modales de sensor en el movil: sin margenes dobles, pasos compactos, alertas que no se cortan y botones
  Atras/Siguiente/Agregar solo con icono. (REQ-053)
- Agregar sensor: pasos visibles, cultivo y fase fenologica (selector) juntos, identificador con lector; Editar
  sensor: parcela del sensor y fase fenologica. (REQ-052)
- Mapa para marcar la posicion de sensores y equipos y el poligono de las parcelas (con superficie y ayuda
  visual); el sensor nuevo puede guardar el area de su parcela. (REQ-051)
- Notificaciones y Ayuda pasan a modales; Notificaciones, Ayuda, Invitar a alguien y Programa de riego con el
  estilo comun de ventanas (`ventana.css`). (REQ-050)
- Fichas tecnicas en un modal sobre la pantalla actual: buscador, insignia gratis/de pago y la ficha como linea
  de tiempo de etapas. (REQ-048)
- Tema comun para toda la app: tres tipos de boton (principal verde, secundario gris, peligro rojo), modales
  con cabecera y pie fijo, campos en caja. (REQ-047)
- "Mi perfil" rediseñado: cabecera con foto y plan, campos con etiqueta encima, problemas como chips,
  botones fijos, errores dentro del perfil. (REQ-045)
- La cabecera del menu lateral (foto, nombre, correo, plan) abre el perfil; "Plan" pasa al final del perfil;
  se elimina "Cambiar de usuario". (REQ-044)
- Arquitectura por componentes: base `app/`, `ui/`, `components/`. (REQ-038)
- Login como componente `<dta-login>`: formulario real (Enter, gestor de contrasenas), botones en el campo,
  alta con "Cancelar". `autentication.js` retirado. (REQ-039)
- Ayuda y Fichas tecnicas como componentes `<dta-ayuda>` y `<dta-fichas-tecnicas>`; el aviso de ficha de pago
  se muestra en la vista. (REQ-040)
- Bootstrap 5.3 (aislado en `.bs`, servido desde la app) convive con Materialize; Ayuda y Fichas tecnicas
  migrados: acordeon, list-group y modales de Bootstrap. El login sigue en Materialize. (REQ-043 fases B-C)

### Anadido
- Resumen: "Sugerencias del dia" al final (lo accionable de tus equipos y un consejo que rota cada dia); sin equipos
  registrados, bienvenida con las sugerencias de inicio como protagonistas (agregar equipo, conocer equipos DTA,
  instalar la app). (REQ-115)
- Resumen ejecutivo como pagina de entrada: semaforo e indicadores (equipos bien, regando, suelo adecuado, minima
  de la noche), "Atiende primero", "Mis cultivos" y "Hoy"; la cabecera alterna Resumen / Equipos. (REQ-114)
- Ajustes del sistema (red de sensores y nevera): boton "Abrir configuracion WiFi" del Gateway Universal
  (`http://192.168.4.1`), con la indicacion de conectarse antes a la red `DTA-Gateway-...`. (REQ-097)
- Fecha y hora nativas en el programa de estacionario (selector del sistema en el movil); se guarda en el
  formato de siempre. (REQ-043 A3)
- Version de la app visible al pie del menu lateral y en consola; `package.json` en `1.1.0-dev`.
- Numero de compilacion visible bajo la version (cambia en cada entrega; una prueba obliga a subirlo); ambos al
  fondo del menu lateral, en dos lineas seguidas. (REQ-058)
- Recuperar contrasena. (REQ-035)
- Especificaciones REQ-034 (refactorizacion total) a REQ-041.

## [1.0.0]
- Version de partida de PWA3 antes de la refactorizacion (REQ-001 a REQ-033).
