# REQ-063 - Estacionario: botones inferiores 1-7 y M (motor)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-07) - probar: usuario |
| Alcance | `components/sistema/panel-estacionario/`, `paneles.css` |
| Pruebas | 354/354 en Node (1 nueva) |
| Compilacion | `26.11.07.009` |

Pedido: eliminar el boton con la imagen del motor y dejar solo los numeros 1 a 7 (parcelas) y la "M",
que ahora representa al motor.

- Sale la imagen `pozo.png` (accion: regar/detener `p7`).
- La "M" conserva la misma accion (`p7`) y **toma el color del estado del motor** (antes solo la imagen lo
  mostraba, con borde y fondo de ese color); `role="button"`, `aria-label="Motor"`, cursor de mano.
- Los numeros siguen saliendo de las parcelas existentes (`p0`..`p6`), sin cambios.
- Sale la clase `panel-s-e36` (solo la usaba la imagen).
