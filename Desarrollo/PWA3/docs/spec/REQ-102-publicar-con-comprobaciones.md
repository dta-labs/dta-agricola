# REQ-102 - Publicar en Firebase con comprobaciones (sustituye al antiguo deploy.bat)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `scripts/publicar.js` (nuevo), `package.json`, `PROMOTE.md` |
| Pruebas | 435/435 en Node (4 nuevas en `publicar.test.js`) |

## Contexto

`deploy.bat` se desactivo en REQ-022 (`deploy.DISABLED.txt`): ejecutaba `firebase deploy --only hosting` sin
comprobaciones y publicaba la carpeta completa (secretos, `public_old`) en produccion. Ademas, `PROMOTE.md` indicaba
`firebase deploy --only hosting:dta-agricola`, que falla porque ese *target* no esta definido en `.firebaserc`.

## Comandos (desde `Desarrollo/PWA3`)

| Comando | Destino |
|---|---|
| `npm run publicar:vista-previa` | Canal `pwa3` (URL temporal, 7 dias); produccion no cambia |
| `npm run publicar:produccion` | Sitio en vivo (`firebase deploy --only hosting`) |

## Comprobaciones (se detiene y no publica nada si falla alguna)

1. `firebase.json` excluye `**/*adminsdk*.json`, `server.key`, `functions/**`, `public_old/**`, `_archivo/**`.
2. Sin cambios sin guardar en git dentro de PWA3 (archivos nuevos sin registrar: solo aviso con la lista).
3. `npm run verificar` (lint + pruebas + arranque local) en verde.
4. Solo produccion: muestra version, compilacion y commit; avisa si la version es `-dev`; pide escribir **PUBLICAR**.

Requiere `firebase-tools` instalado y la sesion iniciada (`firebase login`) en el equipo del usuario.

## Doble clic (2026-11-20)

`publicar-vista-previa.bat` y `publicar-produccion.bat` (en `Desarrollo/PWA3`): solo cambian a la carpeta del proyecto,
ejecutan `npm run publicar:...` y dejan la ventana abierta (`pause`). No despliegan por su cuenta: las comprobaciones y la
confirmacion PUBLICAR son las del script. `firebase.json` excluye `**/*.bat` (no se publican) y el script lo exige.
