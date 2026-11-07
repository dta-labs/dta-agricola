/**
 * REQ-057 - Reglas de los paneles de "Sistema" (puras: sin DOM ni Firebase).
 *
 * Antes eran expresiones repetidas en index.html (senal en %, GPS, comunicacion, seguridad, duracion,
 * botones encendidos). Se conservan exactamente los mismos criterios.
 * UMD (navegador: DTALogic.panel / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.panel = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var SENAL_MAXIMA = 30;          // la senal del modem llega en 0..30 (CSQ)
    var COORDENADA_VACIA = "0.00000";

    /** Senal del modem en % (0..100, entero). Sin dato: 0. */
    function porcentajeSenal(senal) {
        var n = Number(senal);
        if (!senal || !isFinite(n) || n <= 0) return 0;
        return Math.min(100, Math.round(n * 100 / SENAL_MAXIMA));
    }

    /** Comunicacion correcta: recepcion "Ok" y sin retraso ("-1"). */
    function comunicacionOk(log) {
        return !!log && log.reception === "Ok" && String(log.commDelay) === "-1";
    }

    /** GPS con posicion (el equipo manda "0.00000" cuando no tiene). */
    function gpsOk(log) {
        return !!log && log.latitude !== undefined && log.longitude !== undefined &&
            String(log.latitude) !== COORDENADA_VACIA && String(log.longitude) !== COORDENADA_VACIA;
    }

    /** Seguridad del pivote activa (llega como texto "true"). */
    function seguridadOk(log) {
        return !!log && String(log.safety) === "true";
    }

    /**
     * Que boton de movimiento esta "encendido".
     * status: el equipo esta en marcha; direction: true hacia adelante.
     */
    function botonesMovimiento(sistema) {
        var s = sistema || {};
        var enMarcha = !!s.status;
        return {
            retroceso: enMarcha && !s.direction,
            detener: !enMarcha,
            avance: enMarcha && !!s.direction
        };
    }

    function dosDigitos(n) {
        return String(n).padStart(2, "0");
    }

    /** Milisegundos -> "dd:hh:mm" (como getDayFromMs/getHourFromMs/getMinutesFromMs). */
    function duracionTexto(ms) {
        var total = parseInt(ms, 10);
        if (!isFinite(total) || total < 0) total = 0;
        var dias = Math.floor(total / 86400000);
        var horas = Math.floor((total % 86400000) / 3600000);
        var minutos = Math.floor((total % 3600000) / 60000);
        return dosDigitos(dias) + ":" + dosDigitos(horas) + ":" + dosDigitos(minutos);
    }

    /** Parcela en curso de un sistema con parcelas (pozo, estacionario). */
    function parcelaActual(sistema) {
        if (!sistema || !sistema.plots || sistema.position === undefined || sistema.position === null) return null;
        return sistema.plots["p" + sistema.position] || null;
    }

    /** Bateria en % desde el voltaje (2.8 V = 0 %, 3.3 V = 100 %), como texto entero: igual que voltageToPercent. */
    function porcentajeBateria(voltaje) {
        var minimo = 2.8, maximo = 3.3;
        return (Math.max(0, Math.min(100, ((voltaje - minimo) / (maximo - minimo)) * 100))).toFixed(0);
    }

    return {
        porcentajeSenal: porcentajeSenal,
        porcentajeBateria: porcentajeBateria,
        comunicacionOk: comunicacionOk,
        gpsOk: gpsOk,
        seguridadOk: seguridadOk,
        botonesMovimiento: botonesMovimiento,
        duracionTexto: duracionTexto,
        parcelaActual: parcelaActual
    };
}));
