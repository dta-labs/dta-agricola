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

    const auth = firebase.auth();
    const proveedorGoogle = new firebase.auth.GoogleAuthProvider();
    const reglas = (typeof DTALogic !== "undefined" && DTALogic.login) ? DTALogic.login : null;

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

    // #region Acceso con Google

    const signinGoogle = buscar("signinGoogle");
    if (signinGoogle) {
        signinGoogle.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await auth.signInWithPopup(proveedorGoogle);
            } catch (error) {
                // El aviso de COOP aparece al cerrar el popup; si el navegador lo bloqueo,
                // se reintenta con redireccion, que no depende de window.opener.
                if (reglas && reglas.debeReintentarConRedirect(error && error.code)) {
                    try {
                        await auth.signInWithRedirect(proveedorGoogle);
                        return;
                    } catch (errorRedirect) {
                        avisar(mensajeDeError(errorRedirect));
                        return;
                    }
                }
                avisar(mensajeDeError(error));
            }
        });
    }

    // Al volver de una redireccion hay que recoger el resultado; si no, la sesion
    // queda creada pero la aplicacion no se entera de inmediato.
    auth.getRedirectResult().then((resultado) => {
        if (resultado && resultado.user) {
            console.log("Sesion iniciada por redireccion:", resultado.user.email);
        }
    }).catch((error) => {
        if (error && error.code && error.code !== "auth/credential-already-in-use") {
            avisar(mensajeDeError(error));
        }
    });

    // #endregion
})();
