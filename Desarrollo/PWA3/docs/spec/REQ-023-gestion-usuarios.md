# REQ-023 - Gestion de usuarios: menu del avatar, perfil y planes

| Campo | Valor |
|---|---|
| Estado | **Implementado** (pendiente de prueba con sesion) |
| Alcance | `logic/perfil.js`, `core.js` (region PERFIL), `index.html`, `autentication.js` |
| Pruebas | 10 en `test/unit/perfil.test.js` (**106/106** en total) |
| Riesgo | Bajo en la logica (puro); medio en la UI (no hay pruebas de navegador con sesion) |

## 1. Menu del avatar

Al pulsar el avatar del encabezado se despliega:

| Opcion | Comportamiento |
|---|---|
| **Perfil** | abre el modal "Mi perfil" precargado |
| **Plan** | abre el modal con los tres planes |
| **Cambiar de usuario** | solo si la cuenta es de **Google**: cierra sesion y relanza el selector de cuentas |
| **Salir** | cierra sesion (reusa `$scope.logout`) |

El menu se cierra al hacer clic fuera (`$evalAsync`, no `$apply`, para no chocar con el digest de
Angular). "Cambiar de usuario" se oculta cuando el proveedor no es Google (`providerData`).

## 2. Perfil

Modal con dos bloques:

1. **Datos generales**: Nombres, Apellidos, Fecha de nacimiento, Correo (solo lectura) y Telefono.
2. **Tu negocio y necesidades**:
   - (a) Que problema quiere resolver: 8 opciones, multiple. "Todos los anteriores" y
     "Ninguno en particular" son excluyentes. Si marca **Otros**, aparece un input para describirlo.
   - (b) Cuanto esta dispuesto a invertir: 3 opciones.
   - (c) Quien toma las decisiones: 3 opciones.
   - (d) Cuando le gustaria una entrevista: 3 opciones.
   - (e) Rol: 4 opciones.

**Precarga desde Google**: si entro con Google, `displayName` se reparte en nombres/apellidos y el
correo se toma de la sesion; el telefono, de `phoneNumber` si existe. **Lo ya guardado manda** sobre
lo que devuelve Google.

Se guarda en `users/{email-con-guiones}/profile` con `updateUserInfo` (que ya delega en el
repositorio y hace `update`, no reemplaza), asi que no se pierden los campos anteriores
(`direccion`, `estado`, `zipCode`, `bankAccount`).

## 3. Planes

Tres tarjetas con lo solicitado:

| Plan | Precio |
|---|---|
| Gratis | sin costo: 1 usuario, 1 parcela, hasta 5 sensores, monitoreo satelital de humedad y vigor, alertas de humedad y heladas, estado climatologico, garantia de 3 meses |
| Basico | **`500/mes ~ 5,000/año MXN`** |
| Avanzado | **`700/mes ~ 7,000/año MXN`** |

El plan elegido se guarda en `profile.plan` y el modal marca cual es el actual.

> **Precios confirmados por el usuario**: en la primera version se registraron invertidos (Basico
> 700/7,000 y Avanzado 500/5,000), lo que hacia que el Avanzado saliera mas barato. Corregido:
> **Basico 500/5,000** y **Avanzado 700/7,000**.
>
> **Presentacion**: el usuario pidio el precio **compacto, en una sola linea**
> (`500/mes ~ 5,000/año MXN`) porque el formato largo ocupaba demasiado. La tarjeta muestra el
> nombre, el precio en una linea y la lista con tipografia reducida (`0.9em`). Una prueba fija que
> el precio no pase de 26 caracteres para que no vuelva a partirse en dos lineas.

## 4. Requisitos y trazabilidad

| ID | Requisito | Prueba |
|---|---|---|
| REQ-023.1 | reparto de `displayName` en nombres/apellidos | PASS |
| REQ-023.2 | lo guardado tiene prioridad sobre Google | PASS |
| REQ-023.3 | sin `displayName`, el correo hace de nombre | PASS |
| REQ-023.4 | detectar cuenta de Google | PASS |
| REQ-023.5 | "Otros" anade su texto | PASS |
| REQ-023.6 | "Todos los anteriores" es excluyente | PASS |
| REQ-023.7 | validacion de nombres, correo y "Otros" | PASS |
| REQ-023.8 | 3 planes, precios y plan por defecto | PASS |
| REQ-023.9 | el plan Gratis incluye 1 usuario / 1 parcela / 5 sensores | PASS |
| REQ-023.10 | catalogos de opciones completos | PASS |

## 5. Evidencia

```
npm test        106/106
lint            0 errores
arranque        ng-scope, 396.475 B
modales         modalMiPerfil y modalPlanes presentes en el DOM compilado
errores Angular 0 ($parse / ngRepeat / $compile)
0 violaciones de CSP
```

## 6. Decisiones

1. **Dropdown propio con `ng-show`** en vez de `M.Dropdown`: control total desde Angular y sin
   inicializacion extra de Materialize.
2. **`select.browser-default`** en los desplegables del perfil (estilo nativo): funciona sin
   `M.FormSelect.init` y evita el `TypeError` de `ngModel.$render` que ya sufre el proyecto.
3. **Plan dentro de `profile`** (`profile.plan`) para no crear otra rama de datos.
4. El plan es **informativo**: no aplica limites reales (1 usuario / 3 parcelas...). Aplicarlos
   requiere validacion en el servidor o en las reglas y es otra reclamacion.

## 7. Pendiente

- Probar con sesion real: precarga de Google, guardado y "Cambiar de usuario".
- Confirmar los precios del plan Avanzado.
- Aplicar los limites de cada plan (si se quiere que sean efectivos).
