# REQ-093 - Graficas del historial de sensores: clima, datos al tocar, zoom, CSV e imagen

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-13) - probar: usuario |
| Alcance | `logic/grafica.js` (nuevo), `core.js` (opciones de Chart.js y barra de herramientas), `index.html` (CSP), `style.css` |
| Pruebas | 410/410 en Node (6 nuevas en `grafica.test.js`) |
| Compilacion | `26.11.13.001` |

Graficas de agua disponible / humedad del suelo, humedad relativa y temperatura (Chart.js 4.4.2 + chartjs-plugin-zoom 2.2.0).

| Pedido | Estado previo | Ahora |
|---|---|---|
| Iconos del clima de cada dia arriba | Ya existian (Open-Meteo historico + plugin), pero **la CSP bloqueaba `archive-api.open-meteo.com`**: solo salia el icono de hoy | CSP corregida (`connect-src`) |
| Iconos sin solaparse | El plugin ya los separa (28 px + 6 px; si no caben se omiten) | Igual; al hacer zoom aparecen los dias que no cabian |
| Datos al tocar | Solo al acertar el punto exacto | `interaction: index, intersect: false`: en cualquier punto se ven todas las series; titulo con la **fecha completa** del registro (las etiquetas del eje se acortan) |
| Zoom y desplazarse hasta una fecha | Rueda/pellizco/arrastre configurados, sin botones | Barra: **acercar, alejar, ver todo, ir a una fecha** (calendario nativo con el rango de la grafica; ventana centrada en ese dia). Limites: sin salirse de los datos, minimo 3 puntos |
| Exportar datos | — | **CSV**: Fecha (AAAA-MM-DD HH:MM, hora del equipo) + una columna por serie; UTF-8 con BOM (Excel); nombre `red-sensor-tipo-AAAAMMDD.csv` |
| Guardar imagen | — | **PNG** con fondo blanco. Si los iconos del clima (otro dominio) impiden exportar el lienzo, se guarda sin ellos y se avisa |

Notas: los valores del CSV son los de la grafica (en tensiometros, el % de agua disponible). La barra se crea una vez
por grafica (encima del lienzo) y actua sobre la grafica vigente (`Chart.getChart`).

REQ-094 (2026-11-13): la barra de controles es solo para las ventanas de graficas (historial y la grafica del sensor);
en la ficha de la parcela del mapa no se muestra (no cabe): alli quedan el zoom manual y los iconos del clima.
Compilacion `26.11.13.002`.

## REQ-095 (2026-11-13): no se podia exportar la imagen

Causa: los iconos del clima vienen de otro dominio (`openweathermap.org`); al dibujarlos, el navegador marca el lienzo
como contaminado y prohibe exportarlo. La alternativa (quitar los iconos y redibujar) tampoco servia: un lienzo
contaminado no se limpia al redibujarlo.

Correccion: la imagen se genera desde una **copia de la grafica en un lienzo nuevo** (misma vista y zoom, a doble
resolucion, sin cuadro de datos), con los iconos del clima pedidos con **CORS**: si el servidor lo permite salen en la
imagen; si no, la imagen sale sin ellos y se avisa. La grafica en pantalla no cambia. Compilacion `26.11.13.003`.
