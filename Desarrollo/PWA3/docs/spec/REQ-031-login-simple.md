# REQ-031 - Acceso con Google: simple y definitivo

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `autentication.js` |
| Pruebas | 127/127 en Node (4 nuevas) |
| Riesgo | Bajo: dos llamadas de Firebase |

## 1. La decision

Se acabo anadir piezas. El acceso con Google son **dos llamadas de Firebase**:

```js
await auth.signInWithRedirect(proveedorGoogle);   // al pulsar el boton
auth.getRedirectResult();                          // al cargar la pagina
```

Sin popup (lo bloquea COOP), sin Google Identity Services (exige `client_id` propio), sin ramas,
sin respaldos.

## 2. Historial, para no repetirlo

| Req | Que se probo | Resultado |
|---|---|---|
| REQ-019 | popup -> redireccion | correcto; COOP bloquea `window.close()` del popup |
| REQ-025 | arreglo del `beforeunload` | elimino el `Uncaught TypeError` |
| REQ-027 | Google Identity Services | `Error 400: origin_mismatch`; revertido |
| REQ-028 | volver al popup | reaparece COOP |
| REQ-030 | redireccion con respaldos | funcionaba pero con ramas |
| **REQ-031** | **solo redireccion** | **estado actual** |

## 3. Pruebas

`test/unit/estrategia-de-acceso.test.js` falla si alguien vuelve a anadir complejidad:

1. usa `signInWithRedirect`;
2. recoge el resultado con `getRedirectResult`;
3. **no** usa `signInWithPopup`;
4. **no** usa `google.accounts`, `client_id` ni `gsi/client`.

## 4. Verificacion

```
npm test     127/127
lint         0 errores
region de Google en autentication.js: 13 lineas, sin ramas
```
