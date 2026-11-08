/**
 * REQ-004 + REQ-005 - Estado y tiempos de un equipo a partir de la marca del dispositivo.
 *
 * UMD (navegador: DTALogic.estado / Node: module.exports).
 *
 * REQ-005 corrige tres defectos de la version original de core.js:
 *   D-07  getTimeDiference devolvia el numero 0 cuando faltaba `update`
 *   D-08  "12pm" se convertia en la hora 24 (el dia siguiente)
 *   D-10  calcStatusTime recibia `update` y lo ignoraba
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
     * 12pm son las 12:00 y 12am las 00:00 (REQ-005.4).
     */
    function instanteDeFechaDispositivo(texto) {
        var cadena = String(texto);
        var anio = parseInt(cadena.substring(0, 4), 10);
        var mes = parseInt(cadena.substring(4, 6), 10) - 1;
        var dia = parseInt(cadena.substring(6, 8), 10);
        var horaCruda = parseInt(cadena.substring(9, 11), 10);
        var minuto = parseInt(cadena.substring(11, 13), 10);
        var sufijo = cadena.substring(13, 15);
        var hora = (sufijo === "pm") ? (horaCruda % 12) + 12 : (horaCruda % 12);
        return new Date(anio, mes, dia, hora, minuto, 0, 0).getTime();
    }

    /**
     * Diferencia desde la marca del equipo hasta `update`; si no hay `update`, hasta AHORA.
     *
     * Contrato (REQ-005.1, REQ-005.3):
     *   - sin marca del equipo  -> null
     *   - en cualquier otro caso -> { day, hour, min }  (nunca un numero)
     *
     * `ahora` se inyecta para poder probar el caso "sin update" de forma determinista.
     */
    function getTimeDiference(date, update, ahora) {
        if (!date) return null;
        var reloj = typeof ahora === "function" ? ahora() : Date.now();
        var dDate = instanteDeFechaDispositivo(date);
        var dUpdate = update ? instanteDeFechaDispositivo(update) : reloj;
        var dif = dUpdate - dDate;
        return {
            day: parseInt(dif / (1000 * 60 * 60 * 24), 10),
            hour: parseInt(dif / (1000 * 60 * 60), 10),
            min: parseInt(dif / (1000 * 60), 10)
        };
    }

    /**
     * Etiqueta de retraso para la UI: "+Nd", "+Nh", "Nm" o "-1" (sin retraso relevante).
     * Usa `update` cuando se le pasa (REQ-005.6); si no, mide contra ahora.
     */
    function calcStatusTime(date, update, ahora) {
        var dif = getTimeDiference(date, update, ahora);
        if (!dif) return "-1";
        if (dif.day >= 1) return "+" + dif.day + "d";
        if (dif.hour >= 1) return "+" + dif.hour + "h";
        if (dif.min >= 10) return dif.min + "m";
        return "-1";
    }

    /**
     * REQ-072: ¿la lectura es vieja? (MAS de `horas` desde log.date; por defecto 24). Sin fecha: no se sabe -> false.
     * Devuelve { vieja, horas } (horas transcurridas, entero) para poder decir hace cuanto fue.
     */
    function antiguedadDeLectura(date, ahora, horas) {
        if (!date) return { vieja: false, horas: null };
        var instante = instanteDeFechaDispositivo(date);
        if (!isFinite(instante)) return { vieja: false, horas: null };
        var reloj = typeof ahora === "function" ? ahora() : (typeof ahora === "number" ? ahora : Date.now());
        var transcurridas = Math.floor((reloj - instante) / 3600000);
        return { vieja: (reloj - instante) > (horas || 24) * 3600000, horas: transcurridas };   // MAS de 24 h
    }

    /** "hace 3 d" / "hace 26 h" para la etiqueta del mapa. */
    function textoAntiguedad(horas) {
        if (horas === null || horas === undefined) return "";
        return horas >= 48 ? "hace " + Math.floor(horas / 24) + " d" : "hace " + horas + " h";
    }

    return {
        instanteDeFechaDispositivo: instanteDeFechaDispositivo,
        antiguedadDeLectura: antiguedadDeLectura,
        textoAntiguedad: textoAntiguedad,
        getTimeDiference: getTimeDiference,
        calcStatusTime: calcStatusTime
    };
}));
