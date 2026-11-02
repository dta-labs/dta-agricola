/**
 * REQ-010 - Adaptador de infraestructura: traduce el repositorio a Firebase Realtime Database.
 *
 * Es la UNICA pieza que conoce `firebase`. El repositorio solo sabe de rutas y consultas, y por
 * tanto se puede probar con un adaptador falso (ver test/unit/repositorio.test.js).
 *
 * Devuelve SIEMPRE el snapshot de Firebase, no `val()`: asi los consumidores existentes de core.js
 * siguen funcionando sin cambios de semantica.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.adaptadorFirebase = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function crear(database) {
        if (!database || typeof database.ref !== "function") {
            throw new Error("adaptadorFirebase: falta la instancia de database");
        }

        function ref(ruta) {
            return database.ref(ruta);
        }

        return {
            /** Escucha cambios. Devuelve una funcion para cancelar. */
            escuchar: function (ruta, alCambiar, alError) {
                var consulta = ref(ruta);
                consulta.on("value", alCambiar, alError);
                return function () { consulta.off("value", alCambiar); };
            },

            /** Escucha los ultimos N registros. Devuelve una funcion para cancelar. */
            escucharUltimos: function (ruta, n, alCambiar, alError) {
                var consulta = ref(ruta).limitToLast(n);
                consulta.on("value", alCambiar, alError);
                return function () { consulta.off("value", alCambiar); };
            },

            /** Lee una vez. Devuelve el snapshot. */
            leer: function (ruta) {
                return ref(ruta).once("value");
            },

            /** Lee una vez los ultimos N registros. Devuelve el snapshot. */
            leerUltimos: function (ruta, n) {
                return ref(ruta).limitToLast(n).once("value");
            },

            /** Lee una vez un rango por hijo. Devuelve el snapshot. */
            leerRango: function (ruta, campo, desde, hasta) {
                return ref(ruta).orderByChild(campo).startAt(desde).endAt(hasta).once("value");
            }
        };
    }

    return { crear: crear };
}));
