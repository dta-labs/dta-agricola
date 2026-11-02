# Especificaciones (SDD)

| ID | Titulo | Estado | Pruebas |
|---|---|---|---|
| REQ-001 | Logica pura: formulas, fechas, secuencias | Implementado | 17 |
| REQ-004 | Dominio devices: estado y tiempos | Implementado | 8 |
| REQ-005 | Correccion de estado (D-07, D-08, D-10) | Implementado | 8 |
| REQ-006 | Dominio riego: programacion de parcelas | Implementado | 9 |
| REQ-007 | Correccion de la logica pura | Implementado | - |
| REQ-008 | Codigo muerto (D-05) y cierre de D-11 | Implementado | - |
| REQ-009 | Avisos de riego en la UI | Implementado | - |
| REQ-009b | Mensaje de resultado como funcion pura | Implementado | 3 |
| REQ-010 | Repositorio de datos + adaptador Firebase | Implementado | 8 |
| REQ-011 | Escrituras a traves del repositorio | Implementado | 10 |
| REQ-012 | Servicio de autenticacion | Implementado | 5 |
| REQ-014 | Robustez de plantillas y auditoria de consola | Parcial | - |
| REQ-013 | Servicios de dominio (devices, riego) | Pendiente | - |

**Total: 64 pruebas en Node + 21 en navegador, todas en verde.**

## Arquitectura

```
logic/     formulas · fechas · secuencias · estado · ids · riego      puro, sin DOM ni red
services/  repositorio · autenticacion                    (esquema y casos de uso)
           adaptadorFirebase · adaptadorFirebaseAuth      (infraestructura)
firebaseComm.js   fachada + punto de composicion (repoDTA, authDTA)
core.js           controlador Angular: orquesta y escribe en $scope (0 llamadas a firebase)
```

## Comandos

```powershell
npm test                              # 64 pruebas
npm run test:watch
node test/servir-local.js             # servidor en 8090
chrome --headless=new --dump-dom http://127.0.0.1:8090/test/smoke.html   # 21 en navegador
```
