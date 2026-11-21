# REQ-118 - Resumen: "alertas" en lugar de "cosas"

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) |
| Alcance | `logic/tablero.js` |
| Pruebas | 471/471 en Node (REQ-114 ajustada) |
| Compilacion | `26.11.20.019` |

El semaforo del resumen (REQ-114) decia "22 cosas requieren tu atencion". Ahora, con un registro mas formal:
"1 alerta requiere tu atencion" / "N alertas requieren tu atencion" (equipos en emergencia o atencion y la helada
prevista son todas alertas). El detalle no cambia ("X urgentes · Y por revisar hoy").
