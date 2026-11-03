# REQ-022 - Seguridad de datos, CSP y tooling sin dependencias

| Campo | Valor |
|---|---|
| Estado | **Implementado** (despliegue de reglas pendiente, lo hace el usuario) |
| Alcance | `database.rules.json`, `index.html` (CSP), `firebase.json`, `test/lint.js`, CI |
| Pruebas | 5 en `test/unit/reglas.test.js` (**96/96** en total) |
| Riesgo | Medio en las reglas (pueden denegar lecturas) y bajo en CSP (verificado) |

## 1. Reglas de la base de datos

**Antes**: `.read: true` en la raiz. Cualquiera, **sin cuenta**, podia leer toda la base: emails,
perfiles, sistemas, coordenadas y lecturas.

**Ahora**: raiz cerrada (`.read`/`.write` en `false`) y cada rama exige sesion:

| Ruta | Regla |
|---|---|
| `users` (coleccion) | `.read: "auth != null"` |
| `systems/$systemId` | `.read`/`.write: "auth != null"` (se hereda a `settings`, `users`, `logs`) |
| `cultivos`, `configurations/$tipo`, `access/$uid` | `auth != null` |
| `logs` / `dayLogs` | se conservan los `.indexOn` de `date` |

**Limitacion conocida y honesta**: los permisos son "cualquier usuario autenticado", no "solo el
propietario". El motivo es que `users` esta indexado por **email con guiones**, no por `auth.uid`, y
las reglas de Firebase no permiten transformar `auth.token.email` (`replace` no existe). Para cerrarlo
de verdad hay que migrar las claves a `users/{uid}` (trabajo aparte, requiere migracion de datos y
cambios en `repositorio.js`).

**Despliegue (lo hace el usuario, no el agente)**:

```powershell
firebase deploy --only database --project dta-agricola
```

Verificar despues, sin sesion, que `GET /users.json` devuelve `permission_denied`. Rollback: restaurar
la version anterior desde la consola de Firebase (Rules -> historial).

## 2. CSP y cabeceras

`index.html` lleva ahora una **Content-Security-Policy** real (antes solo habia un comentario):

- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` + los 6 CDNs usados. **`unsafe-eval` es
  obligatorio**: AngularJS 1.6 compila expresiones con `new Function` en `$parse`. `unsafe-inline`,
  por el script del widget del tiempo. Es una CSP **laxa por culpa de AngularJS**, pero ya bloquea
  origenes no listados (antes no habia ninguna).
- `connect-src` incluye Firebase (`*.firebaseio.com`, `wss://`), `identitytoolkit`, analytics,
  OpenWeather y Tomorrow.io.
- `frame-src` incluye `*.firebaseapp.com` y `accounts.google.com` (popup/iframe de auth).
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.

`firebase.json` añade `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y
`X-Frame-Options`.

**Verificado**: la app arranca con `ng-scope` y **0 violaciones de CSP** en consola.

## 3. Tooling sin dependencias

No hay ESLint instalado y el entorno no tiene red para instalarlo. En lugar de una config que no se
puede ejecutar, se añadio `test/lint.js` (sin dependencias) con modo estricto opcional:

| Comprobacion | Resultado |
|---|---|
| `node --check` de los JS **versionados** (con soporte ESM) | 76/76 |
| Secretos versionados (PEM, `private_key`, `AIza…`, `sk-…`, `ghp_…`) | **0** |
| Deuda de `core.js` (globales implicitas, `JSON.parse`) | aviso |
| Modulos nuevos: `console.log`, mojibake | 0 |

Ademas: `npm run lint`, `npm run lint:estricto` y CI en `.github/workflows/verificar.yml`
(lint + tests + smoke en Chrome).

## 4. Basura eliminada (sin referencias)

| Fichero | Por que |
|---|---|
| `assets/modules/filesaver/FileSaver.js` | era una **pagina de error HTML** guardada con extension .js |
| `assets/modules/filesaver/FileSaver.min.js` | idem |
| `assets/cultures/listPlanesRiego.js` | sintaxis invalida (`import frijol from ("...")`), sin uso |

## 5. Rectificacion de un hallazgo del plan

El plan decia "**178 caracteres con mojibake**" en `core.js`. **Era falso**: el fichero esta
correctamente en UTF-8; el `Ã` aparecia al leerlo como Latin-1. Verificado con doble decodificacion
(0 apariciones como UTF-8, 178 como Latin-1). El linter ya lo comprueba correctamente: **0**.

## 6. Evidencia

| Comprobacion | Resultado |
|---|---|
| `npm test` | **96/96** |
| `node test/lint.js` | **0 errores**, 1 aviso de deuda de `core.js` |
| Smoke en Chrome headless | **26/26** |
| Arranque con CSP | `ng-scope`, 378.158 B, **0 violaciones** |

## 7. Pendiente

- Desplegar las reglas (usuario) y verificar `permission_denied` sin sesion.
- SRI en los 12 CDNs: requiere calcular hashes con red; el procedimiento queda documentado.
- Migrar `users` a `users/{uid}` para permisos por propietario.
