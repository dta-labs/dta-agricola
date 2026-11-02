# REQ-012 - Servicio de autenticacion (rebanada 3 de REQ-010)

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `services/autenticacion.js`, `services/adaptadorFirebaseAuth.js`, `core.js` |
| Pruebas | 5 en `test/unit/autenticacion.test.js` + 2 en `test/smoke.html` |
| Riesgo | Medio: se cambia el camino de la sesion; el comportamiento es el mismo |

## 1. Requisitos

| ID | Requisito | Criterio |
|---|---|---|
| REQ-012.1 | `observar` entrega el usuario **normalizado** | `{autenticado:true, usuario}` |
| REQ-012.2 | acepta el envoltorio `{ user }` de FirebaseUI | mismo resultado |
| REQ-012.3 | sin usuario informa `autenticado:false` | `null` y `{}` |
| REQ-012.4 | `cerrarSesion` delega en el adaptador | devuelve su promesa |
| REQ-012.5 | contrato explicito | adaptador incompleto y callback invalido fallan con mensaje |

## 2. Normalizacion

El controlador tenia `$scope.authUser = user.email ? user : user.user;` (FirebaseUI a veces entrega un
envoltorio). Esa regla se movio al servicio:

```
null | {} | {user:null}  ->  { autenticado: false, usuario: null }
{ email } | { user: {email} }  ->  { autenticado: true, usuario: <usuario> }
```

## 3. Trazabilidad

`test/unit/autenticacion.test.js` (5) y `test/smoke.html` (2) -> PASS.

## 4. Estado del acoplamiento a Firebase

| Fichero | Llamadas directas | Nota |
|---|---|---|
| `services/adaptadorFirebase.js` | 1 | `database` (infraestructura) |
| `services/adaptadorFirebaseAuth.js` | 1 | `auth` (infraestructura) |
| `firebaseComm.js` | 2 | punto de composicion: crea `repoDTA` y `authDTA` |
| **`core.js`** | **0 activas** | solo queda una mencion comentada |

El controlador ya **no habla con Firebase**: usa `__repo()` y `__auth()`.

## 5. Pendiente

| Rebanada | Contenido |
|---|---|
| 4 (REQ-013) | servicios de dominio (`devices`, `riego`) y adelgazamiento del controlador |
