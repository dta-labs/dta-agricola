# REQ-145 - Limites configurables de cada parametro del sensor

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `index.html` (Agregar y Editar sensor), `ventana.css`, `logic/nevera.js`, `logic/historial.js` |
| Pruebas | 2 en `test/unit/limites-sensores.test.js`; REQ-054 ajustada |
| Compilacion | `26.11.22.022` |

## Pedido
Los limites de temperatura y/o humedad, o de cualquier otro parametro que mida un sensor, deben poder configurarse en
su ventana de configuracion (redes de sensores, neveras e invernaderos).

## Limites por tipo de sensor (Agregar y Editar sensor)
Cada parametro tiene su bloque (REQ-054): casilla "avisar" y los dos limites con su accion y su ayuda.

| Tipo | Parametros | Campo |
|---|---|---|
| Ms, SHT4 | humedad del suelo (%), temperatura, **humedad relativa** (%) | `h`, `t`, `hr` |
| WM (tensiometro) | humedad del suelo (cb, al reves), temperatura, **humedad relativa** | `h`, `t`, `hr` |
| Tr | temperatura | `t` |
| SHT2 (neveras e invernaderos) | temperatura ("Minima" / "Maxima"), humedad relativa ("Humedad baja" / "Humedad alta") | `t`, `h` |
| Psi | presion (psi) | `psi` |
| Fl | caudal (L/min) | `fl` |
| Irms | **corriente** (A) | `i` |

Cambios respecto a antes:
- Nuevos: humedad relativa de los sensores de suelo (`hr`) y corriente (`i`). Temperatura del Ms en Editar sensor.
- En el SHT2 la humedad ya no dice "Regar / No regar" (es humedad del ambiente de la camara).
- Presion y caudal con el mismo diseño que el resto. **Caudal**: los campos "Min" y "Max" estaban cruzados (Min
  escribia `fl.maxValue`).
- La temperatura se sigue escribiendo en la unidad del sistema y se guarda en °C (REQ-066).

## Donde se usan
- Tarjeta de la nevera/invernadero (REQ-133/134): temperatura (`t`), humedad (`h`), presion (`psi`), caudal (`fl`) y
  ahora corriente (`i`: Corriente baja / Normal / Corriente alta; sin limites, Encendido / Apagado como antes).
- Historial (REQ-126): la columna H.Relativa toma color con `hr` (baja ambar, normal verde, alta azul).
- Las alertas del servidor (Cloud Functions) siguen usando `h` y `t`; `hr`, `psi`, `fl` e `i` quedan guardados para
  cuando el servidor los use.

## Sin limites
El sensor de contacto (puerta) no tiene un valor con limites (abierta/cerrada).
