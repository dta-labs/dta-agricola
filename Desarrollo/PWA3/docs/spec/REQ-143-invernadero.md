# REQ-143 - Invernadero con el panel de la nevera

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) |
| Alcance | `assets/js/logic/nevera.js` (`esTipoNevera`), `core.js`, `index.html`, `logic/equipos.js`, `logic/panel.js`, `logic/resumen.js`, `logic/tablero.js` |
| Pruebas | 4 en `test/unit/invernadero.test.js` |
| Compilacion | `26.11.22.020` |

Los equipos `type = "Invernadero"` funcionan igual que `"Nevera"`: mismo panel (`<dta-panel-nevera>`), tipos de
sensor (SHT2, Irms, Contact...), lecturas en `logs` (sin `dayLogs`), 300 registros iniciales, historial "Dia",
graficas con escala dinamica y bandas de umbral, ajustes de sensores, aviso de sensor sin datos (REQ-142) y resumen.

- `DTALogic.nevera.esTipoNevera(tipo)`: true para "Nevera" e "Invernadero"; en las vistas `esTipoNevera(actualSystem.type)`.
- Listado: icono `local_florist`; nombre "Invernadero"; icono de tablero `fa-leaf`; estado "Invernadero" (tono de la nevera).
- Asistente de alta: tarjeta "Invernadero" (operationMode 5, igual que la nevera).
- Los umbrales de temperatura por defecto del SHT2 siguen siendo los de la nevera (0 y 3 °C); en un invernadero hay
  que fijar `t.min/max` del sensor en Ajustes para que el estado (Helado / Adecuado / Caliente) tenga sentido.
