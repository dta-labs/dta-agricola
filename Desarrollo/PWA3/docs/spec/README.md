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
| REQ-019 | La sesion no se revierte; Google por redireccion | Confirmado | 6 |
| REQ-020 | Google ofrece elegir cuenta | Confirmado | 1 |

**Total: 91 pruebas en Node + 26 en navegador, todas en verde.**

## Bloque de autenticacion (cerrado y confirmado por el usuario)

| Reclamacion | Que resolvio |
|---|---|
| REQ-015 | dos SDK con dos sesiones -> un solo SDK (v8) |
| REQ-017 | el login se quedaba colgado si fallaba `/users` |
| REQ-018 | `core.js` cacheado + trazas de arranque |
| REQ-019 | el observador revertia la sesion (el "entro una vez y ya no") |
| REQ-020 | Google ofrece elegir cuenta (`prompt=select_account`) |

## Pendiente

| Item | Nota |
|---|---|
| REQ-014 | `TypeError` de `ngModel.$render` (solo aparece con sesion; requiere DevTools) |
| Prueba manual del resto | listado de equipos, retraso de comunicacion, alarma de nevera, plan de riego |
| Empaquetado nativo | Capacitor (Android/iOS), objetivo final de la refactorizacion |

## Version de los assets

`core.js?v=26.11.02.002` · `autentication.js?v=26.11.02.003`. Al modificarlos hay que **subir ese
valor** en `index.html`, o el navegador puede seguir ejecutando la copia anterior.

## Recarga limpia (si algo no cuadra)

DevTools -> Application -> Service Workers -> Unregister; Storage -> Clear site data; `Ctrl+Shift+R`.
Las trazas `[app] core.js <version>` confirman que se esta ejecutando el fichero correcto.

## Versionado y push

- El repositorio es el **padre** (`dta-agricola`): PWA3 no tiene `.git` propio y se versiona ahi.
- `Desarrollo/PWA2` **si** tiene su propio `.git`, pero ademas esta versionado en el padre: es una
  situacion hibrida y explica que en GitHub Desktop aparezcan dos proyectos distintos.
- `main` puede rechazar un push por **secret scanning** si el rango toca ficheros con credenciales.
  Herramienta correcta: **rotar la clave**, no desbloquear el aviso. `git rm --cached` solo evita que
  se siga versionando: el historial conserva el secreto.
- El arbol limpio en GitHub Desktop **no** significa que no haya commits: los commits estan en
  **History** de la rama `main`, y lo que aparece en "Changes" son ficheros sin commitear
  (por ejemplo, el trabajo de `Desarrollo/Embebido`).

```powershell
git -C C:\Users\admin\Documents\GitHub\dta-agricola status -sb      # main...origin/main
git -C C:\Users\admin\Documents\GitHub\dta-agricola log --oneline -5
git -C C:\Users\admin\Documents\GitHub\dta-agricola push origin main
```
