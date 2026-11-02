# REQ-008 - Eliminacion de codigo muerto

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `assets/js/core.js`, `assets/js/logic/estado.js` |
| Pruebas | 38 (las existentes siguen en verde; no hay comportamiento nuevo) |
| Riesgo | Nulo: solo se retira codigo sin referencias |

## 1. Requisitos

| ID | Requisito | Criterio |
|---|---|---|
| REQ-008.1 | Eliminar `cbToPercent_old` (D-05) | 0 referencias tras la eliminacion |
| REQ-008.2 | Cerrar D-11 (rama inalcanzable) | la rama "ahora" debe ser alcanzable y estar probada |

## 2. Evidencia

```
antes:  cbToPercent_old  definida en core.js L3929, 1 referencia (su propia definicion)
despues: 0 referencias en core.js e index.html
core.js: 5.359 -> 5.353 lineas
```

`cbToPercent_old` era la version anterior del calculo de humedad, sustituida por `cbToPercent`
(extraida en REQ-001). Nunca se llamaba: era codigo muerto y una trampa para quien leyera el fichero.

## 3. D-11

La rama "sin `update`" de `getTimeDiference` era inalcanzable por el guard inicial (`return 0`).
**REQ-005 la dejo viva y probada**:

```
estado.js L48  var reloj = typeof ahora === "function" ? ahora() : Date.now();
estado.js L50  var dUpdate = update ? instanteDeFechaDispositivo(update) : reloj;
```

Prueba que la cubre: `REQ-005.2 sin marca de actualizacion compara contra AHORA (reloj inyectado)`.

## 4. Trazabilidad

| Requisito | Verificacion | Estado |
|---|---|---|
| REQ-008.1 | `Select-String cbToPercent_old` -> 0 | PASS |
| REQ-008.2 | prueba `REQ-005.2` | PASS |

## 5. Pendiente

Ningun defecto abierto en la logica pura. Los defectos D-01..D-08, D-10..D-13 quedan cerrados.
