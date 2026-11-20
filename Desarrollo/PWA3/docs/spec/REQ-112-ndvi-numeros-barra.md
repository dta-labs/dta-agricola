# REQ-112 - NDVI con la paleta de los servicios satelitales, numero de cada parcela y barra verde del listado

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `logic/satelite.js`, `core.js`, `index.html`, `style.css` |
| Pruebas | 458/458 en Node (2 nuevas; REQ-089/092/110 ajustadas) |
| Compilacion | `26.11.20.013` |

## Vista satelital "en un amarillo muy raro"
El render "NDVI Colormap" de Esri usa una escala propia cafe -> amarillo -> verde: la vegetacion media sale amarilla.
Los servicios satelitales agricolas (EO Browser, Sentinel Hub, DTA-AgroSat) usan **rojo -> amarillo -> verde**.
Ahora la imagen se pide con una regla propia: funcion **NDVI** (B4 roja, B8 infrarroja; salida (NDVI+1)*100) ->
**Remap** en tramos de 0.05 (de -0.2 a 1; por debajo un solo tramo gris) -> **Colormap** con la paleta (11 puntos
interpolados). URL ~1.7 KB. **Respaldo**: si la imagen falla, se vuelve a pedir con el render de Esri. Leyenda con la
nueva escala. El estado de la parcela encima baja a 0.12 de opacidad para no teñir los colores.

No se pudo probar contra el servicio desde el entorno de desarrollo (sin acceso de red): probar en el navegador.

## Numero de cada parcela
En el mapa del estacionario, cada parcela muestra su numero (1..7) en su centro (circulo oscuro con borde blanco); no
captura el toque (la parcela sigue abriendo "Editar parcela").

## Barra superior del listado
Verde oscuro (degradado `#12392a` -> `#1b4d38`); en los sistemas sigue la barra oscura con la franja del estado.

REQ-113 (2026-11-20): la cabecera de los sistemas usa el mismo verde oscuro que la del listado (se mantiene la franja
inferior del color del estado). Compilacion `26.11.20.014`.
