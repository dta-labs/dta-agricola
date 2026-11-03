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

    const identidad = (typeof DTALogic !== "undefined" && DTALogic.googleIdentidad)
        ? DTALogic.googleIdentidad
        : null;
    const signinGoogle = buscar("signinGoogle");

    /**
     * REQ-019: redireccion. Se conserva como respaldo porque es el flujo clasico de Firebase.
     */
    async function iniciarSesionConRedireccion() {
        try {
            await auth.signInWithRedirect(proveedorGoogle);
        } catch (error) {
            if (reglas && reglas.debeReintentarConRedirect(error && error.code)) {
                avisar("No se pudo abrir el acceso de Google. Revisa que no haya bloqueo de ventanas.");
                return;
            }
            // REQ-025: un fallo que no viene de Firebase no es un fallo de acceso.
            if (reglas && typeof reglas.esErrorDeFirebase === "function" && !reglas.esErrorDeFirebase(error)) {
                return;
            }
            avisar(mensajeDeError(error));
        }
    }

    /**
     * REQ-027: pide el token a Google Identity Services y lo canjea con signInWithCredential.
     *
     * Motivo: `signInWithRedirect` depende de `__/auth/iframe`, que carga
     * `apis.google.com/js/api.js`. Si el navegador bloquea ese script de terceros (Edge con
     * prevencion de seguimiento, bloqueadores, antivirus) el iframe falla con "Network Error" y
     * la sesion no se completa nunca. GIS entrega el id_token sin iframe.
     *
     * @returns {boolean} true si GIS quedo activado.
     */
    let botonMontado = false;

    function activarGoogleIdentidad() {
        if (!identidad || !identidad.hayGIS(window)) return false;

        // GIS exige un callback global con nombre.
        window[identidad.CALLBACK_GLOBAL] = function (respuesta) {
            const idToken = identidad.idTokenDesdeRespuesta(respuesta);
            if (!idToken) return; // el usuario cerro el dialogo

            const credencial = firebase.auth.GoogleAuthProvider.credential(idToken);
            auth.signInWithCredential(credencial).then(() => {
                console.log("[auth] credencial de Google canjeada");
            }).catch((error) => {
                avisar(mensajeDeError(error));
            });
        };

        const configuracion = (typeof config !== "undefined") ? config : null;
        window.google.accounts.id.initialize(
            identidad.opcionesDeInicializacion(identidad.clientIdDesdeConfig(configuracion))
        );

        if (!signinGoogle) return true;

        // REQ-027: el boton oficial de GIS sustituye al nuestro.
        // `prompt()` (One Tap) depende de FedCM; con FedCM desactivado en el navegador no muestra
        // nada ("FedCM was disabled"). El boton con ux_mode "popup" abre el dialogo clasico de
        // Google y no necesita FedCM.
        if (botonMontado) return true;

        let contenedor = document.getElementById("googleSignInGis");

        if (!contenedor) {
            contenedor = document.createElement("div");
            contenedor.id = "googleSignInGis";
            contenedor.className = "google-signin-gis";
            signinGoogle.parentNode.insertBefore(contenedor, signinGoogle.nextSibling);
            signinGoogle.style.display = "none";
        }

        try {
            window.google.accounts.id.renderButton(
                contenedor,
                identidad.opcionesDelBoton(signinGoogle.offsetWidth || 240)
            );
        } catch (error) {
            // Si el boton oficial no se puede dibujar, se devuelve el boton propio: el usuario
            // no puede quedarse sin ninguna forma de entrar.
            console.error("[auth] no se pudo montar el boton de Google:", error);
            contenedor.remove();
            signinGoogle.style.display = "";
            return false;
        }

        botonMontado = true;
        console.log("[auth] GIS: boton oficial de Google montado");

        return true;
    }

    (function arrancarAccesoConGoogle() {
        if (activarGoogleIdentidad()) {
            console.log("[auth] Google Identity Services activo (sin iframe)");
            return;
        }

        // El script de GIS carga con async: se le da margen antes de rendirse.
        let intentos = 0;
        const esperar = function () {
            if (activarGoogleIdentidad()) {
                console.log("[auth] Google Identity Services activo (sin iframe)");
                return;
            }

            intentos += 1;
            if (intentos < 12) {
                setTimeout(esperar, 250);
                return;
            }

            console.warn("[auth] GIS no disponible: se usa la redireccion clasica");
            if (signinGoogle) {
                signinGoogle.addEventListener("click", function (evento) {
                    evento.preventDefault();
                    iniciarSesionConRedireccion();
                });
            }
        };

        esperar();
    })();

    // #endregion

    // REQ-023: "Cambiar de usuario" vuelve a lanzar el selector de cuentas de Google.
    window.reiniciarSesionGoogle = function () {
        return auth.signInWithRedirect(proveedorGoogle);
    };
})();
