/**
 * REQ-015 - Login con UN SOLO SDK: el v8 compat que ya inicializa firebaseComm.js.
 *
 * Antes este fichero importaba Firebase v9 modular, creaba una SEGUNDA app y con ella otra sesion.
 * El boton de Google autenticaba en esa sesion, que nadie escucha: core.js observa `firebase.auth()`
 * (v8), asi que el usuario veia cerrarse el popup y no entraba.
 *
 * Ahora usa `firebase.auth()` y las mismas decisiones puras de logic/login.js.
 */
(function () {
    "use strict";

    const reglas = (typeof DTALogic !== "undefined" && DTALogic.login) ? DTALogic.login : null;
    const auth = firebase.auth();
    const proveedorGoogle = new firebase.auth.GoogleAuthProvider();
    // REQ-020: sin esto, Google devuelve la cuenta ya autorizada sin preguntar.
    if (reglas && typeof reglas.opcionesDelProveedor === "function") {
        proveedorGoogle.setCustomParameters(reglas.opcionesDelProveedor());
    }

    function avisar(mensaje, tipo) {
        if (!mensaje) return;
        if (typeof swal === "function") {
            swal({ title: mensaje, icon: tipo || "warning" });
        } else {
            console.warn(mensaje);
        }
    }

    function mensajeDeError(error) {
        if (reglas) return reglas.mensajeDeError(error);
        return "No se pudo completar el acceso.";
    }

    function buscar(id) {
        return document.getElementById(id);
    }

    // #region Alta con correo

    const signupBtn = buscar("signupBtn");
    if (signupBtn) {
        signupBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const email = buscar("signupMail") ? buscar("signupMail").value : "";
            const password = buscar("signupPassword") ? buscar("signupPassword").value : "";
            try {
                await auth.createUserWithEmailAndPassword(email, password);
                avisar("Cuenta creada correctamente.", "success");
            } catch (error) {
                avisar(mensajeDeError(error));
            }
        });
    }

    // #endregion

    // #region Acceso con correo

    const signinBtn = buscar("signinBtn");
    if (signinBtn) {
        signinBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const email = buscar("signinMail") ? buscar("signinMail").value : "";
            const password = buscar("signinPassword") ? buscar("signinPassword").value : "";
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                avisar(mensajeDeError(error));
            }
        });
    }

    // #endregion

    // #region Acceso con Google (REQ-028: flujo oficial de Firebase)

    const signinGoogle = buscar("signinGoogle");

    if (signinGoogle) {
        signinGoogle.addEventListener("click", function (evento) {
            evento.preventDefault();
            iniciarSesionConGoogle();
        });
    }

    /**
     * Lo que documenta Firebase: signInWithPopup. No requiere client_id propio ni iframes
     * adicionales; Firebase usa el cliente OAuth del proyecto.
     */
    async function iniciarSesionConGoogle() {
        try {
            await auth.signInWithPopup(proveedorGoogle);
        } catch (error) {
            // auth/popup-blocked: la otra via oficial es la redireccion.
            if (error && error.code === "auth/popup-blocked") {
                await iniciarSesionConRedireccion();
                return;
            }

            // Un fallo que no viene de Firebase no es un fallo de acceso.
            if (reglas && typeof reglas.esErrorDeFirebase === "function" && !reglas.esErrorDeFirebase(error)) {
                return;
            }

            avisar(mensajeDeError(error));
        }
    }

    /** Redireccion, tal cual la documenta Firebase (para cuando el popup se bloquea). */
    async function iniciarSesionConRedireccion() {
        try {
            await auth.signInWithRedirect(proveedorGoogle);
        } catch (error) {
            if (reglas && typeof reglas.esErrorDeFirebase === "function" && !reglas.esErrorDeFirebase(error)) {
                return;
            }
            avisar(mensajeDeError(error));
        }
    }

    // #endregion

    // Al volver de una redireccion hay que recoger el resultado (documentacion de Firebase).
    // Si no, la sesion queda creada pero la aplicacion no se entera de inmediato.
    auth.getRedirectResult().then((resultado) => {
        if (resultado && resultado.user) {
            console.log("[auth] sesion por redireccion:", resultado.user.email);
        }
    }).catch((error) => {
        if (reglas && typeof reglas.esErrorDeFirebase === "function" && !reglas.esErrorDeFirebase(error)) {
            return;
        }
        avisar(mensajeDeError(error));
    });

    // REQ-023: "Cambiar de usuario" vuelve a lanzar el selector de cuentas de Google.
    window.reiniciarSesionGoogle = function () {
        return auth.signInWithRedirect(proveedorGoogle);
    };
})();
