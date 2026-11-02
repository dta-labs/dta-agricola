# Especificaciones (SDD)

| ID | Titulo | Estado | Pruebas |
|---|---|---|---|
| REQ-001 | Logica pura: formulas, fechas, secuencias | Implementado | 17 |
| REQ-004 | Dominio devices: estado y tiempos | Implementado | 8 |
| REQ-005 | Correccion de estado (D-07, D-08, D-10) | Implementado | 8 (+3 navegador) |
| REQ-006 | Dominio riego: programacion de parcelas | **En curso** | - |
| REQ-007 | Correccion de D-01..D-04, D-11 | Pendiente | - |
| REQ-008 | Codigo muerto (D-05, D-06) | Pendiente | - |

**Total actual: 29 pruebas en Node + 11 en navegador, todas en verde.**

## Como se trabaja aqui (TDD + SDD)

1. Se escribe la reclamacion en `docs/spec/REQ-xxx-*.md` con criterios medibles.
2. Se escriben las **pruebas primero** y se comprueba que **fallan** (rojo).
3. Se implementa lo minimo para que pasen (verde).
4. Se anade la fila de trazabilidad y se actualiza el estado.

## Comandos

```powershell
npm test                              # 29 pruebas de logica pura
npm run test:watch                    # modo continuo
# smoke en navegador real:
node test/servir-local.js             # en otra terminal
chrome --headless=new --dump-dom http://127.0.0.1:8090/test/smoke.html
```
