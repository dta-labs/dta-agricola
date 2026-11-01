/**
 * REQ-004.4 - Generacion de identificadores unicos de cliente.
 * UMD. Se usa para agrupar las entradas de un mismo plan de riego.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.ids = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    /** Base36 del instante + 5 caracteres aleatorios. */
    function generarIdUnico() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    return { generarIdUnico: generarIdUnico };
}));
