/**
 * REQ-015 - Decisiones del login, sin navegador ni Firebase.
 *
 * El aviso de COOP al cerrar el popup de Google no impide el acceso, pero cuando el navegador
 * bloquea la ventana conviene reintentar con redireccion. Esa decision se toma aqui y se prueba.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.login = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // Codigos en los que el popup no sirve y hay que usar signInWithRedirect.
    var CON_REDIRECT = [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
        "auth/unauthorized-domain",
        "auth/web-storage-unsupported",
        "auth/expired-popup-request"
    ];

    // v8 devuelve los codigos con guiones y v9 tambien, pero hay quien usa guion bajo.
    function normalizar(codigo) {
        return String(codigo == null ? "" : codigo).replace(/_/g, "-").toLowerCase();
    }

    var MENSAJES = {
        "auth/wrong-password": "Contraseña incorrecta...",
        "auth/user-not-found": "Usuario no encontrado...",
        "auth/invalid-email": "Correo no válido...",
        "auth/email-already-in-use": "Correo ya registrado con anterioridad...",
        "auth/weak-password": "Contraseña muy débil...",
        "auth/network-request-failed": "Fallo en la solicitud de red...",
        "auth/popup-blocked": "La ventana emergente fue bloqueada; se intentará por redirección...",
        "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase...",
        "auth/popup-closed-by-user": "Se cerró la ventana antes de completar el acceso...",
        "auth/cancelled-popup-request": "Se canceló la ventana de acceso...",
        "auth/invalid-credential": "Correo o contraseña incorrectos...",
        "auth/invalid-login-credentials": "Correo o contraseña incorrectos...",
        "auth/too-many-requests": "Demasiados intentos; espera unos minutos e inténtalo de nuevo...",
        "auth/missing-email": "Escribe tu correo para recuperar la contraseña...",
        // REQ-164: recuperar la contrasena
        "auth/unauthorized-continue-uri": "El dominio de la app no está autorizado en Firebase para el enlace de recuperación...",
        "auth/invalid-continue-uri": "La dirección de regreso del enlace de recuperación no es válida...",
        "auth/missing-continue-uri": "Falta la dirección de regreso del enlace de recuperación...",
        "auth/quota-exceeded": "Se alcanzó el límite de correos por hoy; inténtalo más tarde...",
        // REQ-167
        "dta/correo-sin-verificar": "Tu correo aún no está verificado. Abre el enlace que te enviamos (revisa también spam) y vuelve a entrar."
    };

    var CLAVE_MINIMA = 6;   // minimo de Firebase Authentication

    /**
     * REQ-164: validacion del alta (antes la contrasena se escribia una vez y no se validaba).
     * Devuelve el mensaje del primer problema, o "" si todo esta bien.
     */
    function validarAlta(correo, clave, confirmacion) {
        if (!esCorreoValido(correo)) return "Escribe un correo electrónico válido.";
        var c = String(clave || "");
        if (!c) return "Escribe una contraseña.";
        if (c.length < CLAVE_MINIMA) return "La contraseña debe tener al menos " + CLAVE_MINIMA + " caracteres.";
        if (/^\s|\s$/.test(c)) return "La contraseña no puede empezar ni terminar con espacios.";
        if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(c) || !/\d/.test(c)) return "Usa letras y números en la contraseña.";
        if (c !== String(confirmacion || "")) return "Las contraseñas no coinciden.";
        return "";
    }

    /** REQ-164: nivel de la contrasena para la barra de ayuda: 0 (vacia) a 3 (fuerte). */
    function fuerzaDeClave(clave) {
        var c = String(clave || "");
        if (!c) return 0;
        var puntos = 0;
        if (c.length >= CLAVE_MINIMA) puntos += 1;
        if (c.length >= 10) puntos += 1;
        if (/[a-z]/.test(c) && /[A-Z]/.test(c)) puntos += 1;
        if (/\d/.test(c) && /[^A-Za-z0-9]/.test(c)) puntos += 1;
        return c.length < CLAVE_MINIMA ? 1 : Math.min(3, Math.max(1, puntos));
    }

    /**
     * Parametros del proveedor de Google.
     * `select_account` obliga a Google a mostrar el selector de cuentas: sin el, si el navegador
     * ya tiene sesion de Google y la app esta autorizada, vuelve directo con la misma cuenta.
     */
    function opcionesDelProveedor() {
        return { prompt: "select_account" };
    }

    function debeReintentarConRedirect(codigo) {
        return CON_REDIRECT.indexOf(normalizar(codigo)) >= 0;
    }

    function mensajeDeError(error) {
        if (!error) return "";
        var codigo = normalizar(typeof error === "string" ? error : error.code);
        if (MENSAJES[codigo]) return MENSAJES[codigo];
        // REQ-039: con la proteccion contra enumeracion de correos, Firebase v8 devuelve
        // "auth/internal-error" y la causa real va dentro del mensaje.
        var detalle = typeof error === "object" && error.message ? String(error.message) : "";
        if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(detalle)) {
            return MENSAJES["auth/invalid-credential"];
        }
        return "No se pudo completar el acceso (" + (codigo || "error desconocido") + ").";
    }


    /**
     * REQ-025: distingue un error real de Firebase de un fallo de JavaScript.
     * El `beforeunload` roto lanzaba un TypeError dentro de `signInWithRedirect`, el `catch`
     * lo tomaba por un fallo de acceso y avisaba al usuario aunque el redirect siguiera en curso.
     */
    function esErrorDeFirebase(error) {
        if (!error) return false;
        var codigo = typeof error === "string" ? error : error.code;
        return normalizar(codigo).indexOf("auth/") === 0;
    }

    // REQ-035 - Dominio de autenticacion y metodo de acceso segun donde se sirve la app.

    /** Quita el puerto y pasa a minusculas: "Localhost:8090" -> "localhost". */
    function nombreDeHost(host) {
        var texto = String(host == null ? "" : host).trim().toLowerCase();
        if (texto.charAt(0) === "[") {
            var cierre = texto.indexOf("]");
            return cierre > 0 ? texto.slice(0, cierre + 1) : texto;
        }
        return texto.split(":")[0];
    }

    /** Desarrollo en el equipo o en la red local (movil contra el PC). */
    function esEntornoLocal(host) {
        var nombre = nombreDeHost(host);
        if (!nombre) return false;
        if (nombre === "localhost" || nombre === "127.0.0.1" || nombre === "[::1]") return true;
        if (/\.localhost$/.test(nombre)) return true;
        if (/^10\.\d+\.\d+\.\d+$/.test(nombre)) return true;
        if (/^192\.168\.\d+\.\d+$/.test(nombre)) return true;
        var privada172 = nombre.match(/^172\.(\d+)\.\d+\.\d+$/);
        return !!(privada172 && Number(privada172[1]) >= 16 && Number(privada172[1]) <= 31);
    }

    /** Dominios que sirve Firebase Hosting (sitio y canales de vista previa). */
    function esHostingDeFirebase(host) {
        return /(^|\.)[a-z0-9-]+\.(web\.app|firebaseapp\.com)$/.test(nombreDeHost(host));
    }

    /**
     * authDomain = el dominio que sirve la app (opcion 1 de la guia de Firebase para navegadores
     * que bloquean el almacenamiento de terceros). Si no es Firebase Hosting, se deja el de config.
     */
    function authDomainPara(host, porDefecto) {
        if (esHostingDeFirebase(host)) return nombreDeHost(host);
        return porDefecto;
    }

    /**
     * En local no existe /__/auth/handler en el mismo origen: la redireccion volveria sin sesion.
     * Ahi se usa el popup (el aviso de COOP en consola no impide el acceso). En hosting, redireccion.
     */
    function metodoDeAccesoGoogle(host) {
        return esEntornoLocal(host) ? "popup" : "redirect";
    }

    /**
     * Evento "sin sesion" del observador.
     * Se ignora solo si ya hubo sesion en esta carga y el usuario NO pidio salir (evento transitorio).
     * Si el usuario pidio salir, se respeta siempre (REQ-035 C-4).
     */
    function debeIgnorarSesionNula(estado) {
        var e = estado || {};
        return !!e.huboSesion && !e.cierrePedido;
    }

    /** REQ-039: formato de correo (antes $scope.loginEmailVerify leia el DOM). */
    function esCorreoValido(texto) {
        if (typeof texto !== "string") return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim());
    }

    /** REQ-039: el error debe verse? Cerrar la ventana de Google no es un error para el usuario. */
    // REQ-167: las cuentas de correo y contrasena creadas desde esta fecha deben verificar el correo para entrar. Las
    // anteriores no (nunca se les pidio y quedarian fuera). Google ya verifica el correo.
    var CORTE_VERIFICACION = Date.UTC(2026, 10, 24);

    /** El usuario de Firebase debe verificar su correo antes de entrar? */
    function requiereVerificacion(usuario) {
        var u = usuario || {};
        if (!u.email || u.emailVerified) return false;
        var proveedores = (u.providerData || []).map(function (p) { return p && p.providerId; });
        if (proveedores.indexOf("password") < 0 || proveedores.indexOf("google.com") >= 0) return false;
        var creada = Date.parse(u.metadata && u.metadata.creationTime);
        return isFinite(creada) && creada >= CORTE_VERIFICACION;
    }

    function debeAvisarError(error) {
        if (error && error.code === "dta/correo-sin-verificar") return true;
        if (!esErrorDeFirebase(error)) return false;
        var codigo = typeof error === "string" ? error : error.code;
        return !/popup-closed-by-user|cancelled-popup-request/.test(String(codigo));
    }

    return {
        esErrorDeFirebase: esErrorDeFirebase,
        esCorreoValido: esCorreoValido,
        validarAlta: validarAlta,
        fuerzaDeClave: fuerzaDeClave,
        CLAVE_MINIMA: CLAVE_MINIMA,
        debeAvisarError: debeAvisarError,
        requiereVerificacion: requiereVerificacion,
        CORTE_VERIFICACION: CORTE_VERIFICACION,
        opcionesDelProveedor: opcionesDelProveedor,
        debeReintentarConRedirect: debeReintentarConRedirect,
        mensajeDeError: mensajeDeError,
        esEntornoLocal: esEntornoLocal,
        esHostingDeFirebase: esHostingDeFirebase,
        authDomainPara: authDomainPara,
        metodoDeAccesoGoogle: metodoDeAccesoGoogle,
        debeIgnorarSesionNula: debeIgnorarSesionNula
    };
}));
