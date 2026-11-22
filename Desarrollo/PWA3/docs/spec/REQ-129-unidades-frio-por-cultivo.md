# REQ-129 - Unidades frio segun la temporada del cultivo

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `assets/js/logic/frio.js` (`temporadaDeCultivo`, `rangoDeTemporada`, `acumuladoPorRegistro`, `acumulado`), `core.js` (historial y ficha del sensor), `index.html` |
| Pruebas | 1 nueva y REQ-128 ajustada en `test/unit/historial-sensores.test.js`; REQ-123 sigue igual |
| Compilacion | `26.11.22.006` |

## Pedido
- Mostrar la columna solo en el rango de fechas adecuado segun el cultivo.
- Calcular el acumulado solo para esas fechas.
- Titulo "U.Frio" (sin "acum.": se entiende que es un acumulado).

## Temporada de frio por cultivo
El frio solo cuenta durante el reposo invernal. Fechas orientativas (hemisferio norte; en el sur, 6 meses despues),
en `frio.js -> CULTIVOS_CON_FRIO`, por nombre del cultivo del sensor (sin acentos, por palabra):

| Grupo | Cultivos | Temporada |
|---|---|---|
| Alto requerimiento | manzano, peral, membrillo, cerezo/guindo, nogal de Castilla | 1 nov – 15 mar |
| Medio o bajo | durazno/nectarina, ciruelo, chabacano, almendro, nogal pecanero (y "nogal"/"nuez"), pistache, vid/uva, kiwi, arandano, frambuesa, zarzamora, higuera, olivo, granado, caqui | 1 nov – 28/29 feb |
| Sin frio | el resto (hortalizas, granos, citricos...) y sensores sin cultivo | no se muestran |

## Historial
- La columna **U.Frio** aparece solo si el cultivo del sensor necesita frio **y** el periodo mostrado (Semana, Mes,
  Ciclo) tiene algun dia dentro de la temporada. Los dias fuera de la temporada muestran "—".
- El acumulado de cada dia empieza el **primer dia de la temporada**: si el periodo empieza despues (p. ej. la semana
  del 16 al 22 nov), se leen de `/logs` los dias anteriores de la temporada (una vez por periodo y sensor) y se suman.
  Antes (REQ-128) empezaba en el primer dia mostrado y seguia todo el año.

## Ficha del sensor (opcion "Cultivo", REQ-123)
- Muestra la temporada del cultivo junto al titulo ("1 nov – 28 feb") en lugar de "desde el 1 nov".
- Fuera de la temporada: "Fuera de temporada". Cultivo sin necesidad de frio: "No aplica". Sin cultivo: "--".

## Limitaciones
- Las fechas son orientativas y fijas por grupo; si hace falta, se pueden hacer configurables por red o por cultivo.
- Los resumenes diarios anteriores al 2026-11-21 se calcularon con el metodo anterior (REQ-123): siguen sumando tal cual.
