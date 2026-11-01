/**
 * REQ-004 - Estado y tiempos de un equipo a partir de la marca de tiempo del dispositivo.
 *
 * UMD (navegador: DTALogic.estado / Node: module.exports).
 * Comportamiento extraido de core.js; los defectos se CONSERVAN y se documentan en
 * docs/spec/REQ-004-devices.md (D-07..D-11).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.estado = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    /**
     * Marca de tiempo del dispositivo ("YYYYMMDD HHMMam|pm") -> milisegundos (hora local).
     * DEFECTO D-08 CONSERVADO: "12pm" se convierte en la hora 24 (deberia ser 12).
     */
    function instanteDeFechaDispositivo(texto) {
        var anio = parseInt(texto.substring(0, 4), 10);
        var mes = parseInt(texto.substring(4, 6), 10) - 1;
        var dia = parseInt(texto.substring(6, 8), 10);
        var horaCruda = parseInt(texto.substring(9, 11), 10);
        var minuto = parseInt(texto.substring(11, 13), 10);
        var sufijo = texto.substring(13, 15);
        var hora = sufijo === "pm" ? horaCruda + 12 : (horaCruda === 12 ? 0 : horaCruda);
        return new Date(anio, mes, dia, hora, minuto, 0, 0).getTime();
    }

    /**
     * Diferencia entre la fecha del equipo y la de actualizacion.
     * DEFECTO D-07 CONSERVADO: sin `update` devuelve el NUMERO 0, no {day,hour,min}.
     * DEFECTO D-11 CONSERVADO: la rama `new Date()` es inalcanzable por el guard inicial.
     */
    function getTimeDiference(date, update) {
        if (update === undefined) update = null;
        if (!date || !update) return 0;
        var dDate = instanteDeFechaDispositivo(date);
        var dUpdate = instanteDeFechaDispositivo(update);
        var dif = dUpdate - dDate;
        return {
            day: parseInt(dif / (1000 * 60 * 60 * 24), 10),
            hour: parseInt(dif / (1000 * 60 * 60), 10),
            min: parseInt(dif / (1000 * 60), 10)
        };
    }

    /**
     * Etiqueta de retraso para la UI: "+Nd", "+Nh", "Nm" o "-1" (sin retraso relevante).
     * DEFECTO D-10 CONSERVADO: recibe `update` pero lo ignora, pasando siempre null.
     * Consecuencia (D-07): siempre devuelve "-1".
     */
    function calcStatusTime(date, update) {
        var dif = getTimeDiference(date, null);
        var result = "-1";
        if (dif.day >= 1 || dif.hour >= 1 || dif.min >= 10) {
            result = dif.day >= 1 ? ("+" + dif.day + "d") : dif.hour >= 1 ? ("+" + dif.hour + "h") : ("" + dif.min + "m");
        }
        return result;
    }

    return {
        instanteDeFechaDispositivo: instanteDeFechaDispositivo,
        getTimeDiference: getTimeDiference,
        calcStatusTime: calcStatusTime
    };
}));
