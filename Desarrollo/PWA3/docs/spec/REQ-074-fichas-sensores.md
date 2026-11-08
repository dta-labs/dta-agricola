# REQ-074 - Fichas de sensores con el formato del listado

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-07) - probar: usuario |
| Alcance | `components/sistema/panel-sensores/`, `paneles.css`, `logic/humedad.js` (`valoresDeSensor`, `datosCrudos`), `index.html` (`clima` al panel) |
| Pruebas | 379/379 en Node (2 nuevas; sustituyen a las de REQ-066) |
| Compilacion | `26.11.07.020` |

Problema (captura): las tarjetas de REQ-066 tenian toda la informacion, pero el estado de la medicion no se veia
a la primera (franja de color estrecha y etiqueta pequeña), sobre todo en el movil.

## Ficha (como la del listado de equipos)

| Zona | Contenido |
|---|---|
| Izquierda | Lectura de humedad del suelo grande (`32`) con su unidad (`cb` / `%`) |
| Titulo / subtitulo | Nombre del sensor / nombre de la red |
| Principal | Etiqueta de la zona: "Humedad adecuada", "Estres moderado"... (REQ-070); "Sin lectura" si no hay dato |
| Fila | Temperatura y humedad relativa |
| Pie | Bateria y boton "Grafica" |
| Derecha | Icono del clima de la red (`meteo[actualSystem.key].weather.iconUrl`) |

- **Toda la ficha abre la configuracion** del sensor (clic, Enter o espacio); el boton de engrane se elimina.
  "Grafica" detiene la propagacion para no abrir tambien la configuracion.
- **Fondo en degradado segun el nivel de humedad**: saturado azul, muy humedo turquesa, adecuada verde, estres
  naranja, seco rojo, fuera de rango gris, sin lectura gris azulado. Tensiometro: 6 zonas (REQ-070); sensores en %:
  sus umbrales.
- Rejilla de fichas de 300 px como minimo (una columna en el movil).
- Los valores crudos se leen de `log.dataRaw` una sola vez por actualizacion (cache en el componente).
