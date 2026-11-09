/**
 * REQ-089 - Vista satelital (NDVI) de las parcelas y del pivote. Puro: geometria y URL, sin Leaflet ni DOM.
 *
 * FUENTE PROVISIONAL: servicio publico de Esri "Sentinel-2 Views" (imagenes Copernicus Sentinel-2 en AWS,
 * render "NDVI Colormap", mosaico de la mejor imagen reciente). Se cambiara por el servicio de DTA-AgroSat
 * (Copernicus Data Space / Sentinel Hub, server/sentinel.php) en la integracion: solo hay que cambiar urlNdvi.
 * Pendiente: confirmar los terminos de uso de Esri para uso comercial.
 *
 * Se pide SOLO el rectangulo de cada area (a ~5 m por pixel) y se recorta a su contorno en el mapa.
 * UMD (navegador: DTALogic.satelite / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.satelite = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var SERVICIO = "https://sentinel.arcgis.com/arcgis/rest/services/Sentinel2/ImageServer/exportImage";
    var RENDER = "NDVI Colormap";
    var ORIGEN = 20037508.342789244;          // extension de Web Mercator (EPSG:3857)
    var METROS_POR_PIXEL = 5;                 // el doble de la resolucion de Sentinel-2 (10 m): bordes mas suaves
    var PIXELES_MIN = 32, PIXELES_MAX = 1024;
    var MARGEN = 0.04;                        // 4 % alrededor del area (el recorte la ajusta)

    function aMercator(lat, lng) {
        var x = lng * ORIGEN / 180;
        var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * ORIGEN / 180;
        return [x, y];
    }

    function aLatLng(x, y) {
        var lng = x / ORIGEN * 180;
        var lat = 180 / Math.PI * (2 * Math.atan(Math.exp(y / ORIGEN * Math.PI)) - Math.PI / 2);
        return [lat, lng];
    }

    function ampliar(caja) {
        var mx = (caja.xmax - caja.xmin) * MARGEN || 10, my = (caja.ymax - caja.ymin) * MARGEN || 10;
        return { xmin: caja.xmin - mx, ymin: caja.ymin - my, xmax: caja.xmax + mx, ymax: caja.ymax + my };
    }

    /** Rectangulo Web Mercator que contiene los puntos [[lat, lng], ...] (con un pequeño margen). */
    function cajaDePuntos(puntos) {
        var xs = [], ys = [];
        (puntos || []).forEach(function (p) { var m = aMercator(Number(p[0]), Number(p[1])); xs.push(m[0]); ys.push(m[1]); });
        if (!xs.length) return null;
        return ampliar({ xmin: Math.min.apply(null, xs), ymin: Math.min.apply(null, ys), xmax: Math.max.apply(null, xs), ymax: Math.max.apply(null, ys) });
    }

    /** Rectangulo Web Mercator de un circulo (centro y radio en metros: en Mercator el radio crece con 1/cos(lat)). */
    function cajaDeCirculo(lat, lng, radioMetros) {
        var c = aMercator(lat, lng);
        var r = radioMetros / Math.cos(lat * Math.PI / 180);
        return ampliar({ xmin: c[0] - r, ymin: c[1] - r, xmax: c[0] + r, ymax: c[1] + r });
    }

    /** Tamaño de la imagen en pixeles para ~5 m por pixel sobre el terreno. */
    function tamanoImagen(caja) {
        var latCentro = aLatLng((caja.xmin + caja.xmax) / 2, (caja.ymin + caja.ymax) / 2)[0];
        var escala = Math.cos(latCentro * Math.PI / 180);   // metros de terreno por unidad Mercator
        var acotar = function (n) { return Math.max(PIXELES_MIN, Math.min(PIXELES_MAX, Math.round(n))); };
        return [acotar((caja.xmax - caja.xmin) * escala / METROS_POR_PIXEL), acotar((caja.ymax - caja.ymin) * escala / METROS_POR_PIXEL)];
    }

    /** URL de la imagen NDVI (PNG transparente) del rectangulo. */
    function urlNdvi(caja, ancho, alto) {
        var p = [
            "bbox=" + [caja.xmin, caja.ymin, caja.xmax, caja.ymax].map(function (n) { return n.toFixed(2); }).join(","),
            "bboxSR=3857", "imageSR=3857",
            "size=" + ancho + "," + alto,
            "format=png", "transparent=true",
            "renderingRule=" + encodeURIComponent(JSON.stringify({ rasterFunction: RENDER })),
            "f=image"
        ];
        return SERVICIO + "?" + p.join("&");
    }

    /** Esquinas del rectangulo en lat/lng (para colocar la imagen en el mapa): [[sur, oeste], [norte, este]]. */
    function limites(caja) {
        return [aLatLng(caja.xmin, caja.ymin), aLatLng(caja.xmax, caja.ymax)];
    }

    /** Puntos del poligono en coordenadas de la imagen ("x,y x,y ..."; y hacia abajo), para el recorte SVG. */
    function puntosEnImagen(puntos, caja, ancho, alto) {
        return (puntos || []).map(function (p) {
            var m = aMercator(Number(p[0]), Number(p[1]));
            var x = (m[0] - caja.xmin) / (caja.xmax - caja.xmin) * ancho;
            var y = (caja.ymax - m[1]) / (caja.ymax - caja.ymin) * alto;
            return x.toFixed(1) + "," + y.toFixed(1);
        }).join(" ");
    }

    /** Circulo en coordenadas de la imagen: { cx, cy, r }. */
    function circuloEnImagen(lat, lng, radioMetros, caja, ancho, alto) {
        var c = aMercator(lat, lng);
        var r = radioMetros / Math.cos(lat * Math.PI / 180);
        return {
            cx: +((c[0] - caja.xmin) / (caja.xmax - caja.xmin) * ancho).toFixed(1),
            cy: +((caja.ymax - c[1]) / (caja.ymax - caja.ymin) * alto).toFixed(1),
            r: +(r / (caja.xmax - caja.xmin) * ancho).toFixed(1)
        };
    }

    /**
     * Todas las parcelas del usuario con contorno valido: areas de los sensores (redes) y parcelas de los
     * estacionarios. `normalizar` y `esValido` vienen de logic/geo.js. Devuelve [{ clave, puntos }].
     */
    function parcelasDelUsuario(sistemas, normalizar, esValido) {
        var lista = [];
        Object.keys(sistemas || {}).forEach(function (k) {
            var s = sistemas[k];
            if (!s) return;
            if (s.type === "Sensor" && s.sensors) {
                Object.keys(s.sensors).forEach(function (c) {
                    var sensor = s.sensors[c];
                    if (/^S\d+$/.test(c) && sensor && esValido(sensor.poligon)) lista.push({ clave: k + c, puntos: normalizar(sensor.poligon) });
                });
            }
            if (s.type === "Estacionario" && s.plots) {
                Object.keys(s.plots).forEach(function (c) {
                    var parcela = s.plots[c];
                    if (/^p\d+$/.test(c) && parcela && esValido(parcela.poligon)) lista.push({ clave: k + c, puntos: normalizar(parcela.poligon) });
                });
            }
        });
        return lista;
    }

    return {
        RENDER: RENDER,
        aMercator: aMercator,
        aLatLng: aLatLng,
        cajaDePuntos: cajaDePuntos,
        cajaDeCirculo: cajaDeCirculo,
        tamanoImagen: tamanoImagen,
        urlNdvi: urlNdvi,
        limites: limites,
        puntosEnImagen: puntosEnImagen,
        circuloEnImagen: circuloEnImagen,
        parcelasDelUsuario: parcelasDelUsuario
    };
}));
