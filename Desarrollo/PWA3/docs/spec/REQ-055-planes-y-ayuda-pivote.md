# REQ-055 - Movil: borde de los planes y ayuda del pivote

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `index.html` (`#modalRiego` "Nuevo plan", `#modalEditRiego` "Planificacion"), `style.css` |
| Pruebas | 316/316 en Node (2 nuevas) |

## 1. Planes de pago

Cada tarjeta tenia borde transparente (solo el plan actual, verde oscuro): en el movil, apiladas, no se
distinguian. Ahora todas llevan borde verde claro `#c8e6c9` y esquinas de 12 px; el plan actual sigue con
`#2e7d32`. Separacion de 14 px entre tarjetas en el movil. (Se aplica tambien en escritorio: no
cambia la lectura y mantiene un solo estilo.)

## 2. Ayuda (?) de los pivotes

En "Nuevo plan" y "Planificacion" el boton que abre la tabla de configuraciones del pivote
(`#systemConfigModal`) era una columna propia `col s4 m2` tras "Velocidad/Volumen"; en el movil se
encimaba con los demas controles. Ahora es un icono **dentro del campo**, a la derecha
(`.campo-con-ayuda`), y "Activar pistola" y "Velocidad/Volumen" ocupan media fila cada uno
(`s6 m6`). Se conserva lo que hacia cada boton (en "Planificacion", `showSystemTable(actualSystem.brand)`).
`style.css?v=26.11.06.005`.
