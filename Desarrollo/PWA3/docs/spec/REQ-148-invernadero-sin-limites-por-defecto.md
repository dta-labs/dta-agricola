# REQ-148 - Invernadero: sin rango de temperatura por defecto

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) |
| Alcance | `assets/js/logic/nevera.js`, `components/sistema/panel-nevera/panel-nevera.component.js` |
| Pruebas | 2 en `test/unit/nevera.test.js` |
| Compilacion | `26.11.22.024` |

## Decision del usuario

Los limites de un invernadero son los que el usuario define al crear (o editar) el sensor. No hay rango implicito.

## Comportamiento

- `nevera.tarjeta(sensor, datos, indice, unidad, { tipoSistema })`: el panel pasa el `type` del sistema.
- **Nevera** sin limites de temperatura: sigue usando 0 a 3 °C y lo indica ("Rango 0 a 3 °C (por defecto)").
- **Invernadero** sin limites: estado neutro **"Sin límites"** (icono `tune`, tono inactivo, gris) y el texto
  "Define los límites en la configuración" en lugar del rango. La lectura se muestra igual.
- Invernadero con limites: Helado / Adecuado / Caliente segun esos limites, como en las neveras.
- La cache de tarjetas se invalida si cambia el tipo del sistema o los limites de corriente (`sensor.i`).
