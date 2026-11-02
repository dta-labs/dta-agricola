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
        var partes = String(fechaStr).trim().split(/\s+/);
        if (partes.length !== 3) {
            throw new RangeError("Fecha no reconocida: \"" + fechaStr + "\"");
        }
        var mesStr = partes[0];
        var year = parseInt(partes[2], 10);
        var day = parseInt(String(partes[1]).replace(",", ""), 10);
        var month = MESES.indexOf(mesStr) + 1;
        // D-04 (REQ-007): antes un mes desconocido daba month = 0, es decir diciembre del ano
        // anterior, corrompiendo la fecha en silencio. Ahora falla de forma explicita.
        if (month === 0) {
            throw new RangeError("Mes no reconocido en \"" + fechaStr + "\"");
        }
        if (!Number.isFinite(year) || !Number.isFinite(day)) {
            throw new RangeError("Dia o ano no numericos en \"" + fechaStr + "\"");
        }
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
        // D-02 (REQ-007): AM/PM sin importar mayusculas. Si no hay sufijo ("18:05"), no se toca.
        var ampm = String(horaStr).trim().slice(-2).toLowerCase();
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
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
