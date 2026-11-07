# REQ-041 - Componentes `dta-perfil`, `dta-planes` y `dta-notificaciones`

| Campo | Valor |
|---|---|
| Estado | **Propuesto** |
| Depende de | REQ-038 (`dtaSesion`, `dtaRepo`, `dtaMensajeria`, `dtaUi`); REQ-036 (plan actual, foto) |
| Cubre | RF-USR-02, RF-NOT-01, RF-NOT-02 de REQ-034 |
| Riesgo | Medio: escribe en `users/{email}` y gestiona el token FCM |

## 1. Alcance

- **Perfil**: modal "Mi perfil" (datos generales, ubicacion, problemas del cultivo).
- **Planes**: modal de planes con el plan actual destacado.
- **Notificaciones**: vista con los interruptores de notificaciones push y de sonido.
- **Cabecera de usuario** del menu lateral (foto, nombre, correo, plan) como componente comun
  `dta-usuario-cabecera`, reutilizable en la barra superior.

**Cambio de diseno (REQ-044, 2026-11-06)**: la cabecera del menu lateral abre el perfil; "Plan" es un
boton al final del perfil; "Cambiar de usuario" ya no existe.

**REQ-045 (2026-11-06)** ya rediseno el contenido del perfil en Bootstrap y corrigio P-1 y P-2; el
componente parte de ese marcado.

**Fuera de alcance**: `salir()` (sesion de la app, va a `dtaSesion` despues);
el `<audio id="alertSound">` y las alarmas de equipos (son del componente Sistema).

## 2. Origen (2026-11-05)

| Origen | Ubicacion | Destino |
|---|---|---|
| Modal Mi perfil | `index.html`, `#modalMiPerfil` (region `REQ-023`, aprox. 4918-4996) | `components/perfil/perfil.html` |
| Modal Planes | `index.html`, `#modalPlanes` (aprox. 4997-5026) | `components/planes/planes.html` |
| Vista Notificaciones | `index.html`, `<section id="notificaciones">` sin el `<audio>` (aprox. 4277-4309) | `components/notificaciones/notificaciones.html` |
| Cabecera del menu lateral y avatar | `index.html`, `.usuario-cabecera` y `.avatar-usuario` (REQ-036) | `components/comunes/usuario-cabecera/` |
| **Vista de perfil antigua** `users` | `index.html`, `<div if="perfilUsuario" ... selectedWindow == 'users'>` (aprox. 4808-4892); su entrada de menu ya esta comentada | **Se elimina** (codigo muerto, sustituido por REQ-023) |
| `$scope.updateUserInfo` | `core.js` (solo lo usa la vista `users`) | **Se elimina** |
| Perfil y planes | `core.js` region PERFIL: `planes`, `planDelUsuario`, `esCuentaGoogle`, `abrirPerfil`, `guardarPerfil`, `abrirPlanes`, `elegirPlan`, `inicialDelUsuario`, `marcarFotoFallida`, `fotoUsuarioFallo` | Controladores + `dtaSesion` |
| Notificaciones | `core.js` region NOTIFICACION: `notificationsEnabled`, `toggleNotifications`, `setToken`, `deleteToken`; y `getSoundStatus`, `toggleNotificationSound` | Controlador + `dtaMensajeria` + `logic/preferencias.js` |
| Escritura del perfil | `firebaseComm.js -> updateUserInfo` -> `repoDTA.guardarPerfilUsuario` | `dtaRepo.guardarPerfilUsuario` |
| Mensajeria | `firebaseMessaging.js`: `enableFirebaseMessaging`, `unSuscribeToNotifications` | `dtaMensajeria` (envoltura; el fichero no se reescribe aqui) |

## 3. Defectos encontrados que se corrigen

| ID | Defecto | Evidencia | Correccion |
|---|---|---|---|
| P-1 | **"Perfil actualizado" y "Plan seleccionado" se anuncian antes de guardar** | `guardarPerfil` y `elegirPlan` llaman a `updateUserInfo(...)` (devuelve promesa) y muestran el aviso de exito sin esperar; si la escritura falla, el usuario cree que se guardo | Aviso de exito solo al resolver; si falla, aviso de error y se conserva lo que habia |
| P-2 | El estado local cambia aunque falle la escritura | `$scope.userProfile = ...` antes de saber el resultado | Actualizar `dtaSesion` despues de resolver |
| P-3 | Dos vistas de perfil (modal y `users`) con reglas distintas | `updateUserInfo` de la vista antigua no valida | Una sola: el modal, con `validarPerfil` |
| P-4 | Enlace a `tos.html` inexistente en la vista antigua | REQ-034 D-7 | Desaparece con la vista |
| P-5 | El modal de planes muestra la eleccion como hecha aunque no se haya guardado | `$scope.planActual = plan` antes de escribir | Marcar el plan actual al confirmar la escritura; boton en espera mientras tanto |

