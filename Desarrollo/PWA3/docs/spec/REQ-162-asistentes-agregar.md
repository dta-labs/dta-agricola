# REQ-162 - Asistentes "Agregar equipo" y "Agregar sensor" por pasos, con barra de pasos navegable

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `index.html` (`#modalNuevoEquipo`, `#modalNuevoSensor`), `core.js`, `logic/fechas.js`, `css/ventana.css`, `css/style.css` |
| Pruebas | 3 en `test/unit/asistentes-alta.test.js`; REQ-161 ajustada |
| Compilacion | `26.11.22.038` |

## Agregar equipo (misma interfaz que "Agregar sensor")

1. **Tipo**: tarjetas en 2 columnas (3 en pantallas anchas).
2. **Identificación**: 1ª fila *Nombre del equipo*; 2ª fila *Identificación del equipo* (con lector de QR /
   código de barras / NFC). Riego sectorial y red de sensores: además su *Serie*.
3. **Configuración**: 1ª fila *Compatibilidad*; 2ª fila *Largo del equipo (m)* y *Límite de velocidad (%)*
   (solo pivotes); 3ª fila *Ubicación*: mapa y *Latitud*, *Longitud* y *Zona horaria*.

- Título "Agregar equipo: Pivote central" (nombre del tipo elegido).
- "Agregar equipo" en el último paso; si falta algo muestra "Falta: nombre, identificación" y lleva a ese paso
  (antes no hacía nada si faltaba un dato).
- Zona horaria por defecto la del teléfono, con el formato de las opciones ("-6", "+0"; `fechas.zonaHorariaLocal`).
  Antes era un número: no seleccionaba ninguna opción y UTC+0 contaba como vacío. Se corrigió la opción UTC+10:30
  (tenía el valor de +10) y se agregó UTC+5:30.

## Agregar sensor

1. **Tipo** (tarjetas en 2 columnas). 2. **Identificación** (nombre e identificador con lector).
3. **Ubicación** (punto y área de la parcela; solo redes de sensores: neveras e invernaderos saltan este paso).
4. **Cultivo y alertas**.

- "Agregar sensor" en el último paso; si falta el identificador o la ubicación lo dice y lleva a ese paso.
- El tipo `Tr` decía "Presión": ahora "Temperatura".

## Barra de pasos

En ambos asistentes la barra navega igual que las flechas: clic (o Enter/Espacio) en un paso lo abre. Los pasos
siguientes al tipo están bloqueados (atenuados) hasta elegir el tipo.

## Corrección

En el celular (≤ 600 px) los botones Atrás / Siguiente / Agregar se veían todos a la vez: su `display: inline-flex
!important` (REQ-054) le ganaba a `ng-hide`. Ahora `.boton-icono-movil.ng-hide` se oculta.
