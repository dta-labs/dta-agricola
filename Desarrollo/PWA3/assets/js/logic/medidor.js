/**
 * REQ-068 - Medidores con barra de colores para la ficha del sensor (puro: devuelve datos y HTML).
 *
 *   Humedad del suelo: 0..100 % de izquierda a derecha, rojo (seco) - verde - azul (saturado).
 *     - Tensiometro WM (centibares): 240 cb = 0 %, 0 cb = 100 % (mas tension = mas seco).
 *     - Sensores en %: el valor ya es 0..100.
 *   Temperatura: -50 .. +125 °C, azul (frio) - rojo (calor). Se muestra en la unidad del sistema.
 *
 * Los umbrales (sensor.h / sensor.t) se marcan en la barra con una raya y su valor; la medicion, con un
 * triangulo. UMD (navegador: DTALogic.medidor / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.medidor = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var CB_MAXIMO = 240;
    var T_MINIMA = -50;
    var T_MAXIMA = 125;

    function numero(valor) {
        if (valor === null || valor === undefined || valor === "" || valor === "NaN") return null;
        var n = Number(String(valor).replace(",", "."));
        return isFinite(n) ? n : null;
    }

    function acotar(n, minimo, maximo) {
        return Math.max(minimo, Math.min(maximo, n));
    }

    function redondear(n, decimales) {
        var f = Math.pow(10, decimales || 0);
        return Math.round(n * f) / f;
    }

    function fueraDeRango(valor, minimo, maximo) {
        if (valor === null) return null;
        if (minimo !== null && valor < minimo) return true;
        if (maximo !== null && valor > maximo) return true;
        return false;
    }

    /** Posicion 0..100 de un valor de humedad (cb o %) en la barra. */
    function posicionHumedad(valor, esTensiometro) {
        var v = numero(valor);
        if (v === null) return null;
        if (esTensiometro) return redondear((CB_MAXIMO - acotar(v, 0, CB_MAXIMO)) / CB_MAXIMO * 100, 1);
        return redondear(acotar(v, 0, 100), 1);
    }

    function escalaHumedadSuelo(sensor, valor) {
        var s = sensor || {};
        var esTensiometro = s.type === "WM";
        var unidad = esTensiometro ? " cb" : " %";
        var v = numero(valor);
        var h = s.h || {};
        var umbrales = [numero(h.minValue), numero(h.maxValue)]
            .filter(function (u) { return u !== null; })
            .map(function (u) { return { posicion: posicionHumedad(u, esTensiometro), texto: String(redondear(u)) }; });
        return {
            tipo: "humedad",
            posicion: posicionHumedad(v, esTensiometro),
            valorTexto: v === null ? "--" : redondear(v) + unidad,
            porcentaje: posicionHumedad(v, esTensiometro),
            umbrales: umbrales,
            fueraDeRango: fueraDeRango(v, numero(h.minValue), numero(h.maxValue))
        };
    }

    function aUnidad(celsius, unidad) {
        return unidad === "C" ? celsius : celsius * 9 / 5 + 32;
    }

    function escalaTemperatura(celsius, sensor, unidad) {
        var c = numero(celsius);
        var t = (sensor && sensor.t) || {};
        var simbolo = unidad === "C" ? " °C" : " °F";
        var posicion = function (x) { return redondear((acotar(x, T_MINIMA, T_MAXIMA) - T_MINIMA) / (T_MAXIMA - T_MINIMA) * 100, 1); };
        var umbrales = [numero(t.minValue), numero(t.maxValue)]
            .filter(function (u) { return u !== null; })
            .map(function (u) { return { posicion: posicion(u), texto: String(redondear(aUnidad(u, unidad))) }; });
        return {
            tipo: "temperatura",
            posicion: c === null ? null : posicion(c),
            valorTexto: c === null ? "--" : redondear(aUnidad(c, unidad)) + simbolo,
            umbrales: umbrales,
            fueraDeRango: fueraDeRango(c, numero(t.minValue), numero(t.maxValue))
        };
    }

    function escaparHtml(texto) {
        return String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    /** HTML del medidor (barra con degradado, rayas de umbral con su valor y triangulo de la medicion). */
    function htmlMedidor(escala) {
        var e = escala || { umbrales: [] };
        var html = '<div class="medidor medidor-' + e.tipo + '" role="img" aria-label="' +
            escaparHtml((e.tipo === "temperatura" ? "Temperatura " : "Humedad del suelo ") + e.valorTexto) + '">';
        html += '<div class="medidor-barra"></div>';
        e.umbrales.forEach(function (u) {
            html += '<span class="medidor-umbral" style="left:' + u.posicion + '%"></span>';
            html += '<span class="medidor-umbral-texto" style="left:' + acotar(u.posicion, 7, 93) + '%">' + escaparHtml(u.texto) + '</span>';
        });
        if (e.posicion !== null && e.posicion !== undefined) {
            html += '<span class="medidor-marca" style="left:' + e.posicion + '%"></span>';
        }
        html += '</div>';
        return html;
    }

    return {
        CB_MAXIMO: CB_MAXIMO,
        T_MINIMA: T_MINIMA,
        T_MAXIMA: T_MAXIMA,
        posicionHumedad: posicionHumedad,
        escalaHumedadSuelo: escalaHumedadSuelo,
        escalaTemperatura: escalaTemperatura,
        htmlMedidor: htmlMedidor
    };
}));
