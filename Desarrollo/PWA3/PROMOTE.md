# Como pasar PWA3 a produccion (solo cuando este validado en local)

PWA2 es la aplicacion en produccion y la que esta versionada en el repo principal.
PWA3 es el banco de trabajo: se prueba en local y **no se despliega** hasta que este listo.

## Antes de desplegar

1. `firebase.json` con el `ignore` que excluye secretos: ningun `*adminsdk*.json`,
   `server.key`, `functions/`, `public_old/`, `*.py`, `*.zip`, `*.txt`.
2. Clave de servicio **rotada** (la anterior estuvo expuesta).
3. `git status` limpio dentro de PWA3 y tag del estado que se publica.
4. Prueba local completa: login, listado, sistema, graficas, mapa, plan de riego y avisos.

## Versionar lo que se publica

La version vive en `package.json` y en `assets/js/app/version.js` (la prueba `version.test.js`
exige que coincidan). Mientras se trabaja lleva el sufijo `-dev` (p. ej. `1.1.0-dev`) y se ve al
pie del menu lateral.

Cada entrega (tambien en desarrollo) tiene ademas un numero de **compilacion** (`AA.MM.DD.NNN`), que
se ve debajo de la version en el menu y en la consola. Es el `?v=` mas reciente de `index.html`: al
subir el `?v=` de cualquier fichero, poner ese mismo numero en `version.js -> compilacion` (y su fecha).
La prueba `version.test.js` falla si no coinciden.

1. Decidir el numero (ver la regla al principio de `CHANGELOG.md`).
2. Quitar `-dev` en `package.json` y en `version.js`; poner la fecha en `version.js`.
3. En `CHANGELOG.md`, cambiar `## [Sin publicar]` por `## [X.Y.Z] - AAAA-MM-DD`.
4. `npm run verificar` en verde.
5. Commit `PWA3 vX.Y.Z` y etiqueta: `git tag pwa3-vX.Y.Z` y `git push --tags`.
6. Desplegar (abajo). Despues, subir a la siguiente version con `-dev` y abrir `## [Sin publicar]`.

Las especificaciones (`docs/spec/`) van en el mismo commit que el codigo que implementan, con el
mensaje `REQ-NNN: descripcion`; asi cada etiqueta tiene exactamente sus especificaciones.

## Publicar (REQ-102)

Desde `Desarrollo/PWA3`. Los dos comandos comprueban antes de desplegar y se detienen si `firebase.json` no
excluye secretos, si hay cambios sin guardar en git o si `npm run verificar` falla.

**Vista previa** (no toca produccion; URL temporal de 7 dias, util para probar en el movil):

    npm run publicar:vista-previa

(equivale a `firebase hosting:channel:deploy pwa3 --expires 7d`)

**Produccion** (reemplaza el sitio en vivo; muestra version, compilacion y commit, avisa si es `-dev` y pide escribir
PUBLICAR):

    npm run publicar:produccion

(equivale a `firebase deploy --only hosting`; el antiguo `--only hosting:dta-agricola` fallaba: ese *target* no esta
definido en `.firebaserc`). **Nunca** desde un .bat automatico.

## Vuelta atras

PWA2 sigue versionada en el repo principal: si algo falla, se despliega de nuevo desde
`Desarrollo/PWA2`.
