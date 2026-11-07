/**
 * REQ-066 - Unidades de temperatura (puro).
 *
 * El equipo manda la temperatura en °C y el servidor compara los umbrales de alerta (sensors.t.minValue /
 * maxValue) contra ese valor: se GUARDAN en °C. La interfaz los muestra y edita en la unidad del sistema
 * (`actualSystem.tempUnit`: "C" o "F"; sin valor = F, como el resto de la app).
 * UMD (navegador: DTALogic.unidades / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.unidades = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function esCelsius(unidad) {
        return unidad === "C";
    }

    function simbolo(unidad) {
        return esCelsius(unidad) ? "°C" : "°F";
    }

    function numero(valor) {
        if (valor === null || valor === undefined || valor === "") return null;
        var n = Number(String(valor).replace(",", "."));
        return isFinite(n) ? n : null;
    }

    function unDecimal(n) {
        return Math.round(n * 10) / 10;
    }

    /** °C guardado -> valor a mostrar en la unidad del sistema ("" si no hay valor). */
    function temperaturaParaMostrar(celsius, unidad) {
        var c = numero(celsius);
        if (c === null) return "";
        return unDecimal(esCelsius(unidad) ? c : c * 9 / 5 + 32);
    }

    /** Valor escrito en la unidad del sistema -> °C a guardar ("" si esta vacio o no es numero). */
    function temperaturaParaGuardar(valor, unidad) {
        var v = numero(valor);
        if (v === null) return "";
        return unDecimal(esCelsius(unidad) ? v : (v - 32) * 5 / 9);
    }

    return {
        esCelsius: esCelsius,
        simbolo: simbolo,
        temperaturaParaMostrar: temperaturaParaMostrar,
        temperaturaParaGuardar: temperaturaParaGuardar
    };
}));
