/**
 * REQ-012 - Servicio de autenticacion: lo que la aplicacion necesita saber de la sesion.
 *
 * No conoce Firebase: recibe un adaptador. Asi el controlador no habla con `firebase.auth()`.
 *
 * El callback de `observar` recibe SIEMPRE un objeto normalizado:
 *   { autenticado: boolean, usuario: object|null }
 * que evita el `user.email ? user : user.user` repartido por el controlador.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.autenticacion = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function normalizar(usuario) {
        if (!usuario) return { autenticado: false, usuario: null };
        // FirebaseUI entrega a veces un envoltorio con `.user`; se acepta cualquiera de las dos formas.
        var real = usuario.email ? usuario : (usuario.user || null);
        if (!real) return { autenticado: false, usuario: null };
        return { autenticado: true, usuario: real };
    }

    function crear(adaptador) {
        if (!adaptador) throw new Error("autenticacion: falta el adaptador");
        if (typeof adaptador.observar !== "function") {
            throw new Error("autenticacion: el adaptador no implementa observar()");
        }
        if (typeof adaptador.cerrarSesion !== "function") {
            throw new Error("autenticacion: el adaptador no implementa cerrarSesion()");
        }
        return {
            /** Al cambiar la sesion: { autenticado, usuario } */
            observar: function (alCambiar) {
                if (typeof alCambiar !== "function") {
                    throw new Error("autenticacion: observar() necesita una funcion");
                }
                adaptador.observar(function (usuario) {
                    alCambiar(normalizar(usuario));
                });
            },
            /** Cierra la sesion. Devuelve la promesa del adaptador. */
            cerrarSesion: function () {
                return adaptador.cerrarSesion();
            }
        };
    }

    return { crear: crear, _normalizar: normalizar };
}));
