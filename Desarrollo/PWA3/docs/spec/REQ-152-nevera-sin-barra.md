# REQ-152 - Neveras e invernaderos sin la barra de menú

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) |
| Alcance | `components/sistema/panel-nevera/panel-nevera.html`, `index.html` (menú lateral) |
| Pruebas | 1 en `test/unit/nevera.test.js` |
| Compilacion | `26.11.22.028` |

## Pedido

Quitar la barra de menú (Historial, Sensores, Usuarios) de Neveras e Invernaderos.

## Cambio

- El panel de la nevera/invernadero muestra solo las tarjetas de los sensores.
- Historial, Sensores y Usuarios siguen en el menú lateral; ahí la opción dice "Sensores" (antes "Planes") en
  neveras e invernaderos.
