/**
 * REQ-061 - Reglas de la parcela del estacionario (puras: sin DOM ni Firebase).
 *
 * Configuracion del riego a demanda (`plots[pN].irrigationConfig`): mismos valores por defecto y limites
 * que validateIrrigationconfig de core.js, con una diferencia que corrige un defecto: un 0 escrito por el
 * usuario se respeta (antes `!valor ? defecto` convertia 0 °C de paro en 20 °C, 0 % en -30 %, etc.).
 * UMD (navegador: DTALogic.parcela / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.parcela = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var INTERRUPTORES = ["isAdjustReduction", "isAdjustFrecuency", "isAdjustIncrement", "isStopByRainDay",
        "isStopByRainWeek", "isStopByTemp", "isStopByWind", "isStopByRainProbability"];

    // [valor por defecto, minimo, maximo] (null = sin limite)
    var NUMEROS = {
        reductionPercent: [-30, -100, 0],
        reductionTemp: [25, -10, 70],
        incrementPercent: [50, 0, 100],
        stopByTemp: [20, -10, 70],
        stopByRainProbability: [80, 0, 100],
        stopByWind: [100, 0, null],
        stopByRainDay: [3, 0, null],
        stopByRainWeek: [30, 0, null]
    };

    function vacio(valor) {
        return valor === undefined || valor === null || valor === "" || (typeof valor === "number" && !isFinite(valor));
    }

    /** Configuracion completa y dentro de limites. Devuelve un objeto nuevo (no modifica la entrada). */
    function normalizarConfiguracion(config) {
        var c = config && typeof config === "object" ? config : {};
        var salida = {};
        INTERRUPTORES.forEach(function (k) { salida[k] = !!c[k]; });
        Object.keys(NUMEROS).forEach(function (k) {
            var regla = NUMEROS[k];
            var n = vacio(c[k]) ? NaN : Number(c[k]);
            if (!isFinite(n)) n = regla[0];
            if (regla[1] !== null && n < regla[1]) n = regla[1];
            if (regla[2] !== null && n > regla[2]) n = regla[2];
            salida[k] = n;
        });
        return salida;
    }

    var MS_DIA = 86400000, MS_HORA = 3600000, MS_MINUTO = 60000;

    /** ms -> { dias, horas, minutos } (enteros). */
    function duracionDesdeMs(ms) {
        var total = parseInt(ms, 10);
        if (!isFinite(total) || total < 0) total = 0;
        return {
            dias: Math.floor(total / MS_DIA),
            horas: Math.floor((total % MS_DIA) / MS_HORA),
            minutos: Math.floor((total % MS_HORA) / MS_MINUTO)
        };
    }

    /** { dias, horas, minutos } -> ms (vacios cuentan 0). */
    function msDesdeDuracion(d) {
        var x = d || {};
        var parte = function (v) { var n = parseInt(v, 10); return isFinite(n) && n > 0 ? n : 0; };
        return parte(x.dias) * MS_DIA + parte(x.horas) * MS_HORA + parte(x.minutos) * MS_MINUTO;
    }

    return {
        normalizarConfiguracion: normalizarConfiguracion,
        duracionDesdeMs: duracionDesdeMs,
        msDesdeDuracion: msDesdeDuracion,
        INTERRUPTORES: INTERRUPTORES
    };
}));
