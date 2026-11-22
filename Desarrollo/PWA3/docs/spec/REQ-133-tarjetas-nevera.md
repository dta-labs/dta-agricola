# REQ-133 - Tarjetas de la nevera

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `assets/js/logic/nevera.js` (nuevo), `components/sistema/panel-nevera/` (plantilla y controlador), `paneles.css` |
| Pruebas | 3 en `test/unit/nevera.test.js`; REQ-057 ajustada |
| Compilacion | `26.11.22.010` |

## Pedido
- Las tarjetas se veian poco profesionales: lo mas importante es la temperatura y luego la humedad.
- Informacion simple del estado del sensor: Helado, Adecuado, Caliente.

## Diseño
Tarjeta solida blanca (como el listado de equipos) con liston izquierdo del color del estado:
1. **Cabecera**: nombre del sensor y etiqueta del estado (Helado azul, Adecuado verde, Caliente rojo, Sin lectura gris).
2. **Temperatura**: grande (3.4 rem) y del color del estado, con su unidad (°C o °F segun el sistema) y debajo el rango
   que se usa ("Rango 0 a 4 °C", o "(por defecto)").
3. **Humedad relativa**: en una franja gris, mas pequeña; si el sensor tiene umbrales de humedad, "Seca", "Adecuada" o
   "Alta".
4. **Pie**: bateria y botones de grafica y configuracion.

## Reglas (`DTALogic.nevera.tarjeta`)
- Lecturas: 3 valores por sensor (`[hr, t, vcc]`), tomados por la **clave** del sensor (S0, S1...); antes por el orden
  de la lista (`$index`), que podia no coincidir si faltaba algun sensor.
- Temperatura: `t.minValue` / `t.maxValue`; sin umbrales validos, **0 y 3 °C** (las mismas franjas de la grafica de la
  nevera). Menor que el minimo: Helado; mayor que el maximo: Caliente; entre ambos (incluidos): Adecuado.
- Humedad: `h.minValue` / `h.maxValue` si existen.
- El controlador guarda en cache los datos de cada tarjeta mientras no cambien las lecturas ni el sensor.
