/**
 * REQ-012 - Adaptador de infraestructura para autenticacion (unico que toca firebase.auth()).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.adaptadorFirebaseAuth = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function crear(auth) {
        if (!auth || typeof auth.onAuthStateChanged !== "function") {
            throw new Error("adaptadorFirebaseAuth: falta la instancia de auth");
        }
        return {
            observar: function (alCambiar) {
                auth.onAuthStateChanged(alCambiar);
            },
            cerrarSesion: function () {
                return auth.signOut();
            }
        };
    }

    return { crear: crear };
}));
