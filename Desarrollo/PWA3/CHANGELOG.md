# Cambios de PWA3

Formato: una entrada por version publicada; cada linea apunta a su especificacion en `docs/spec/`.
Versionado semantico (`package.json -> version`):

- **MAYOR**: cambia el contrato con el firmware o el esquema de la base de datos (requiere migracion).
- **MENOR**: funcionalidad nueva o refactorizacion visible (un componente nuevo, una pantalla).
- **PARCHE**: correcciones sin cambios visibles de alcance.

Cada version publicada lleva una etiqueta de git `pwa3-vX.Y.Z` sobre el commit desplegado.

## [Sin publicar] - candidata a 1.1.0

### Corregido
- **REQ-166**: acceso: el autocompletado del navegador ya no tapa el texto; "Mostrar contraseñas" como casilla debajo del alta.
- **REQ-165**: la contraseña ya no se recorta (los espacios se validan); al entrar un usuario distinto la app se recarga limpia (no quedan datos del anterior); la bienvenida usa el icono de la app.
- **REQ-164**: alta de usuario con contraseña confirmada y validada (6+ caracteres, letras y numeros), correo de verificacion; recuperar contraseña con correo en español, regreso a la app y mensaje que orienta (spam, cuentas de Google).
- **REQ-163**: asistentes de alta: sin latitud/longitud repetidas en Agregar equipo; no se avanza sin tipo ni sin nombre e identificacion (equipo y sensor); cada Agregar sensor empieza de cero.
- **REQ-161**: "Agregar equipo": los tipos de equipo en 2 columnas (3 en pantallas anchas); antes salian uno por fila pegados a la derecha.
- **REQ-158**: vista satelital: solo se piden las imagenes de las areas que se ven en el mapa (y las que entran al moverlo; maximo 25 por vista), no las de todos los equipos.
- **REQ-154**: Cloud Functions en Node.js 22 (Node.js 20 ya no se puede desplegar desde el 30/10/2026).
- **REQ-153**: arranque mas rapido de la PWA en el celular (index.html con tiempo maximo de red y archivos versionados desde la copia), una sola recarga por actualizacion y sin el hueco de la barra en neveras/invernaderos.
- **REQ-151**: nombres de cultivo mal escritos en la base ("Jalape��o" → Jalapeño, "Manazana" → Manzana): la app los corrige en el catalogo y en los equipos al leerlos.
- Servidor (WS v7): el promedio diario de los tensiometros incluia las lecturas "no listo" (0) y "error" (240) y salia sesgado; ahora se ignoran. (REQ-146)
- En iOS y Android, al trabajar con el mapa la vista se descuadraba y la cabecera quedaba cortada (sin titulo ni controles). El mapa media mas que la pantalla y el navegador desplazaba la vista; ahora su alto se ajusta al espacio visible y la vista vuelve arriba si algo la desplaza. (REQ-137)
- Historial: las graficas no mostraban los iconos del clima. Al abrir un sensor se veian solo las lecturas del dia (aunque "Semana" apareciera elegido) y su unico icono, el del borde, se descartaba; ahora se carga el periodo elegido, los dias del borde se dibujan y los iconos que cargan tarde redibujan la grafica vigente. (REQ-132)
- Historial: en el celular las tablas mas anchas que la pantalla movian toda la ventana; ahora se desplazan dentro de su caja y la fecha queda fija a la izquierda. (REQ-131)
- Historial: la grafica de "Agua disponible" no se redibujaba al tocar su pestaña (el clic estaba partido); las lecturas "no listo" (0), error (240) y sin dato salian como 100 %; el eje rotulaba mal los cb. La humedad de los sensores Ms leia otra posicion del registro. (REQ-127)
- El menu lateral quedaba por debajo de la cabecera; ahora se abre en primer plano, desde arriba. (REQ-119)
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
- **REQ-167**: las cuentas nuevas de correo y contraseña no entran hasta verificar el correo; al crear la cuenta se envía el enlace y se cierra la sesión; opción "Reenviar enlace de verificación".
- **REQ-162**: "Agregar equipo" como asistente (Tipo, Identificacion, Configuracion con compatibilidad, largo y velocidad, mapa, latitud, longitud y zona horaria) y "Agregar sensor" en 4 pasos (Tipo, Identificacion, Ubicacion, Cultivo y alertas); la barra de pasos navega; en el movil ya no se ven todos los botones a la vez.
- **REQ-160**: Resumen: la helada medida en varios equipos es un solo aviso critico (equipos, sensores, hectareas) con su accion de contencion; la actividad del dia agrupa la helada; la configuracion (cultivos, parcelas, caudal, alertas de plagas) sale de las sugerencias a "Configuracion pendiente".
- **REQ-159**: vista satelital: la consulta de imagen mas reciente solo se hace cuando el usuario activa Satelite (o Reintentar), no al mover el mapa ni por plazo.
- **REQ-157**: vista satelital con progreso de carga, todas las areas del usuario (pivotes y parcelas) y copia local que solo se renueva si hay una imagen mas reciente; barra inferior de pivote/estacionario anclada abajo (iPhone); compartir la app (WhatsApp, Telegram, correo, SMS, enlace, QR, mas) en el pie del menu lateral.
- **REQ-155**: Resumen por enfoques (Todo, Riego, Agronomia, Campo, Administracion): solo lo critico en rojo, confirmaciones agrupadas, 4 indicadores por rol, "Que atender primero" (max. 5), "Lo que toca hoy" (lista de verificacion), sugerencias ligadas a datos, cultivos por prioridad y superficie; en reposo el suelo seco no es urgente.
- **REQ-152**: neveras e invernaderos sin la barra Historial / Sensores / Usuarios (siguen en el menu lateral, donde la opcion dice "Sensores").
- **REQ-150**: unidades frio: las horas calidas restan; temporada de frio propia por sensor (por defecto la del cultivo); los resumenes anteriores al WS v7 (antes del 21/11) se recalculan con Tmin/Tmax desde el 1/11.
- **REQ-148**: invernaderos: sin limites de temperatura definidos la tarjeta muestra "Sin límites" (no aplica el 0-3 °C de las neveras).
- Estacionario, Plan de riego \ Parcelas: el estado de una parcela o del motor con la orden enviada y sin confirmar dice "En espera". (REQ-141)
- Estacionario, Plan de riego \ Parcelas: tarjetas nuevas con el numero y el color del estado (regando, esperando, detenida), nombre, cultivo, superficie, duracion del riego y humedad del sensor asociado; el motor con su estado. Mismo comportamiento al tocarlas. (REQ-139)
- Resumen: en "Mis cultivos" los cultivos sin sensor muestran el equipo donde estan y su estado (y lo abren); "Maiz" y "Maíz" se agrupan. "Atiende primero" va en un area de alto fijo con desplazamiento sin barra. El semaforo abre las notificaciones. Los avisos de helada no se muestran para cultivos en su reposo invernal (p. ej. manzano o nogal de noviembre a febrero/marzo). (REQ-138)
- Nevera: el boton de la grafica es mas ancho (96 px) con la altura de antes (36 px). (REQ-136)
- Nevera: titulo de la tarjeta mas grande (sin agrandar la tarjeta); toda la tarjeta abre la configuracion del sensor, como las fichas de los sensores de suelo, y al pie queda solo el boton de la grafica, mas grande. (REQ-135)
- Nevera: la humedad pasa a una segunda columna (pequeña) junto a la temperatura y la tarjeta toma el fondo atenuado del color de su estado, como el listado. El mismo diseño sirve para sensores de puerta (abierta/cerrada), corriente, presion y caudal (1 o 2 valores) con sus iconos y estados. Tambien: en el listado y en la nevera la ultima fila de tarjetas ya no se corre a la derecha. (REQ-134)
- Nevera: tarjetas nuevas, con la temperatura grande y en el color de su estado ("Helado", "Adecuado", "Caliente", segun los umbrales del sensor o 0 y 3 °C), luego la humedad (con "Seca/Adecuada/Alta" si tiene umbrales) y al pie bateria, grafica y configuracion. (REQ-133)
- Unidades frio segun el cultivo: la columna "U.Frio" del historial solo aparece si el cultivo del sensor necesita frio y el periodo toca su temporada (p. ej. nogal 1 nov - 28 feb, manzano 1 nov - 15 mar); el acumulado cuenta solo esas fechas, desde el primer dia de la temporada. La ficha del sensor dice "Fuera de temporada" o "No aplica". (REQ-129)
- Historial: la columna "H.Frio" pasa a "U.Frio acum." (unidades frio del modelo Utah) y muestra el acumulado de cada dia en el periodo, que vuelve a 0 el 1 de noviembre; el valor del dia queda en la informacion de la celda. (REQ-128)
- Historial: colores de los datos segun la capacidad de campo (humedad %), la tension (cb: < 10 azul, < 30 verde, < 60 amarillo, 60+ rojo) y los umbrales de temperatura (o 2 y 20 °C); las bandas de la grafica siguen los mismos criterios. (REQ-126)
- Historial: los controles de la grafica (zoom, calendario, exportar datos e imagen) solo se muestran en PC; en el celular quedan el zoom con dos dedos y el arrastre. (REQ-125)
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
- **REQ-156**: Resumen con 6 indicadores ordenados por importancia y certeza: nuevos Consumo de agua (m³/h en curso) y Riesgo de plagas (avisos de 48 h); cada indicador muestra su certeza.
- **REQ-149**: alertas push (Cloud Functions) de humedad relativa en redes de sensores y de neveras/invernaderos (temperatura, humedad, presion, caudal, corriente), cada una con su casilla "avisar". Requiere desplegar las funciones.
- **REQ-147**: redes de sensores: aviso "Sin datos" con `lo` del gateway (notificacion e icono en la ficha); en redes, neveras e invernaderos el icono abre la ventana de notificaciones.
- Sensores: en Agregar y Editar sensor se configuran los limites de todo lo que mide cada sensor: humedad del suelo, temperatura, humedad relativa (tambien en los sensores de suelo), presion, caudal y corriente; en neveras e invernaderos la humedad del SHT2 se trata como humedad relativa. El caudal tenia el minimo y el maximo cruzados. La tarjeta de corriente y la columna H.Relativa del historial usan esos limites. (REQ-145)
- Invernadero: cada sensor puede tener varios cultivos (Ajustes del sensor: "Cultivos del invernadero", con su fase; el primero es el principal). Se ven en la tarjeta del sensor y en "Mis cultivos" del resumen. (REQ-144)
- Neveras e invernaderos: icono de notificacion en la tarjeta del sensor cuando el gateway no recibe sus datos (`lo`
  negativo) y aviso "Sin datos" en Notificaciones con desde cuando no se actualiza. (REQ-142)
