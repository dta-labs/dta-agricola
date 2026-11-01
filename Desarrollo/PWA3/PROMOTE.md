# Como pasar PWA3 a produccion (solo cuando este validado en local)

PWA2 es la aplicacion en produccion y la que esta versionada en el repo principal.
PWA3 es el banco de trabajo: se prueba en local y **no se despliega** hasta que este listo.

## Antes de desplegar

1. `firebase.json` con el `ignore` que excluye secretos: ningun `*adminsdk*.json`,
   `server.key`, `functions/`, `public_old/`, `*.py`, `*.zip`, `*.txt`.
2. Clave de servicio **rotada** (la anterior estuvo expuesta).
3. `git status` limpio dentro de PWA3 y tag del estado que se publica.
4. Prueba local completa: login, listado, sistema, graficas, mapa, plan de riego y avisos.

## Vista previa sin tocar produccion

    firebase hosting:channel:deploy pwa3 --expires 7d

Devuelve una URL temporal; el sitio en vivo no cambia. Util para probar en el movil.

## Promocion

    firebase deploy --only hosting:dta-agricola

Reemplaza el contenido del sitio. **Nunca** desde un .bat automatico.

## Vuelta atras

PWA2 sigue versionada en el repo principal: si algo falla, se despliega de nuevo desde
`Desarrollo/PWA2`.
