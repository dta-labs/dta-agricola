# REQ-027 - Acceso con Google sin el iframe de Firebase

| Campo | Valor |
|---|---|
| Estado | **Revertido** por REQ-028 (ver el motivo al final) |
| Alcance | `logic/googleIdentidad.js` (nuevo), `autentication.js`, `index.html` (GIS + CSP) |
| Pruebas | 127/127 en Node (9 nuevas) |
| Riesgo | Medio: se a;ade un segundo camino de acceso, el anterior queda como respaldo |

## 1. La causa definitiva

El log del usuario mostraba, justo despues de volver de Google:

```
iframewrapper.js:124 Uncaught Error: Network Error
   ...
   @ ifchandler.js:551
```

`iframewrapper.js` / `ifchandler.js` son del SDK de Firebase Auth: el flujo de redireccion depende
de un iframe (`dta-agricola.firebaseapp.com/__/auth/iframe`) que debe cargar
`https://apis.google.com/js/api.js`. Con **Edge y la prevencion de seguimiento activa** (o un
bloqueador, o un antivirus) ese script de terceros se bloquea, el iframe falla con *Network Error*
y **la sesion no se completa nunca**. No es un fallo de nuestro codigo: es el iframe el que no
puede terminar el intercambio.

Prueba de que no era el resto: con REQ-025 desaparecio el `Uncaught TypeError`, el flujo de Google
salia y volvia correctamente, y aun asi no habia sesion. Lo unico que fallaba era el iframe.

## 2. El arreglo

Google Identity Services (GIS) entrega un `id_token` **sin iframe**, y Firebase lo canjea con
`signInWithCredential`, que tampoco lo usa:

```
google.accounts.id.initialize({ client_id, callback })
   -> callback recibe { credential: "<id_token>" }
   -> firebase.auth.GoogleAuthProvider.credential(id_token)
   -> auth.signInWithCredential(...)          // sin __/auth/iframe
```

### 2.1 `logic/googleIdentidad.js` (nuevo)

Decisiones puras, cada una con su prueba:

| Funcion | Responsabilidad |
|---|---|
| `hayGIS(ventana)` | detecta si el script de Google esta disponible |
| `idTokenDesdeRespuesta(respuesta)` | valida el token (descarta vacios, nulos y cancelaciones) |
| `clientIdDesdeConfig(config)` | usa `config.googleClientId` si existe; si no, el del proyecto |
| `opcionesDeInicializacion(clientId)` | `ux_mode: "popup"` y `auto_select: false` (permite elegir cuenta) |

### 2.2 `autentication.js`

- Si GIS esta disponible: inicializa y el boton pide el token.
- Si `prompt()` no se muestra (One Tap bloqueado): **cae automaticamente** al flujo clasico.
- Si GIS tarda en cargar (`async`): reintenta 12 veces cada 250 ms y, si no aparece, usa el flujo
  clasico. El comportamiento anterior **sigue disponible** como respaldo.

### 2.3 `index.html`

- `<script src="https://accounts.google.com/gsi/client" async defer>`
- CSP: `accounts.google.com` en `connect-src` y en `style-src` (el widget aplica CSS propio).

## 3. Evidencia

```
npm test                    127/127
lint                        0 errores
arranque headless           ng-scope
GIS activo                  si ("[auth] Google Identity Services activo (sin iframe)")
violaciones de CSP          0   (antes de ajustar style-src: 2)
Cannot set properties null  0
Uncaught                    0
```

## 4. Como se comprueba de verdad

1. Recargar con `Ctrl+Shift+R`.
2. En consola debe aparecer `[auth] Google Identity Services activo (sin iframe)`.
3. Pulsar "Entrar con Google": debe abrir el **dialogo de cuentas de Google** y volver
   directamente a la aplicacion, **sin navegar a `firebaseapp.com/__/auth/handler`**.
   Que esa navegacion desaparezca es la senal de que el iframe ya no participa.
4. Debe verse `[sesion] autenticado: <email>`.

## 5. Pendiente

- Confirmar con una cuenta real que `signInWithCredential` completa la sesion.
- Si algun dia se quiere el flujo clasico de vuelta, basta con desactivar GIS (el codigo lo
  detecta y usa la redireccion).

## 6. Segunda iteracion: FedCM

La primera version usaba `google.accounts.id.prompt()` (One Tap). En el navegador del usuario
aparecio:

```
FedCM was disabled either temporarily based on previous user action or permanently via site
settings.
```

One Tap **depende de FedCM**, y con FedCM desactivado en el navegador (Edge, ajustes del sitio) no
muestra nada: se pulsa el boton y no ocurre nada visible.

Cambio: se usa `google.accounts.id.renderButton` con `ux_mode: "popup"`, que abre el dialogo
clasico de Google y **no** necesita FedCM.

- El boton oficial sustituye al propio (`#signinGoogle` se oculta y se monta `#googleSignInGis`).
- Si `renderButton` lanza, se elimina el contenedor y **se restaura el boton propio** con el flujo
  clasico: el usuario nunca se queda sin forma de entrar.
- Ya no se llama a `prompt()`, asi que desaparecen los avisos de FedCM.

Verificado en headless: `[auth] GIS: boton oficial de Google montado`, contenedor presente en el
DOM, **0** avisos de FedCM, 0 violaciones de CSP, 0 `Uncaught`.

## 7. Por que se revertyo

Al probarlo con una cuenta real, Google respondio:

```
Acceso bloqueado: error de autorizacion
Error 400: origin_mismatch
```

Causa: GIS se inicializa con un `client_id` OAuth **manual**, que exige registrar cada origen
(`http://localhost:5502`) en Google Cloud Console. El flujo de Firebase **no necesita** `client_id`:
usa el cliente OAuth del proyecto y solo pide que el dominio este en *Authorized domains*.

Es decir, esta implementacion anadio un requisito de configuracion nuevo (y una pantalla de error)
para resolver un problema que se resuelve con el flujo estandar. Se elimino por completo:
modulo, script de Google, estilos y las dos entradas de CSP. Ver REQ-028.
