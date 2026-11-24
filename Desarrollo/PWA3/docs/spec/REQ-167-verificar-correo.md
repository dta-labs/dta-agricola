# REQ-167 - No se entra sin verificar el correo (cuentas nuevas)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-24) - probar: usuario (correo real) |
| Alcance | `logic/login.js`, `app/auth.factory.js`, `components/login/*`, `core.js` (observador de sesión) |
| Pruebas | 2 nuevas en `test/unit/componentes/login.test.js` (+2 ajustadas, REQ-165 ajustada) |
| Compilacion | `26.11.24.004` |

## Problema

Al crear la cuenta, Firebase entraba de inmediato con el usuario nuevo, sin haber comprobado que el correo es real.

## Comportamiento

- **Crear cuenta**: se crea, se envía el enlace de verificación y **se cierra la sesión**. El acceso queda en el paso
  de la contraseña con el correo escrito: "Cuenta creada. Te enviamos un enlace a … para verificar tu correo (revisa
  también spam). Ábrelo y después entra con tu contraseña."
- **Entrar** con correo y contraseña sin haber verificado: se cierra la sesión y se muestra "Tu correo aún no está
  verificado…" con el enlace **Reenviar enlace de verificación** (entra, reenvía y sale).
- **Observador de sesión** (core.js): si aparece una sesión de una cuenta que debe verificar (por ejemplo, una que
  quedó abierta), no se cargan sus datos y se cierra.
- `login.requiereVerificacion(usuario)`: cuenta de **correo y contraseña**, **sin verificar**, creada **desde el
  24/11/2026**. Las cuentas anteriores no se bloquean (nunca se les pidió verificar y quedarían fuera); las de Google
  ya vienen verificadas.

Sustituye el aviso tras el alta de REQ-165 (ya no se entra al crear la cuenta).
