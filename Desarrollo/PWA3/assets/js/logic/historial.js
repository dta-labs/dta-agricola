/**
 * REQ-126 - Colores de los datos del historial de los sensores (puro, UMD: DTALogic.historial / Node).
 *
 *   Humedad del suelo (%): segun la capacidad de campo (CC) del sensor.
 *     CC = umbral "No regar" (sensor.h.maxValue, 60 % si no hay); umbral de riego = "Regar" (h.minValue, 25 %).
 *     >= CC azul (sobre capacidad de campo) · entre riego y CC verde · por debajo del riego rojo.
 *   Tension (cb, tensiometro WM): < 10 azul · < 30 verde · < 60 amarillo · 60+ rojo. 0 ("no listo"), 240 (error),
 *     negativos o sin dato: gris.
 *   Temperatura: umbrales del sensor (t.minValue / t.maxValue); sin umbrales, 2 y 20 °C.
 *     < Tmin azul · entre Tmin y Tmax verde · Tmax o mas rojo.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.historial = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var COLORES = { azul: "#1e88e5", verde: "#2e7d32", amarillo: "#f9a825", rojo: "#d32f2f", gris: "#9e9e9e" };
    var HUMEDAD_POR_DEFECTO = { riego: 25, cc: 60 };
    var TEMPERATURA_POR_DEFECTO = { min: 2, max: 20 };
    var CB_ERROR = 240;

    function numero(valor) {
        if (valor === null || valor === undefined || valor === "" || valor === "NaN" || valor === "NAN") return null;
        var n = Number(String(valor).replace(",", "."));
        return isFinite(n) ? n : null;
    }

    function par(minimo, maximo) {
        var a = numero(minimo), b = numero(maximo);
        if (a === null || b === null || a >= b) return null;
        return [a, b];
    }

    /** { riego, cc } del sensor (%): umbral de riego y capacidad de campo. */
    function limitesDeHumedad(sensor) {
        var h = (sensor && sensor.h) || {};
        var p = par(h.minValue, h.maxValue);
        return p ? { riego: p[0], cc: p[1] } : { riego: HUMEDAD_POR_DEFECTO.riego, cc: HUMEDAD_POR_DEFECTO.cc };
    }

    /** { min, max } de temperatura (°C) del sensor; 2 y 20 °C si no tiene umbrales validos. */
    function limitesDeTemperatura(sensor) {
        var t = (sensor && sensor.t) || {};
        var p = par(t.minValue, t.maxValue);
        return p ? { min: p[0], max: p[1] } : { min: TEMPERATURA_POR_DEFECTO.min, max: TEMPERATURA_POR_DEFECTO.max };
    }

    function colorDeHumedad(sensor, valor) {
        var v = numero(valor);
        if (v === null || v === -99 || v < 0) return COLORES.gris;
        var l = limitesDeHumedad(sensor);
        if (v >= l.cc) return COLORES.azul;
        if (v >= l.riego) return COLORES.verde;
        return COLORES.rojo;
    }

    function colorDeTension(valor) {
        var cb = numero(valor);
        if (cb === null || cb <= 0 || cb >= CB_ERROR) return COLORES.gris;
        if (cb < 10) return COLORES.azul;
        if (cb < 30) return COLORES.verde;
        if (cb < 60) return COLORES.amarillo;
        return COLORES.rojo;
    }

    function colorDeTemperatura(sensor, celsius) {
        var c = numero(celsius);
        if (c === null) return COLORES.gris;
        var l = limitesDeTemperatura(sensor);
        if (c < l.min) return COLORES.azul;
        if (c >= l.max) return COLORES.rojo;
        return COLORES.verde;
    }

    // ---------- REQ-127: agua disponible (tensiometro WM) ----------

    /** Lectura de tension valida en cb, o null: 0 = "no listo", 240 o mas = error, negativos (-99) = sin dato. */
    function cbValido(valor) {
        var cb = numero(valor);
        return cb === null || cb <= 0 || cb >= CB_ERROR ? null : cb;
    }

    // Tramos de formulas.cbToPercent: [cb desde, cb hasta, % desde, % hasta]
    var TRAMOS_CB = [[0, 10, 100, 80], [10, 30, 80, 60], [30, 60, 60, 40], [60, 100, 40, 30], [100, 150, 30, 20], [150, 240, 20, 0]];

    /** Inversa de formulas.cbToPercent: cb que corresponde a un % de agua disponible (para el eje de la grafica). */
    function cbDeAguaDisponible(porcentaje) {
        var p = numero(porcentaje);
        if (p === null) return null;
        p = Math.max(0, Math.min(100, p));
        for (var i = 0; i < TRAMOS_CB.length; i += 1) {
            var t = TRAMOS_CB[i];
            if (p <= t[2] && p >= t[3]) return t[0] + (t[2] - p) / (t[2] - t[3]) * (t[1] - t[0]);
        }
        return null;
    }

    /** Color de un dato de la tabla del historial: medida "humedad" (% o cb segun el sensor) o "temperatura" (°C). */
    function color(sensor, medida, valor) {
        if (medida === "temperatura") return colorDeTemperatura(sensor, valor);
        if (sensor && sensor.type === "WM") return colorDeTension(valor);
        return colorDeHumedad(sensor, valor);
    }

    return {
        COLORES: COLORES,
        limitesDeHumedad: limitesDeHumedad,
        limitesDeTemperatura: limitesDeTemperatura,
        colorDeHumedad: colorDeHumedad,
        colorDeTension: colorDeTension,
        colorDeTemperatura: colorDeTemperatura,
        color: color,
        cbValido: cbValido,
        cbDeAguaDisponible: cbDeAguaDisponible
    };
}));
