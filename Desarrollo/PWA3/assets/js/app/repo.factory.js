/**
 * REQ-038 / REQ-040 - dtaRepo: el repositorio de datos (services/repositorio.js) por inyeccion.
 *
 * Es el mismo objeto que core.js usa como `repoDTA` (creado en firebaseComm.js). Delgada a proposito.
 */
(function (raiz) {
    "use strict";

    function crear(repositorio) {
        if (!repositorio) {
            throw new Error("dtaRepo: repositorio no inicializado (revisa el orden de services/ y firebaseComm.js)");
        }
        return repositorio;
    }

    if (typeof module !== "undefined" && module.exports) module.exports = { crear: crear };
    if (raiz.angular) {
        raiz.angular.module("Administracion").factory("dtaRepo", function () {
            return crear(raiz.repoDTA);
        });
    }
})(typeof window !== "undefined" ? window : globalThis);