## 4. Comportamiento

| ID | Comportamiento | Criterio |
|---|---|---|
| PF-1 | La cabecera del menu lateral abre el modal con los datos guardados o los de la cuenta de Google | Igual que hoy (`perfilDesdeUsuario`) |
| PF-2 | Guardar valida con `validarPerfil`; con errores no escribe | Mensajes de `logic/perfil.js` |
| PF-3 | Guardar escribe solo en `users/{email}/profile` (merge) | No borra `systems` ni otros campos |
| PL-1 | El boton "Plan" al final del perfil abre el modal con "Tu plan actual: X" y la tarjeta destacada (REQ-036) | Igual que hoy |
| PL-2 | Elegir plan escribe `profile.plan` y, al confirmar, mueve el distintivo | P-1, P-5 |
| PL-3 | Sin plan guardado se marca Gratis | Igual que hoy |
| N-1 | Notificaciones: casilla marcada solo si la preferencia esta activa **y** el permiso es `granted` | Igual que hoy |
| N-2 | Activar pide permiso, obtiene token FCM y lo guarda; sin token, aviso explicativo | Igual que hoy |
| N-3 | Desactivar borra el token y la preferencia | Igual que hoy |
| N-4 | Sonido: activar reproduce la campana de prueba; la preferencia sobrevive al cierre de sesion | Igual que hoy (REQ-019) |
| N-5 | Permiso `denied` en el navegador: la vista explica como reactivarlo en vez de no hacer nada | Nuevo mensaje |
| C-1 | Cabecera: foto de Google siempre que cargue; reintento y despues la inicial (REQ-036) | Igual que hoy |

## 5. Diseno

```
components/perfil/                 perfil.component.js, perfil.html, perfil.css
                                   Se abre desde el menu: dtaUi.abrirModal('modalMiPerfil')
components/planes/                 planes.component.js, planes.html, planes.css
components/notificaciones/         notificaciones.component.js, .html, .css
                                   bindings: { alVolver: '&' }
components/comunes/usuario-cabecera/
                                   bindings: { usuario: '<', plan: '<', tamano: '@' }
app/sesion.factory.js              dtaSesion: usuario(), perfil(), plan(), guardarPerfil(datos),
                                   elegirPlan(id); core.js la alimenta en el observador
app/mensajeria.factory.js          dtaMensajeria: estado(), activar(email), desactivar(email)
logic/preferencias.js (nuevo)      notificacionesActivas(preferencia, permiso), sonidoActivo(valor)
```

- Los modales Perfil y Planes se montan una vez en `index.html` (fuera de las vistas), como hoy.
- El menu lateral llama a `dtaUi.abrirModal(...)` en lugar de `abrirPerfil()`/`abrirPlanes()`
  de `core.js`; el componente rellena su formulario en el evento de apertura.
- `index.html`: `<dta-notificaciones ng-if="selectedWindow == 'notificaciones'" al-volver="showWindow('listado')">`.

## 6. Pruebas

| Prueba | Tipo |
|---|---|
| `notificacionesActivas`: combinaciones de preferencia (`'true'`, `'false'`, null) y permiso (`granted`, `denied`, `default`, sin API) | Regla |
| `sonidoActivo` con `'true'`, `'false'`, null | Regla |
| Perfil: guardar con errores no llama a `dtaRepo`; guardar valido llama una vez con el merge correcto | Controlador |
| Perfil: el aviso de exito solo tras resolver; si rechaza, aviso de error y `dtaSesion` sin cambios (P-1, P-2) | Controlador |
| Planes: elegir un plan mueve el distintivo solo al resolver; error lo deja como estaba (P-5) | Controlador |
| Notificaciones: activar llama a `dtaMensajeria.activar(email)`; sin token avisa; `denied` muestra la ayuda | Controlador |
| Cabecera: reintento de foto y caida a la inicial (migra `perfil-menu-lateral.test.js`) | Controlador |
| `index.html` sin `#modalMiPerfil`/`#modalPlanes` en linea, sin la vista `users`, sin `tos.html` | Estructura |
| `core.js` sin la region PERFIL ni la region NOTIFICACION, salvo `salir`/`cambiarDeUsuario` | Estructura |

Manual: editar y guardar el perfil (y verlo en la consola de Firebase); provocar un fallo de
escritura (sin red) y comprobar el aviso de error; cambiar de plan; activar y desactivar
notificaciones en Chrome y en la PWA instalada en Android; activar el sonido.

## 7. Criterio de cierre

Pruebas en verde, P-1 a P-5 corregidos, y medidas: lineas que salen de `index.html` (esperado ~230,
incluida la vista `users`) y de `core.js` (regiones PERFIL y NOTIFICACION).
