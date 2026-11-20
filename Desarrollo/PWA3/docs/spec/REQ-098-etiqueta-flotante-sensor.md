# REQ-098 - Mapa de la red de sensores: temperatura y humedad flotando sobre cada sensor

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `core.js` (`etiquetaFlotanteDeSensor`, `ponerEtiquetaFlotante`, en `dibujarAreasDeSensores`), `style.css` |
| Pruebas | 418/418 en Node (1 nueva; REQ-066/073 ajustadas) |
| Compilacion | `26.11.20.001` |

Pedido: sobre el icono del sensor, la temperatura y la etiqueta de humedad, flotando, siempre visibles, sin que se
note un fondo y resaltando con independencia del fondo.

- Dos lineas encima del marcador: **temperatura** (unidad del sistema, 15 px) y **etiqueta de humedad** (12 px), con la
  misma regla que las fichas (tensiometro: 6 zonas de REQ-070; sensores en %: sus umbrales; "Sin lectura").
- **Sin recuadro** (fondo, borde, sombra de caja y flecha fuera). Texto blanco con **contorno oscuro** (text-shadow en
  4 direcciones + halo) y **sombra paralela** (`drop-shadow`): parece flotar y se lee sobre satelite claro u oscuro y
  sobre parcelas rojas, verdes o azules.
- Siempre visible (`permanent`), sin capturar el toque: tocar el sensor sigue abriendo "Editar sensor" (REQ-067).
- Se actualiza con cada lectura, solo si cambia el texto.

Relacion con REQ-066: alli se quitaron las tarjetas fijas porque su recuadro tapaba el mapa; esta etiqueta no tiene
recuadro.

Nota: numerado primero como REQ-097 por error (ese numero ya era de la WiFi del gateway); renumerado el 2026-11-20.
