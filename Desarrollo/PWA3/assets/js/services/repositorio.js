/**
 * REQ-010 - Repositorio: conoce el ESQUEMA de la base de datos y construye las rutas.
 *
 * No sabe nada de Firebase ni de Angular: recibe un adaptador con los metodos minimos.
 * Asi el esquema (que es la parte valiosa y facil de romper) queda cubierto por pruebas.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.repositorio = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var SUFIJO_MAXIMO = "\uf8ff";   // idioma de Firebase para "hasta el final de este prefijo"

    function sinBarrasIniciales(segmento) {
        return String(segmento == null ? "" : segmento).replace(/^\/+/, "");
    }

    function rutaSistema(clave, resto) {
        var base = "systems/" + clave;
        var cola = sinBarrasIniciales(resto);
        return cola ? base + "/" + cola : base;
    }

    var METODOS = ["escuchar", "escucharUltimos", "leer", "leerUltimos", "leerRango"];

    function crear(adaptador) {
        if (!adaptador) throw new Error("repositorio: falta el adaptador");

        var metodos = {};
        METODOS.forEach(function (nombre) {
            if (typeof adaptador[nombre] !== "function") {
                throw new Error("repositorio: el adaptador no implementa " + nombre + "()");
            }
            metodos[nombre] = adaptador[nombre].bind(adaptador);
        });

        function suscripcion(ruta, cancelar) {
            return {
                ruta: ruta,
                off: typeof cancelar === "function" ? cancelar : function () {}
            };
        }

        return {
            /** systems/{clave}/settings */
            escucharSistema: function (clave, alCambiar, alError) {
                var ruta = rutaSistema(clave, "settings");
                return suscripcion(ruta, metodos.escuchar(ruta, alCambiar, alError));
            },

            /** systems/{clave}/users */
            escucharUsuariosSistema: function (clave, alCambiar, alError) {
                var ruta = rutaSistema(clave, "users");
                return suscripcion(ruta, metodos.escuchar(ruta, alCambiar, alError));
            },

            /** systems/{clave}/{directorio} limitToLast(1) en vivo */
            escucharUltimoLog: function (clave, directorio, alCambiar, alError) {
                var ruta = rutaSistema(clave, directorio);
                return suscripcion(ruta, metodos.escucharUltimos(ruta, 1, alCambiar, alError));
            },

            /** systems/{clave}/{directorio} limitToLast(registros) */
            leerLogs: function (clave, directorio, registros) {
                return metodos.leerUltimos(rutaSistema(clave, directorio), registros);
            },

            /** systems/{clave}/{directorio} por rango de "date" */
            leerLogsPorRango: function (clave, directorio, desde, hasta) {
                return metodos.leerRango(rutaSistema(clave, directorio), "date", desde, hasta + SUFIJO_MAXIMO);
            },

            /** cultivos */
            leerCultivos: function () {
                return metodos.leer("cultivos");
            },

            /** configurations/{tipo} */
            leerConfiguracion: function (tipo) {
                return metodos.leer("configurations/" + tipo);
            },

            /** Solo para pruebas y diagnostico. */
            _rutas: { sistema: rutaSistema }
        };
    }

    return { crear: crear };
}));
