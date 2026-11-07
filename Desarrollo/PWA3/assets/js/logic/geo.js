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

    return {
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
