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
| REQ-013 | Servicios de dominio: equipos | Implementado | 19 |
| REQ-014 | Robustez de plantillas y auditoria de consola | Parcial | - |
| REQ-015 | Login con un solo SDK (Google no entraba) | Implementado | 5 |
| REQ-016 | Widget del tiempo de terceros bajo demanda | Implementado | - (navegador) |
| REQ-017 | El login no se queda colgado si falla /users | Implementado | 1 |
| REQ-018 | Cache-busting y trazas de arranque | Implementado | - (navegador) |
| REQ-019 | La sesion no se revierte; Google por redireccion | Implementado | 6 |
| REQ-020 | Google ofrece elegir cuenta | Implementado | 1 |

**Total: 91 pruebas en Node + 26 en navegador, todas en verde.**

## Version de los assets

`core.js?v=26.11.02.002` · `autentication.js?v=26.11.02.003`. Al modificarlos hay que **subir ese
valor** en `index.html`, o el navegador puede seguir ejecutando la copia anterior.

## Recarga limpia (si algo no cuadra)

DevTools -> Application -> Service Workers -> Unregister; Storage -> Clear site data; `Ctrl+Shift+R`.
Las trazas `[app] core.js <version>` confirman que se esta ejecutando el fichero correcto.
