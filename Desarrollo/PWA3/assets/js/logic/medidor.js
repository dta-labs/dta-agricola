/**
 * REQ-068 - Medidores con barra de colores para la ficha del sensor (puro: devuelve datos y HTML).
 *
 *   Humedad del suelo: 0..100 % de izquierda a derecha, rojo (seco) - verde - azul (saturado).
 *     - Tensiometro WM (centibares): REQ-070, 6 zonas de igual ancho (no lineal): >200 fuera de rango,
 *       100-200 muy seco, 60-100 estres moderado, 30-60 adecuada, 10-30 muy humedo, 0-10 saturado.
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

    // REQ-070: zonas del tensiometro (cb). La barra NO es lineal: las 6 zonas ocupan el mismo ancho.
    // Orden en la barra (izquierda -> derecha): de lo mas seco a lo mas humedo.
    var ZONAS_CB = [
        { hasta: 10, nombre: "Suelo saturado", nivel: "critico" },
        { hasta: 30, nombre: "Muy húmedo", nivel: "atencion" },
        { hasta: 60, nombre: "Humedad adecuada", nivel: "bien" },
        { hasta: 100, nombre: "Estrés moderado", nivel: "atencion" },
        { hasta: 200, nombre: "Suelo muy seco", nivel: "critico" },
        { hasta: CB_MAXIMO, nombre: "Fuera de rango", nivel: "fuera" }
    ];

    /** Zona (indice en ZONAS_CB) de un valor en cb: 0..10 saturado, 10..30 muy humedo... >200 fuera de rango. */
    function indiceZonaCb(cb) {
        for (var i = 0; i < ZONAS_CB.length - 1; i += 1) {
            if (cb <= ZONAS_CB[i].hasta) return i;
        }
        return ZONAS_CB.length - 1;
    }

    function zonaCb(valor) {
        var v = numero(valor);
        if (v === null) return null;
        var z = ZONAS_CB[indiceZonaCb(Math.max(0, v))];
        return { nombre: z.nombre, nivel: z.nivel };
    }

    /**
     * Posicion 0..100 de un valor de humedad en la barra.
     * Tensiometro: por zonas de igual ancho (no lineal); dentro de cada zona, lineal. 240 cb = 0, 0 cb = 100.
     * Sensores en %: lineal 0..100.
     */
    function posicionHumedad(valor, esTensiometro) {
        var v = numero(valor);
        if (v === null) return null;
        if (!esTensiometro) return redondear(acotar(v, 0, 100), 1);
        var cb = acotar(v, 0, CB_MAXIMO);
        var i = indiceZonaCb(cb);
        var desde = i === 0 ? 0 : ZONAS_CB[i - 1].hasta;
        var fraccion = (cb - desde) / (ZONAS_CB[i].hasta - desde);       // 0 = borde humedo, 1 = borde seco
        var tramo = ZONAS_CB.length - 1 - i;                             // tramo en la barra (0 = el mas seco)
        return redondear((tramo + (1 - fraccion)) / ZONAS_CB.length * 100, 1);
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
        var fuera = fueraDeRango(v, numero(h.minValue), numero(h.maxValue));
        // REQ-070: la etiqueta dice en que zona esta la medicion.
        var zona = esTensiometro ? zonaCb(v) : null;
        var etiqueta = zona ? zona.nombre : (v === null ? "Humedad del suelo" : (fuera ? (v < numero(h.minValue) ? "Suelo seco" : "Suelo saturado") : "Humedad adecuada"));
        var nivel = zona ? zona.nivel : (v === null ? "fuera" : (fuera ? "critico" : "bien"));
        return {
            tipo: esTensiometro ? "humedad medidor-zonas" : "humedad",
            posicion: posicionHumedad(v, esTensiometro),
            valorTexto: v === null ? "--" : redondear(v) + unidad,
            porcentaje: posicionHumedad(v, esTensiometro),
            umbrales: umbrales,
            fueraDeRango: fuera,
            etiqueta: etiqueta,
            nivel: nivel
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
        var minimo = numero(t.minValue), maximo = numero(t.maxValue);
        // REQ-070: "Riesgo de helada" / "Temperatura adecuada" / "Calor extremo" segun los umbrales.
        var etiqueta = "Temperatura", nivel = "fuera";
        if (c !== null) {
            if (minimo !== null && c < minimo) { etiqueta = "Riesgo de helada"; nivel = "frio"; }
            else if (maximo !== null && c > maximo) { etiqueta = "Calor extremo"; nivel = "critico"; }
            else { etiqueta = "Temperatura adecuada"; nivel = "bien"; }
        }
        return {
            tipo: "temperatura",
            posicion: c === null ? null : posicion(c),
            valorTexto: c === null ? "--" : redondear(aUnidad(c, unidad)) + simbolo,
            umbrales: umbrales,
            fueraDeRango: fueraDeRango(c, minimo, maximo),
            etiqueta: etiqueta,
            nivel: nivel
        };
    }

    function escaparHtml(texto) {
        return String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    /** HTML del medidor (barra con degradado, rayas de umbral con su valor y triangulo de la medicion). */
    function htmlMedidor(escala) {
        var e = escala || { umbrales: [] };
        var html = '<div class="medidor medidor-' + e.tipo + '" role="img" aria-label="' +
            escaparHtml((e.etiqueta || "") + " " + e.valorTexto) + '">';
        html += '<div class="medidor-barra"></div>';
        if (String(e.tipo).indexOf("medidor-zonas") >= 0) {
            // REQ-070: separaciones entre las 6 zonas del tensiometro (barra no lineal)
            for (var k = 1; k < ZONAS_CB.length; k += 1) {
                html += '<span class="medidor-division" style="left:' + redondear(k / ZONAS_CB.length * 100, 2) + '%"></span>';
            }
        }
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
        ZONAS_CB: ZONAS_CB,
        zonaCb: zonaCb,
        escalaHumedadSuelo: escalaHumedadSuelo,
        escalaTemperatura: escalaTemperatura,
        htmlMedidor: htmlMedidor
    };
}));
