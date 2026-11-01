/**
 * REQ-002 - Fechas y horas del dominio.
 *
 * UMD (navegador: DTALogic.fechas / Node: module.exports).
 * Comportamiento extraido LITERALMENTE de core.js. Ver docs/spec/REQ-001-logica-pura.md
 * para los defectos conocidos que se conservan a proposito en esta fase.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.fechas = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /**
     * "Apr 25, 2026" -> { year, month (1-12), day }.
     * DEFECTO CONSERVADO: en core.js year/day/month no se declaraban (variables globales implicitas).
     * Aqui se declaran con const: mismo resultado, sin contaminar el ambito.
     */
    function parseFechaHora2(fechaStr) {
        var partes = String(fechaStr).split(" ");
        var mesStr = partes[0];
        var diaStr = partes[1];
        var anioStr = partes[2];
        var year = parseInt(anioStr, 10);
        var day = parseInt(String(diaStr).replace(",", ""), 10);
        var month = MESES.indexOf(mesStr) + 1;
        return { year: year, month: month, day: day };
    }

    /**
     * (fecha, hora) -> Date en hora local.
     * Acepta fecha ISO "YYYY-MM-DD" o "Apr 25, 2026"; hora "HH:mm AM|PM".
     * DEFECTO CONSERVADO: solo reconoce AM/PM en MAYUSCULAS (horaStr.slice(-2)).
     */
    function parseFechaHora(fechaStr, horaStr) {
        var year, month, day;
        if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
            var iso = fechaStr.split("-").map(Number);
            year = iso[0]; month = iso[1] - 1; day = iso[2];
        } else {
            var objDate = parseFechaHora2(fechaStr);
            year = objDate.year;
            month = objDate.month - 1;
            day = objDate.day;
        }
        var horaPartes = String(horaStr).split(/[: ]/);
        var hour = parseInt(horaPartes[0], 10);
        var minute = parseInt(horaPartes[1], 10);
        var ampm = String(horaStr).slice(-2);
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
        return new Date(year, month, day, hour, minute);
    }

    /** Compara dos fechas a nivel de dia (ambas a las 00:00 locales). */
    function menorIgual(f1, f2) {
        var d1 = parseFechaHora(f1, "0:0am");
        var d2 = parseFechaHora(f2, "0:0am");
        return d1.getTime() <= d2.getTime();
    }

    return { parseFechaHora2: parseFechaHora2, parseFechaHora: parseFechaHora, menorIgual: menorIgual };
}));
