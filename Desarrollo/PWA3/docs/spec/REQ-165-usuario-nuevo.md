# REQ-165 - Usuario nuevo: espacios en la contraseña, app limpia al entrar y logo en la bienvenida

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-24) - probar: usuario |
| Alcance | `components/login/*`, `core.js` (observador de sesión), `components/tablero/*` |
| Pruebas | 3 en `test/unit/usuario-nuevo.test.js` |
| Compilacion | `26.11.24.002` |

1. **Espacios al inicio/fin de la contraseña** (REQ-164 los rechazaba, pero se aceptaban): con `ng-attr-type`
   (mostrar/ocultar) Angular trata el campo como texto y **recorta** los espacios antes de validar. Ahora
   `ng-trim="false"` en contraseña y confirmación: se validan tal cual.
2. **Al crear un usuario la app quedaba con los datos del anterior**: Firebase entra con la cuenta nueva sin recargar y
   la app conservaba equipos, perfil, bandeja y escuchas. El observador de sesión recuerda el correo cargado en la
   página; si entra **otro** usuario, recarga la app (la sesión de Firebase se conserva y todo se carga limpio). El
   aviso del alta ("Cuenta creada. Te enviamos un correo…") se guarda en `sessionStorage` y se muestra al volver.
3. **Bienvenida (sin equipos)**: el icono genérico se cambia por el **icono de la aplicación**
   (`assets/images/icons/res/DTA_Agricola_512.png`), en un círculo blanco con sombra.
