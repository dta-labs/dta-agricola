# REQ-159 - Vista satelital: consultar si hay imagen más reciente solo cuando el usuario la pide

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) |
| Alcance | `logic/satelite.js` (`decision`), `services/cache-satelite.js`, `core.js` (NDVI) |
| Pruebas | 2 ajustadas en `test/unit/satelite-cache-compartir.test.js` y 1 en `satelite.test.js` |
| Compilacion | `26.11.22.035` |

Antes (REQ-157) la consulta al catálogo se hacía como mucho cada 12 h por área. Ahora:

- **Activar "Satélite" o "Reintentar"** (lo pide el usuario): para cada área visible con copia guardada se muestra la
  copia y se consulta si hay una imagen más reciente; solo si la hay se descarga y se guarda.
- **Mover o acercar el mapa**: las áreas que entran a la vista usan su copia guardada sin consultar; si no tienen
  copia se descargan (una sola vez) y se guardan.
- Se elimina el plazo de 12 h.
