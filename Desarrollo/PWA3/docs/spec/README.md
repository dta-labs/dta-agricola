# Especificaciones (SDD)

| ID | Titulo | Estado | Pruebas |
|---|---|---|---|
| REQ-001 | Logica pura: formulas, fechas, secuencias | Implementado | 17 |
| REQ-004 | Dominio devices: estado y tiempos | Implementado | 8 |
| REQ-005 | Correccion de estado (D-07, D-08, D-10) | Implementado | 8 (+3 navegador) |
| REQ-006 | Dominio riego: programacion de parcelas | Implementado | 8 (+3 navegador) |
| REQ-007 | Correccion de D-01..D-04, D-11, D-13 | Pendiente | - |
| REQ-008 | Codigo muerto (D-05, D-06) | Pendiente | - |

**Total: 37 pruebas en Node + 14 en navegador, todas en verde.**

## Modulos de logica

```
assets/js/logic/formulas.js     mapping, constraining, cbToPercent
assets/js/logic/fechas.js       parseFechaHora2, parseFechaHora, menorIgual
assets/js/logic/secuencias.js   generarSecuenciaParcelas
assets/js/logic/estado.js       instanteDeFechaDispositivo, getTimeDiference, calcStatusTime
assets/js/logic/ids.js          generarIdUnico
assets/js/logic/riego.js        programar
```

## Como se trabaja aqui (TDD + SDD)

1. Se escribe la reclamacion en `docs/spec/REQ-xxx-*.md` con criterios medibles.
2. Se escriben las **pruebas primero** y se comprueba que **fallan** (rojo).
3. Se implementa lo minimo para que pasen (verde).
4. Se anade la fila de trazabilidad y se actualiza el estado.

## Comandos

```powershell
npm test                              # 37 pruebas de logica pura
npm run test:watch                    # modo continuo
node test/servir-local.js             # servidor en 8090
chrome --headless=new --dump-dom http://127.0.0.1:8090/test/smoke.html   # 14 en navegador
```
