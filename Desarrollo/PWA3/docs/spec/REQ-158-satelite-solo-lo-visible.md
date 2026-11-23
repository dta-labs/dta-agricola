# REQ-158 - Vista satelital: solo las imágenes de lo que se ve en el mapa

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `logic/satelite.js` (`cajaDeArea`, `areasEnVista`, `MAXIMO_POR_VISTA`), `core.js` (NDVI) |
| Pruebas | 1 en `test/unit/satelite-cache-compartir.test.js` |
| Compilacion | `26.11.22.034` |

## Problema

REQ-157 pedía la imagen de **todas** las áreas del usuario al activar Satélite: con 169 parcelas se pedían 169
imágenes aunque en el mapa se vieran 5. Cada imagen consume créditos del servicio.

## Comportamiento

- Se piden solo las áreas (pivotes y parcelas de cualquier equipo) cuyo rectángulo **toca la vista actual del mapa**.
- Al mover o acercar el mapa (`moveend`) se piden solo las que **entran** en la vista y aún no se habían pedido.
- Si en la vista hay más de **25** áreas nuevas (mapa muy alejado), no se piden: "Acerca el mapa para ver la imagen
  satelital (N parcelas a la vista)".
- Cada imagen sigue la copia local de REQ-157: si está guardada se muestra sin descargar; como mucho cada 12 h se
  consulta si hay una imagen más reciente y **solo entonces** se descarga y se guarda la nueva.
- El contador "Cargando imágenes satelitales x de N" cuenta solo las pedidas.
