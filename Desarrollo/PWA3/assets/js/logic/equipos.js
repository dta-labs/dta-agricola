/**
 * REQ-013 - Reglas puras del dominio de equipos.
 *
 * Extraidas de core.js: decisiones que estaban embebidas entre asignaciones a $scope.
 * No conoce Angular, ni Firebase, ni el DOM.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./estado"));
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.equipos = factory(root.DTALogic.estado);
    }
}(typeof self !== "undefined" ? self : this, function (estado) {
    "use strict";

    var UMBRAL_MINUTOS = 10;   // por debajo no se considera retraso relevante

    /** Los equipos tipo Sensor guardan sus lecturas en dayLogs; el resto en logs. */
    function carpetaDeLogs(tipo) {
        return tipo === "Sensor" ? "dayLogs" : "logs";
    }

    /**
     * Carpeta para el HISTORICO: depende de la opcion temporal, no solo del tipo.
     * Las neveras guardan sus lecturas intradia en logs; dayLogs es el detalle diario de sensores.
     */
    function carpetaDeHistorico(tipo, opcion) {
        if (opcion !== "DIA" || tipo === "Nevera") return "logs";
        return "dayLogs";
    }

    /** Cuantas lecturas se piden al abrir el equipo, segun su tipo. */
    function registrosIniciales(tipo, limite) {
        if (tipo === "Sensor") return 7;
        if (tipo === "Nevera") return 300;
        return limite;
    }

    /** Anade la clave al documento del equipo. Devuelve null si no hay settings. */
    function normalizarSistema(settings, clave) {
        if (!settings) return null;
        var copia = {};
        for (var campo in settings) {
            if (Object.prototype.hasOwnProperty.call(settings, campo)) copia[campo] = settings[campo];
        }
        copia.key = clave;
        return copia;
    }

    /**
     * Etiqueta de retraso de comunicacion: "+Nd", "+Nh", "Nm" o "-1" si no aplica.
     * Solo cuenta si el equipo reporta seguridad y voltaje correctos (regla del original).
     */
    function etiquetaDeRetraso(log, ahora) {
        if (!log || !log.update) return "-1";
        if (log.safety !== "true" || log.voltage !== "true") return "-1";
        var dif = estado.getTimeDiference(log.update, null, ahora);
        if (!dif) return "-1";
        if (dif.day >= 1) return "+" + dif.day + "d";
        if (dif.hour >= 1) return "+" + dif.hour + "h";
        if (dif.min >= UMBRAL_MINUTOS) return dif.min + "m";
        return "-1";
    }

    /**
     * Sensores en alarma termica: temperatura por debajo del minimo configurado.
     * Devuelve [{ sensor, alias, tempC, tempF }].
     */
    function alarmasDeSensores(sistema, datos) {
        var alarmas = [];
        if (!sistema || sistema.type !== "Sensor") return alarmas;
        if (!sistema.sensors || !Array.isArray(datos)) return alarmas;

        var total = Number(sistema.sensors.sensorNumber) || 0;
        for (var i = 0; i < total; i += 1) {
            var sensor = "S" + i;
            var config = sistema.sensors[sensor];
            if (!config || !config.t || !config.t.notify) continue;
            var tempC = Number(datos[i * 8 + 2]);
            if (Number.isNaN(tempC)) continue;                       // medida invalida
            if (tempC > Number(config.t.minValue)) continue;          // no baja del minimo
            alarmas.push({
                sensor: sensor,
                alias: config.alias != null ? config.alias : config.id,
                tempC: tempC,
                tempF: tempC * 9 / 5 + 32
            });
        }
        return alarmas;
    }

    /** Texto de la alerta, con el formato que ya usaba la aplicacion. */
    function mensajeDeAlarma(alarma, nombreSistema) {
        return "Alerta " + alarma.tempC + "\u00b0C/" + alarma.tempF.toFixed(1) + "\u00b0F en "
            + nombreSistema + " - " + alarma.alias + " ";
    }

    return {
        UMBRAL_MINUTOS: UMBRAL_MINUTOS,
        carpetaDeLogs: carpetaDeLogs,
        carpetaDeHistorico: carpetaDeHistorico,
        registrosIniciales: registrosIniciales,
        normalizarSistema: normalizarSistema,
        etiquetaDeRetraso: etiquetaDeRetraso,
        alarmasDeSensores: alarmasDeSensores,
        mensajeDeAlarma: mensajeDeAlarma
    };
}));
