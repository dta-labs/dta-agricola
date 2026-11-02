# REQ-011 - Escrituras a traves del repositorio (rebanada 2 de REQ-010)

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `services/repositorio.js`, `services/adaptadorFirebase.js`, `firebaseComm.js` |
| Pruebas | 10 en `test/unit/repositorio.test.js` + 2 en `test/smoke.html` |
| Riesgo | Medio: cambia el camino de escritura; las firmas publicas se mantienen |

## 1. Objetivo

Que **ninguna** funcion de la aplicacion construya rutas de escritura a mano. `firebaseComm.js` pasa a
ser una **fachada de compatibilidad** (mantiene nombres y firmas que usa `core.js`) que delega en el
repositorio.

## 2. Requisitos

| ID | Requisito | Criterio |
|---|---|---|
| REQ-011.1 | `escribirEstadoSistema` actualiza solo `settings/status` | ruta y valor |
| REQ-011.2 | `guardarSettingsSistema` actualiza `settings` completo | ruta y valor |
| REQ-011.3 | `crearSistema` escribe `{ settings }` | ruta y forma |
| REQ-011.4 | `vincularUsuarioASistema` escribe en las dos direcciones | 2 rutas; puntos -> guiones |
| REQ-011.5 | `desvincularUsuarioDeSistema` pone `null` en ambos lados | 2 valores |
| REQ-011.6 | `guardarPerfilUsuario` -> `users/{email}/profile` | ruta |
| REQ-011.7 | `registrarAcceso` anade entrada con marca de tiempo | 1 clave, `accessType`/`data` |
| REQ-011.8 | `leerMediciones` devuelve array de valores | 2 valores |
| REQ-011.9 | `leerMediciones` sin datos devuelve `[]` | lista vacia |
| REQ-011.10 | `escucharUsuarioPorClave` consulta por clave | `users` + clave con guiones |

## 3. Trazabilidad

Todas en `test/unit/repositorio.test.js` (REQ-011.1..10) y dos equivalentes en `test/smoke.html`
(escritura de estado y usuario por clave). **59/59 en Node, 19/19 en navegador.**

## 4. Convenio de claves que se documenta

Firebase no admite `.` en las claves, asi que **todos** los puntos se sustituyen por guiones:

```
ana.perez@x.com  ->  ana-perez@x-com
```

Es el comportamiento de `convertDotToDash` en el codigo original; el repositorio lo centraliza en
`claveDeEmail`. **Una prueba mia inicial asumia `ana-perez@x.com`** (solo el nombre de usuario) y fallo:
el convenio real es el del correo completo. Se corrigio la prueba, no el codigo.

## 5. Limpieza incluida

Se eliminaron de `firebaseComm.js` **7 funciones sin uso** (verificadas por busqueda):

```
loadCamposFromFB · loadCulturesList · loadSpecificSystemLogsFromFB
loadSpecialistsFromFB · updateOfertaInFB · setAuthUser · deleteCurrentOffert
```

`firebaseComm.js`: **209 -> 127 lineas**. Llamadas directas a `firebase.database()`: **11 -> 1** (la
unica que queda es la creacion del repositorio, que es el punto de composicion y debe serlo).

> Comprobacion de seguridad: `logoutAutUser` estaba en la region de ejemplos y se elimino con ella;
> se verifico que sus dos unicas referencias estaban **comentadas** en `core.js`, asi que no rompe nada.

## 6. Pendiente

| Rebanada | Contenido |
|---|---|
| 3 (REQ-012) | autenticacion: `onAuthStateChanged`, `signOut` |
| 4 (REQ-013) | servicios de dominio y adelgazamiento del controlador |
