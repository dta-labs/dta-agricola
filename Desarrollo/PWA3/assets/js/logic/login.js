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
        "auth/cancelled-popup-request": "Se canceló la ventana de acceso..."
    };

    function debeReintentarConRedirect(codigo) {
        return CON_REDIRECT.indexOf(normalizar(codigo)) >= 0;
    }

    function mensajeDeError(error) {
        if (!error) return "";
        var codigo = normalizar(typeof error === "string" ? error : error.code);
        if (MENSAJES[codigo]) return MENSAJES[codigo];
        return "No se pudo completar el acceso (" + (codigo || "error desconocido") + ").";
    }

    return {
        debeReintentarConRedirect: debeReintentarConRedirect,
        mensajeDeError: mensajeDeError
    };
}));
