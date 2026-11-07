/**
 * REQ-038 - dtaReglas: las reglas puras de logic/ disponibles por inyeccion.
 *
 * Delgada a proposito: no anade reglas. Los componentes piden `dtaReglas.login`, `dtaReglas.perfil`...
 * en lugar de leer la global `DTALogic`, asi en las pruebas se sustituye por un doble.
 */
(function (raiz) {
    "use strict";

    function crear(dtaLogic) {
        if (!dtaLogic) throw new Error("dtaReglas: falta DTALogic");
        return dtaLogic;
    }

    if (typeof module !== "undefined" && module.exports) module.exports = { crear: crear };
    if (raiz.angular) {
        raiz.angular.module("Administracion").factory("dtaReglas", function () {
            return crear(raiz.DTALogic);
        });
    }
})(typeof window !== "undefined" ? window : globalThis);
