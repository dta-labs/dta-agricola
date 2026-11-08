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

    var contador = 0;

    function aleatorio(longitud) {
        var texto = "";
        while (texto.length < longitud) texto += Math.random().toString(36).slice(2);
        return texto.slice(0, longitud);
    }

    /**
     * Base36 del instante + contador + 6 caracteres aleatorios.
     * Antes eran solo 5 aleatorios (a veces menos: Math.random().toString(36) puede salir corto) y en el mismo
     * milisegundo podian repetirse (la prueba REQ-004.8 fallaba ~1 vez de cada 100).
     */
    function generarIdUnico() {
        contador = (contador + 1) % 1296;   // 2 cifras base36
        return Date.now().toString(36) + ("0" + contador.toString(36)).slice(-2) + aleatorio(6);
    }

    return { generarIdUnico: generarIdUnico };
}));
