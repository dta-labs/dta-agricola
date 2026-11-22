/**
 * REQ-133 - Tarjeta de un sensor de nevera (puro, UMD: DTALogic.nevera / Node).
 *
 * Datos de la nevera (`log.dataRaw`): 3 valores por sensor [hr, t, vcc] (S0 = posiciones 0..2).
 * Estado de la temperatura con los umbrales del sensor (t.minValue / t.maxValue, °C); sin umbrales validos, 0 y 3 °C
 * (las mismas franjas de la grafica de la nevera):
 *   < Tmin "Helado" (azul) · Tmin..Tmax "Adecuado" (verde) · > Tmax "Caliente" (rojo) · sin dato "Sin lectura" (gris)
 * Humedad relativa con h.minValue / h.maxValue (si los tiene): "Seca" (ambar) · "Adecuada" (verde) · "Alta" (azul).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.nevera = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var VALORES_POR_SENSOR = 3;
    var POR_DEFECTO = { min: 0, max: 3 };
    var ESTADOS = {
        helado: { nivel: "helado", texto: "Helado", icono: "ac_unit", color: "#1e88e5" },
        adecuado: { nivel: "adecuado", texto: "Adecuado", icono: "check_circle", color: "#2e7d32" },
        caliente: { nivel: "caliente", texto: "Caliente", icono: "whatshot", color: "#d32f2f" },
        sinDato: { nivel: "sin-dato", texto: "Sin lectura", icono: "help_outline", color: "#78909c" }
    };
    var HUMEDAD = {
        seca: { nivel: "seca", texto: "Seca", color: "#ef6c00" },
        adecuada: { nivel: "adecuada", texto: "Adecuada", color: "#2e7d32" },
        alta: { nivel: "alta", texto: "Alta", color: "#1e88e5" }
    };

    function numero(valor) {
        if (valor === null || valor === undefined || valor === "" || valor === "NaN" || valor === "NAN") return null;
        var n = Number(String(valor).replace(",", "."));
        return isFinite(n) ? n : null;
    }

    function rango(umbrales) {
        var u = umbrales || {};
        var a = numero(u.minValue), b = numero(u.maxValue);
        return a !== null && b !== null && a < b ? { min: a, max: b } : null;
    }

    function copia(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

    function redondear(n, decimales) {
        var f = Math.pow(10, decimales);
        return Math.round(n * f) / f;
    }

    function enUnidad(celsius, unidad) {
        return unidad === "F" ? celsius * 9 / 5 + 32 : celsius;
    }

    /** Posicion del sensor ("S3" -> 3) o null. */
    function indiceDe(clave) {
        var m = /^S(\d+)$/.exec(String(clave || ""));
        return m ? parseInt(m[1], 10) : null;
    }

    /**
     * Datos para la tarjeta.
     * @param sensor   configuracion del sensor (alias, id, t, h)
     * @param datos    dataRaw de la nevera (arreglo)
     * @param indice   posicion del sensor (S0 = 0)
     * @param unidad   "C" (por defecto) o "F"
     */
    function tarjeta(sensor, datos, indice, unidad) {
        var s = sensor || {};
        var d = Array.isArray(datos) ? datos : [];
        var base = (indice || 0) * VALORES_POR_SENSOR;
        var hr = numero(d[base]), t = numero(d[base + 1]), vcc = numero(d[base + 2]);
        var simbolo = unidad === "F" ? "°F" : "°C";

        var limites = rango(s.t);
        var porDefecto = !limites;
        var l = limites || POR_DEFECTO;
        var estado = t === null ? ESTADOS.sinDato : t < l.min ? ESTADOS.helado : t > l.max ? ESTADOS.caliente : ESTADOS.adecuado;

        var lh = rango(s.h);
        var humedad = hr === null || !lh ? null : hr < lh.min ? HUMEDAD.seca : hr > lh.max ? HUMEDAD.alta : HUMEDAD.adecuada;

        var r = function (c) { return redondear(enUnidad(c, unidad), 1); };
        return {
            nombre: s.alias || s.id || "Sensor",
            estado: copia(estado),
            temperatura: t === null ? null : r(t),
            temperaturaTexto: t === null ? "--" : r(t).toFixed(1),
            unidad: simbolo,
            rangoTexto: "Rango " + r(l.min) + " a " + r(l.max) + " " + simbolo + (porDefecto ? " (por defecto)" : ""),
            humedad: hr === null ? null : Math.round(hr),
            humedadTexto: hr === null ? "--" : String(Math.round(hr)),
            humedadEstado: humedad ? copia(humedad) : null,
            voltaje: vcc
        };
    }

    return { tarjeta: tarjeta, indiceDe: indiceDe, ESTADOS: ESTADOS };
}));
