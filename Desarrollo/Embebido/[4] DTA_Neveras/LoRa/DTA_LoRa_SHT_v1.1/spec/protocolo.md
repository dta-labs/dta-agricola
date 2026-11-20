# Protocolo de comunicación

## Radio

| Parámetro | Valor |
|---|---|
| Frecuencia | 915 MHz (`FREQUENCY`) |
| Ancho de banda | 125 kHz |
| Factor de propagación | SF9 |
| Tasa de codificación | 4/5 |
| Potencia de transmisión | 20 dBm |

Nodo y gateway deben usar los mismos parámetros.

## Identificador del nodo

`DTA-SHT-0x<serie>`, donde `<serie>` es el número de serie de 32 bits del SHT4x en
hexadecimal mayúsculas, sin ceros a la izquierda. Ejemplo: `DTA-SHT-0xF46A367`.

- El número de serie se guarda en EEPROM para conservar el Id aunque el sensor falle.
- Si nunca se ha leído el número de serie, el nodo no transmite.
- Al reemplazar el sensor, el ID cambia al del sensor nuevo (D-013). Si el sensor nuevo falla al arrancar, el nodo usa el último ID guardado y reporta `Hr = -1`.

## Trama de datos (nodo → gateway)

```
DTA-SHT-0xId,d,TTL,Hr,T,Vcc,CS
```

| Campo | Formato | Ejemplo | Notas |
|---|---|---|---|
| Encabezado | `DTA-SHT-0x` + Id | `DTA-SHT-0xF46A367` | |
| Tipo | `d` | `d` | Dato |
| TTL | entero | `5` | Constante `TTL` |
| Hr | entero, 0 decimales | `55` | `-1` = sensor en falla |
| T | 1 decimal | `23.4` | `0.0` cuando Hr = `-1` |
| Vcc | 1 decimal | `3.3` | Voltaje de alimentación (V). `updateNeveraDB.php` exige exactamente 1 decimal |
| CS | entero | `2027` | Checksum |

## Trama de confirmación (gateway → nodo)

```
DTA-SHT-0xId,a,TTL,Frec,CS
```

- El encabezado es el mismo que envió el nodo.
- `Frec`: minutos entre lecturas que el gateway sugiere (`modo del gateway / 2`, mínimo 1).
- El nodo la acepta solo si el encabezado coincide con el suyo y el checksum es válido.

## Checksum

Suma de los códigos ASCII de todos los caracteres de la trama hasta la última coma
(incluida), expresada en decimal. **Se mantiene sin cambios** (ver decisiones.md, D-001).

## Validaciones del gateway (referencia)

El gateway descarta la trama si:

- No empieza con `DTA-` o contiene `0x0`.
- Tiene menos de 7 campos.
- Tipo distinto de `a` o `d`.
- TTL fuera de 0–5.
- Hr fuera de −1–100.
- T fuera de −25.0–75.0 °C (tramas `SHT`).
- Vcc fuera de 2.0–6.0 V.
- El checksum no coincide.

## Códigos de error

| Situación | Hr | T |
|---|---|---|
| Sensor en falla o lectura fuera de rango | `-1` | `0.0` |
