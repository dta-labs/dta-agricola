/**
 * REQ-038 / REQ-039 - dtaAuth: acceso a la cuenta (Google, correo, alta, recuperar).
 *
 * Sustituye a autentication.js, que enganchaba listeners por getElementById al cargar la pagina.
 * Unico punto de la interfaz que habla con firebase.auth() para ENTRAR. El observador de sesion y
 * la salida siguen en core.js (sesion de la app, no de la vista).
 *
 * Comportamiento heredado de REQ-035:
 *   - Google por redireccion en hosting (authDomain = mismo dominio, ver firebaseComm.js) y por
 *     popup en local (logic/login.js -> metodoDeAccesoGoogle).
 *   - Ningun error de la redireccion se pierde: recogerRedireccion() rechaza con el error.
 *
 * Historial del acceso con Google (para no repetirlo):
 *   REQ-019 popup -> redireccion (COOP) | REQ-027 Google Identity Services, revertido |
 *   REQ-028 popup otra vez | REQ-030 redireccion con ramas | REQ-031 solo redireccion |
 *   REQ-035 redireccion en hosting, popup en local.
 */
(function (raiz) {
    "use strict";

    /**
     * @param sdk        el `firebase` v8 ya inicializado
     * @param reglas     DTALogic.login
     * @param ubicacion  objeto con `host` (window.location)
     * @param consola    para trazas `[auth]`
     */
    function crear(sdk, reglas, ubicacion, consola) {
        if (!sdk || typeof sdk.auth !== "function") throw new Error("dtaAuth: falta firebase");
        if (!reglas) throw new Error("dtaAuth: faltan las reglas de login");
        var traza = consola || console;
        var auth = sdk.auth();
        var proveedorGoogle = new sdk.auth.GoogleAuthProvider();
        // REQ-020: sin esto, Google devuelve la cuenta ya autorizada sin preguntar.
        if (typeof reglas.opcionesDelProveedor === "function") {
            proveedorGoogle.setCustomParameters(reglas.opcionesDelProveedor());
        }

        function metodoGoogle() {
            return reglas.metodoDeAccesoGoogle(ubicacion && ubicacion.host);
        }

        function dominioDeAutenticacion() {
            try { return sdk.app().options.authDomain; } catch (error) { return "?"; }
        }

        return {
            metodoGoogle: metodoGoogle,

            accederConGoogle: function () {
                var metodo = metodoGoogle();
                traza.info("[auth] Google por", metodo, "| authDomain:", dominioDeAutenticacion());
                if (metodo === "popup") {
                    return auth.signInWithPopup(proveedorGoogle);
                }
                return auth.signInWithRedirect(proveedorGoogle);
            },

            /** Al volver de Google. Rechaza con el error para que la vista lo muestre (REQ-035 C-2). */
            recogerRedireccion: function () {
                return auth.getRedirectResult().then(function (resultado) {
                    if (resultado && resultado.user) {
                        traza.info("[auth] sesion por redireccion:", resultado.user.email);
                    }
                    return resultado;
                });
            },

            entrarConCorreo: function (correo, clave) {
                return auth.signInWithEmailAndPassword(correo, clave);
            },

            crearCuenta: function (correo, clave) {
                return auth.createUserWithEmailAndPassword(correo, clave);
            },

            recuperarContrasena: function (correo) {
                return auth.sendPasswordResetEmail(correo);
            },

            /** Traza el error y dice si hay que mostrarlo al usuario. */
            debeAvisar: function (error) {
                traza.error("[auth] fallo de acceso:", error && error.code, error && error.message);
                return reglas.debeAvisarError(error);
            },

            mensajeDeError: function (error) {
                return reglas.mensajeDeError(error);
            }
        };
    }

    if (typeof module !== "undefined" && module.exports) module.exports = { crear: crear };
    if (raiz.angular) {
        raiz.angular.module("Administracion").factory("dtaAuth", function () {
            return crear(raiz.firebase, raiz.DTALogic && raiz.DTALogic.login, raiz.location, raiz.console);
        });
    }
})(typeof window !== "undefined" ? window : globalThis);
