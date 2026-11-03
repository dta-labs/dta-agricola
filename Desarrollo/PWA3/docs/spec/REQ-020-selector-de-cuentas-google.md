# REQ-020 - Google debe ofrecer elegir cuenta

| Campo | Valor |
|---|---|
| Estado | **Confirmado por el usuario** |
| Alcance | `assets/js/autentication.js`, `assets/js/logic/login.js`, `index.html` |
| Pruebas | 1 en `test/unit/login.test.js` (91 en total) |
| Riesgo | Bajo: solo anade un parametro al proveedor |

## 1. Sintoma

Al pulsar "Continuar con Google" **no aparece la ventana de Google**: entra directamente con la cuenta
que el navegador ya tenia, sin poder cambiar de usuario.

## 2. Causa

Es el comportamiento normal del inicio de sesion federado: si el navegador **ya tiene sesion de Google**
y la aplicacion **ya fue autorizada**, Google responde sin mostrar nada (SSO). No es un fallo del login;
de hecho, que entre directo confirma que la redireccion de REQ-019 funciona.

## 3. Correccion

```js
proveedorGoogle.setCustomParameters({ prompt: "select_account" });
```

`prompt=select_account` obliga a Google a mostrar el selector de cuentas en **cada** acceso. La decision
vive en `logic/login.js` (`opcionesDelProveedor()`), pura y probada.

## 4. Requisito

| ID | Requisito | Criterio |
|---|---|---|
| REQ-020.1 | el proveedor de Google fuerza el selector de cuentas | `opcionesDelProveedor().prompt === "select_account"` |

## 5. Trazabilidad

`test/unit/login.test.js` REQ-020.1 -> PASS (**91/91**).

## 6. Incidencia corregida durante el cambio

Al insertar el bloque se uso `reglas` **antes** de declararla (ReferenceError de TDZ). `node --check` no
lo detecta porque es un error de ejecucion; se detecto leyendo el fichero y se corrigio moviendo la
declaracion. Verificado cargando la pagina en Chrome headless: **0 errores** en `autentication.js` y la
app arranca (376.970 B).

## 7. Como probarlo

1. `Ctrl+Shift+R` (el modulo pasa a `autentication.js?v=26.11.02.003`).
2. Pulsa Google: debe aparecer el **selector de cuentas** de Google.
3. Elige una cuenta y vuelve a la app ya autenticado.

## 8. Confirmacion

El usuario confirmo que ahora Google muestra el selector y el acceso funciona. Se cierra junto con
REQ-019.

## 9. Nota

Esto no cierra la sesion de Google en el navegador (no hace falta): solo evita que se salte la eleccion
de cuenta. Si algun dia se quiere preseleccionar una cuenta, existe `login_hint`.
