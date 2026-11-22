# REQ-134 - Tarjeta de la nevera para todos los tipos de sensor

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `logic/nevera.js`, `components/sistema/panel-nevera/`, `paneles.css`, `style.css` (listado) |
| Pruebas | `test/unit/nevera.test.js` (4; REQ-133 reescritas para la nueva forma) y REQ-057 ajustada |
| Compilacion | `26.11.22.011` |

## Pedido (sobre REQ-133)
- La humedad relativa en una segunda columna, en tamaño pequeño.
- Fondo del color atenuado del estado, como en el listado.
- El mismo diseño para otros tipos de sensor cambiando la iconografia: apertura de puertas (1 valor), corriente
  (1 o 2), presion de agua (1 o 2), caudal (1 o 2).

## Diseño
Cabecera (nombre + etiqueta de estado) · cuerpo en dos columnas: **valor principal** grande (icono del tipo, numero,
unidad y debajo el rango o el nombre de la medida) y, si el tipo lo tiene y llega el dato, **valor secundario** pequeño
(icono, valor, unidad y etiqueta) separado por una linea · pie (bateria, grafica, configuracion). El fondo y el liston
toman el **tono** del estado:

| Tono | Color | Ejemplos |
|---|---|---|
| frio | azul | Helado |
| ok | verde | Adecuado, Cerrada, Encendido, Normal, Con presion, Fluyendo |
| atencion | ambar | Abierta, Presion alta, Caudal alto |
| alerta | rojo | Caliente, Presion baja, Caudal bajo |
| inactivo | gris | Apagado, Sin presion, Sin flujo, Sin lectura |

## Tipos (`DTALogic.nevera`, 3 valores por sensor `[v0, v1, vcc]`)
| Tipo | Principal | Secundario | Estado |
|---|---|---|---|
| SHT2 (o sin tipo) | Temperatura (v1) | Humedad % (v0), "Seca/Adecuada/Alta" con umbrales `h` | Helado / Adecuado / Caliente (`t`; 0 y 3 °C) |
| Contact | Puerta: v0 >= 0.5 abierta | - | Abierta / Cerrada |
| Irms | Corriente A (v0) | Corriente 2 A (v1) | Encendido (>= 0.2 A) / Apagado |
| Psi | Presion psi (v0) | Presion 2 psi (v1) | Baja / Normal / Alta (`psi`); sin umbrales: Con / Sin presion (0.5 psi) |
| Fl | Caudal L/min (v0) | Caudal 2 L/min (v1) | Bajo / Normal / Alto (`fl`, en cualquier orden); sin umbrales: Fluyendo / Sin flujo |

El valor secundario solo aparece si llega (no "NaN"): asi un sensor de corriente, presion o caudal puede tener 1 o 2.

## Supuestos a confirmar con el firmware
- Puerta: 1 = abierta, 0 = cerrada.
- Corriente, presion y caudal: el segundo valor es un segundo canal de la misma medida (misma unidad).
- Unidad del caudal: L/min. Umbral de "encendido" de la corriente: 0.2 A.

## Tambien
- Tarjetas de la misma altura por fila (fila flexible). Materialize da `margin-left: auto` a las columnas: dentro de
  una fila flexible empujaba la ultima fila a la derecha, tambien en el **listado de equipos** (REQ-116); corregido en
  ambos.
