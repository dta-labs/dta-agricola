# Especificaciones (SDD)

| ID | Titulo | Estado | Pruebas |
|---|---|---|---|
| REQ-001 | Logica pura: formulas, fechas, secuencias | Implementado | 17 |
| REQ-004 | Dominio devices: estado y tiempos | Implementado | 8 |
| REQ-005 | Correccion de estado (D-07, D-08, D-10) | Implementado | 8 |
| REQ-006 | Dominio riego: programacion de parcelas | Implementado | 8 |
| REQ-007 | Correccion de la logica pura (D-01..D-04, D-06, D-13) | Implementado | 9 |
| REQ-008 | Codigo muerto (D-05, D-11) | Pendiente | - |

**Total: 38 pruebas en Node + 14 en navegador, todas en verde.**

## Modulos de logica

```
assets/js/logic/formulas.js     mapping, constraining, cbToPercent
assets/js/logic/fechas.js       parseFechaHora2, parseFechaHora, menorIgual
assets/js/logic/secuencias.js   generarSecuenciaParcelas
assets/js/logic/estado.js       instanteDeFechaDispositivo, getTimeDiference, calcStatusTime
assets/js/logic/ids.js          generarIdUnico
assets/js/logic/riego.js        programar
```

## Defectos

| Estado | IDs |
|---|---|
| Corregidos | D-01, D-02, D-03, D-04, D-06, D-07, D-08, D-10, D-12, D-13 |
| Pendientes | D-05 (`cbToPercent_old`), D-11 (rama muerta) |

## Como se trabaja aqui (TDD + SDD)

1. La reclamacion se escribe en `docs/spec/REQ-xxx-*.md` con criterios medibles.
2. **Pruebas primero**, comprobando que fallan (rojo).
3. Implementacion minima (verde).
4. Fila de trazabilidad y estado actualizado.

## Comandos

```powershell
npm test                              # 38 pruebas de logica pura
npm run test:watch                    # modo continuo
node test/servir-local.js             # servidor en 8090
chrome --headless=new --dump-dom http://127.0.0.1:8090/test/smoke.html   # 14 en navegador
```
