# REQ-068 - Ficha del sensor: medidores de humedad y temperatura

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-07) - probar: usuario |
| Alcance | `logic/medidor.js` (nuevo), `core.js -> getSensorText` (Suelo y Clima), `style.css` |
| Pruebas | 368/368 en Node (5 nuevas en `medidor.test.js`) |
| Compilacion | `26.11.07.014` |

## 1. Que fallaba (capturas del usuario)

- La barra de humedad usaba el valor crudo como ancho: con **245** (cb) la barra media 245 % y **desbordaba la ficha**.
- Los umbrales se colocaban con margenes aproximados (`max - min - 20 %`): no caian en su lugar.
- La temperatura mostraba "8/46" (°C y °F mezclados) y su barra tampoco tenia escala.

## 2. Medidores

| Medidor | Escala (izquierda -> derecha) | Degradado |
|---|---|---|
| Humedad del suelo | 0 % (seco) .. 100 % (saturado). **Tensiometro WM**: 240 cb = 0 %, 0 cb = 100 % (acotado). Sensores en %: el valor ya es 0..100 | rojo - amarillo - verde - turquesa - azul |
| Temperatura | -50 °C .. +125 °C (acotado) | azul - turquesa - amarillo - naranja - rojo |

- **Umbrales** (`h.minValue/maxValue`, `t.minValue/maxValue`): raya oscura sobre la barra con su valor debajo, en
  su posicion real (para WM, convertidos a la misma escala; temperatura en la unidad del sistema; los umbrales se
  guardan en °C, REQ-066).
- **Medicion**: triangulo sobre la barra con una raya fina que la cruza. Sin lectura, no hay triangulo.
- **Valor** a la derecha en rojo si esta fuera de los umbrales y en verde si esta dentro; en WM se anade el % de
  la escala ("245 cb" / "0 %"). Temperatura solo en la unidad del sistema ("46 °F" u "8 °C").

La escala inversa solo se aplica al WM (centibares): los sensores en % ya miden 0..100, igual que distingue el
resto de la app (`logic/humedad.js`). Asi la barra tiene siempre el mismo sentido: izquierda seco, derecha saturado.

## 3. Barras mas grandes (REQ-069, 2026-11-07)

Pedido: barras mas grandes, que lleguen a verse por debajo del valor de la medicion. Titulo y valor en una
fila; la barra en la fila siguiente, de todo el ancho de la tarjeta (`col s10 offset-s2`, debajo del valor).
Barra de 14 px (antes 8), rayas de umbral de 3x20 px, valores de umbral mas legibles y triangulo de 16 px.
Compilacion `26.11.07.015`.
