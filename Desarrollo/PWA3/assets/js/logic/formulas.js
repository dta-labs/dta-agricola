/**
 * REQ-001 - Formulas puras.
 *
 * UMD: funciona en el navegador (global DTALogic.formulas) y en Node (module.exports),
 * para poder probarlo sin DOM.
 *
 * Comportamiento extraido LITERALMENTE de core.js (caracterizacion): no se corrige nada aqui.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.formulas = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    /** Escala lineal de un valor entre [inMin,inMax] a [outMin,outMax]. */
    function mapping(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    /** Limita value al rango [min,max]. */
    function constraining(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /** Conductividad (cb) a porcentaje de humedad, por tramos. null si no hay medida valida. */
    function cbToPercent(cbValue) {
        if (cbValue === null || isNaN(cbValue) || cbValue >= 240) return null;
        let percent = 0;
        if (cbValue <= 10) percent = mapping(cbValue, 0, 10, 100, 80);
        else if (cbValue <= 30) percent = mapping(cbValue, 10, 30, 80, 60);
        else if (cbValue <= 60) percent = mapping(cbValue, 30, 60, 60, 40);
        else if (cbValue <= 100) percent = mapping(cbValue, 60, 100, 40, 30);
        else if (cbValue <= 150) percent = mapping(cbValue, 100, 150, 30, 20);
        else percent = mapping(cbValue, 150, 240, 20, 0);
        return Math.round(constraining(percent, 0, 100));
    }

    return { mapping: mapping, constraining: constraining, cbToPercent: cbToPercent };
}));
