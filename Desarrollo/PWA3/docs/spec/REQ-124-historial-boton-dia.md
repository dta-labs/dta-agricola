# REQ-124 - Historial de sensores: boton "Dia"

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `index.html` (modal Historial), `core.js` (etiquetas del eje) |
| Pruebas | 1 en `test/unit/historial-sensores.test.js` |
| Compilacion | `26.11.22.001` |

## Pedido
En el historial de los sensores solo habia Semana, Mes y Ciclo: agregar el boton de datos del dia.

## Solucion
- El boton "Dia" (antes solo para neveras) aparece tambien en las redes de sensores. Carga las lecturas de hoy de
  `dayLogs` (`equipos.carpetaDeHistorico`, ya existente), hasta 300.
- Con "Dia", el eje de la grafica muestra la hora legible ("14:30") en lugar del texto crudo ("0230pm"); en los demas
  periodos, el dia ("22/11"). La tabla ya mostraba la hora y la bateria en lugar de las unidades frio.
