/**
 * REQ-051 - Reglas de geolocalizacion (puras: sin DOM, sin Leaflet, sin Firebase).
 *
 * Formatos que ya estan guardados y se conservan (R-01 de REQ-034):
 *   - posicion de equipos y sensores: `latitude` y `longitude` (numero o texto)
 *   - poligono de parcela: `plots[p].poligon = [[lat, lng], ...]` (a veces con los numeros como texto,
 *     ver verifyPlots en core.js); antes se editaba como texto "lat1,lng1,lat2,lng2,..."
 *
 * UMD (navegador: DTALogic.geo / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.geo = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var DECIMALES = 6;                 // ~11 cm: suficiente para parcelas y sensores
    var RADIO_TIERRA_M = 6378137;      // WGS84 (el de Leaflet)
    var M2_POR_HECTAREA = 10000;

    function numero(valor) {
        if (valor === null || valor === undefined) return NaN;
        if (typeof valor === "string" && !valor.trim()) return NaN;
        return Number(String(valor).trim().replace(",", "."));
    }

    function redondear(valor) {
        var n = numero(valor);
        if (!isFinite(n)) return NaN;
        var factor = Math.pow(10, DECIMALES);
        return Math.round(n * factor) / factor;
    }

    function esCoordenadaValida(lat, lng) {
        var a = numero(lat);
        var o = numero(lng);
        return isFinite(a) && isFinite(o) && a >= -90 && a <= 90 && o >= -180 && o <= 180;
    }

    /** Punto valido o null: { lat, lng } redondeados. */
    function punto(lat, lng) {
        if (!esCoordenadaValida(lat, lng)) return null;
        return { lat: redondear(lat), lng: redondear(lng) };
    }

    /**
     * Cualquier forma guardada -> [[lat, lng], ...] con numeros. Descarta puntos invalidos.
     * Acepta: arreglo de pares (numeros o texto), arreglo de {lat, lng}, texto "lat,lng,lat,lng".
     */
    function normalizarPoligono(valor) {
        var pares = [];
        if (typeof valor === "string") {
            var partes = valor.split(",").map(function (x) { return x.trim(); }).filter(function (x) { return x !== ""; });
            for (var i = 0; i + 1 < partes.length; i += 2) pares.push([partes[i], partes[i + 1]]);
        } else if (Array.isArray(valor)) {
            pares = valor.map(function (p) {
                if (Array.isArray(p)) return [p[0], p[1]];
                if (p && typeof p === "object") return [p.lat !== undefined ? p.lat : p.latitude, p.lng !== undefined ? p.lng : p.longitude];
                return [NaN, NaN];
            });
        } else if (valor && typeof valor === "object") {
            // RTDB devuelve como objeto { "0": [...], "1": [...] } los arreglos con huecos
            pares = Object.keys(valor).sort(function (a, b) { return Number(a) - Number(b); }).map(function (k) { return valor[k]; })
                .map(function (p) { return Array.isArray(p) ? [p[0], p[1]] : [NaN, NaN]; });
        }
        return pares
            .filter(function (p) { return esCoordenadaValida(p[0], p[1]); })
            .map(function (p) { return [redondear(p[0]), redondear(p[1])]; });
    }

    /** Al menos 3 vertices distintos. */
    function esPoligonoValido(poligono) {
        var p = normalizarPoligono(poligono);
        var distintos = {};
        p.forEach(function (v) { distintos[v[0] + "," + v[1]] = true; });
        return Object.keys(distintos).length >= 3;
    }

    /** Centro (promedio de vertices; suficiente para centrar el mapa). null si no hay puntos. */
    function centro(poligono) {
        var p = normalizarPoligono(poligono);
        if (!p.length) return null;
        var suma = p.reduce(function (acc, v) { return [acc[0] + v[0], acc[1] + v[1]]; }, [0, 0]);
        return { lat: redondear(suma[0] / p.length), lng: redondear(suma[1] / p.length) };
    }

    /**
     * Area en hectareas (formula de Leaflet.GeometryUtil/Google: exceso esferico aproximado).
     * Error < 0.5 % para parcelas agricolas. 0 si el poligono no es valido.
     */
    function areaHectareas(poligono) {
        var p = normalizarPoligono(poligono);
        if (!esPoligonoValido(p)) return 0;
        var rad = Math.PI / 180;
        var area = 0;
        for (var i = 0; i < p.length; i += 1) {
            var a = p[i];
            var b = p[(i + 1) % p.length];
            area += ((b[1] - a[1]) * rad) * (2 + Math.sin(a[0] * rad) + Math.sin(b[0] * rad));
        }
        area = Math.abs(area * RADIO_TIERRA_M * RADIO_TIERRA_M / 2);
        return Math.round(area / M2_POR_HECTAREA * 100) / 100;
    }

    /** Texto corto para el productor: "12.5 ha" / "850 m²". */
    function textoArea(poligono) {
        var ha = areaHectareas(poligono);
        if (!ha) return "";
        if (ha < 1) return Math.round(ha * M2_POR_HECTAREA).toLocaleString("es-MX") + " m²";
        return ha.toLocaleString("es-MX", { maximumFractionDigits: 2 }) + " ha";
    }

    // ---------- REQ-072: varios sensores en una parcela ----------

    /** Coordenadas planas locales (suficiente para una parcela): x = lng * cos(lat0), y = lat. */
    function aPlano(p, lat0) {
        return [p[1] * Math.cos(lat0 * Math.PI / 180), p[0]];
    }

    function aGeo(q, lat0) {
        return [q[1], q[0] / Math.cos(lat0 * Math.PI / 180)];
    }

    /** ¿El punto [lat, lng] esta dentro del poligono [[lat, lng], ...]? (rayo; el borde puede contar o no). */
    function puntoEnPoligono(punto, poligono) {
        var p = normalizarPoligono(poligono);
        if (!punto || p.length < 3) return false;
        var y = Number(punto[0]), x = Number(punto[1]);
        if (!isFinite(x) || !isFinite(y)) return false;
        var dentro = false;
        for (var i = 0, j = p.length - 1; i < p.length; j = i, i += 1) {
            var yi = p[i][0], xi = p[i][1], yj = p[j][0], xj = p[j][1];
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) dentro = !dentro;
        }
        return dentro;
    }

    /** Recorta un poligono (plano) con el semiplano de puntos mas cerca de `a` que de `b` (Sutherland-Hodgman). */
    function recortarSemiplano(poligono, a, b) {
        var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        var dx = b[0] - a[0], dy = b[1] - a[1];
        var lado = function (q) { return (q[0] - mx) * dx + (q[1] - my) * dy; };   // <= 0: lado de a
        var salida = [];
        for (var i = 0; i < poligono.length; i += 1) {
            var actual = poligono[i];
            var previo = poligono[(i + poligono.length - 1) % poligono.length];
            var la = lado(actual), lp = lado(previo);
            if (la <= 0) {
                if (lp > 0) salida.push(cruce(previo, actual, lp, la));
                salida.push(actual);
            } else if (lp <= 0) {
                salida.push(cruce(previo, actual, lp, la));
            }
        }
        return salida;
    }

    function cruce(p, q, lp, lq) {
        var t = lp / (lp - lq);
        return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    }

    /**
     * Parte del poligono que esta mas cerca de `punto` que de cualquiera de `otros` (celda de Voronoi dentro
     * de la parcela). Asi, si una parcela tiene varios sensores, cada uno sombrea la zona que le toca.
     * Devuelve [[lat, lng], ...] (vacio si no queda area).
     */
    function recortarPorCercania(poligono, punto, otros) {
        var p = normalizarPoligono(poligono);
        if (p.length < 3 || !punto || !otros || !otros.length) return p;
        var lat0 = p[0][0];
        var plano = p.map(function (v) { return aPlano(v, lat0); });
        var a = aPlano([Number(punto[0]), Number(punto[1])], lat0);
        otros.forEach(function (o) {
            if (!plano.length) return;
            var b = aPlano([Number(o[0]), Number(o[1])], lat0);
            if (b[0] === a[0] && b[1] === a[1]) return;
            plano = recortarSemiplano(plano, a, b);
        });
        return plano.map(function (q) { var g = aGeo(q, lat0); return [redondear(g[0]), redondear(g[1])]; });
    }

    return {
        puntoEnPoligono: puntoEnPoligono,
        recortarPorCercania: recortarPorCercania,
        DECIMALES: DECIMALES,
        redondear: redondear,
        esCoordenadaValida: esCoordenadaValida,
        punto: punto,
        normalizarPoligono: normalizarPoligono,
        esPoligonoValido: esPoligonoValido,
        centro: centro,
        areaHectareas: areaHectareas,
        textoArea: textoArea
    };
}));
