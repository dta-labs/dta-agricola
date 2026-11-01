# Especificaciones (SDD)

Cada reclamacion vive en su fichero y declara: requisitos, criterios de aceptacion, trazabilidad a
pruebas, defectos conocidos y decisiones de diseno.

| ID | Titulo | Estado | Pruebas |
|---|---|---|---|
| REQ-001 | Logica pura: formulas, fechas, secuencias | Implementado | 17 (PASS) |
| REQ-004 | Dominio devices | Pendiente | - |
| REQ-005 | Riego y planes | Pendiente | - |
| REQ-006 | Notificaciones | Pendiente | - |
| REQ-007 | Correccion de defectos D-01..D-06 | Pendiente | - |

## Como se trabaja aqui (TDD + SDD)

1. Se escribe la reclamacion en `docs/spec/REQ-xxx-*.md` con criterios de aceptacion medibles.
2. Se escriben las **pruebas primero** (fallan: rojo).
3. Se implementa lo minimo para que pasen (verde).
4. Se anade la fila a la tabla de trazabilidad y se actualiza el estado.

## Comandos

```powershell
npm test            # suite de logica pura
npm run test:watch  # modo continuo
```