- Invernaderos (`type = "Invernadero"`): mismo panel, sensores, logs, graficas y avisos que las neveras; tarjeta
  "Invernadero" en el asistente de alta. (REQ-143)
- Estacionario, Plan de riego \ Programacion: boton "Guardar" en el programa de riego para guardarlo sin iniciarlo (se inicia despues con ▶ en la lista). (REQ-140)
- Historial: columna "Clima" (icono del dia) junto a la fecha en Semana, Mes y Ciclo; los ultimos 7 dias se piden al pronostico porque el archivo historico los publica con retraso (antes la semana salia sin iconos en la grafica). Descripcion del clima en español. (REQ-130)
- Historial de los sensores: boton "Dia" (lecturas de hoy) junto a Semana, Mes y Ciclo; el eje muestra la hora. (REQ-124)
- Ajustes de la red de sensores: "Estacion meteorologica" con selector de region y de estacion
  (`settings.station = { region, id }`) desde el catalogo `assets/data/estaciones.json` (29 estaciones, 6 regiones);
  el servidor (WS v7) usa esa estacion local para completar HR y temperatura. (REQ-121)
- El catalogo de estaciones se lee de Firebase `/stations` (respaldo: `assets/data/estaciones.json`); regla de solo
  lectura con sesion para `stations`. (REQ-122)
- Ficha del sensor ("Cultivo"): "Unidades frio acumuladas" de la temporada (desde el 1 de noviembre) en lugar de
  las unidades de la ultima hora. (REQ-123)
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
