# REQ-164 - Alta de usuario con contraseña validada y recuperación de contraseña

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-24) - probar: usuario (correo real) |
| Alcance | `logic/login.js`, `app/auth.factory.js`, `components/login/*` |
| Pruebas | 2 nuevas en `test/unit/componentes/login.test.js` (+2 ajustadas) |
| Compilacion | `26.11.24.001` |

## Problemas

1. **Alta**: la contraseña se escribía una sola vez y no se validaba (solo el mínimo de Firebase).
2. **Recuperar contraseña**: el usuario no recibió el correo.

## Alta

- Campo **Confirma la contraseña**; botón mostrar/ocultar; barra Débil / Aceptable / Fuerte; aviso "Las contraseñas
  coinciden / no coinciden".
- `login.validarAlta(correo, clave, confirmacion)`: correo válido; mínimo 6 caracteres; letras y números; sin
  espacios al inicio o al final; ambas iguales. Si falla, no se llama a Firebase y se muestra el motivo.
- Tras crear la cuenta se envía el **correo de verificación** (`sendEmailVerification`). Si no se puede enviar, la
  cuenta queda creada (se registra en consola).

## Recuperar contraseña

El código ya llamaba a `sendPasswordResetEmail`. Causas probables de que no llegue (no se pueden ver desde la app,
porque Firebase con *protección contra enumeración de correos* responde éxito igual):

- El correo cayó en **spam** (remitente `noreply@…`).
- La cuenta entra **con Google** (sin contraseña de correo) o el correo **no está registrado**.
- Plantilla de "Restablecer contraseña" o dominio no autorizado en la consola de Firebase.

Cambios:
- Correos de Firebase en **español** (`auth.languageCode = "es"`).
- El enlace regresa a la app (`url: <origen>/index.html`); si Firebase rechaza esa dirección
  (`auth/unauthorized-continue-uri` …) se reenvía sin ella.
- Mensaje: "Si <correo> está registrado, te enviamos un enlace… Revisa también spam… Si entras con Google, usa
  Continuar con Google". Se valida el formato del correo antes de pedirlo.
- Trazas `[auth]` en la consola del navegador (solicitud y aceptación por Firebase) para diagnosticar.

## Revisar en la consola de Firebase (usuario)

Authentication → Usuarios (proveedor de la cuenta), Plantillas (Restablecer contraseña, remitente), Configuración →
Dominios autorizados (`dta-agricola.web.app`).
