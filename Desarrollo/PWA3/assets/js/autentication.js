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

    // #region Acceso con Google

    // Lo simple de Firebase: redirigir y recoger el resultado. Nada mas.
    const signinGoogle = buscar("signinGoogle");

    if (signinGoogle) {
        signinGoogle.addEventListener("click", function (evento) {
            evento.preventDefault();
            auth.signInWithRedirect(proveedorGoogle).catch(function (error) {
                avisar(mensajeDeError(error));
            });
        });
    }

    // #endregion

    // Recoge el resultado al volver de Google.
    auth.getRedirectResult().then(function (resultado) {
        if (resultado && resultado.user) {
            console.log("[auth] sesion por redireccion:", resultado.user.email);
        }
    }).catch(function () {
        // Si no veniamos de Google, no hay nada que recoger.
    });

    // REQ-023: "Cambiar de usuario" vuelve a lanzar el selector de cuentas de Google.
    window.reiniciarSesionGoogle = function () {
        return auth.signInWithRedirect(proveedorGoogle);
    };
})();
