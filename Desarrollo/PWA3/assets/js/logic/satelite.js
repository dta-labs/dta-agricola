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
    var RENDER = "NDVI Colormap";             // respaldo: render propio de Esri (escala cafe-amarillo-verde)

    // REQ-112: paleta estandar de los servicios satelitales agricolas (EO Browser, Sentinel Hub, DTA-AgroSat):
    // rojo (suelo / sin vigor) -> amarillo -> verde (vigoroso). Puntos [NDVI, r, g, b]; entre ellos, interpolacion.
    var PALETA = [
        [-1.0, 120, 120, 120], [0.0, 165, 0, 38], [0.1, 215, 48, 39], [0.2, 244, 109, 67], [0.3, 253, 174, 97],
        [0.4, 254, 224, 139], [0.5, 217, 239, 139], [0.6, 166, 217, 106], [0.7, 102, 189, 99], [0.8, 26, 152, 80],
        [1.0, 0, 104, 55]
    ];

    function colorDeNdvi(ndvi) {
        if (ndvi <= PALETA[0][0]) return PALETA[0].slice(1);
        for (var i = 1; i < PALETA.length; i += 1) {
            if (ndvi <= PALETA[i][0]) {
                var a = PALETA[i - 1], b = PALETA[i], f = (ndvi - a[0]) / (b[0] - a[0]);
                return [1, 2, 3].map(function (k) { return Math.round(a[k] + (b[k] - a[k]) * f); });
            }
        }
        return PALETA[PALETA.length - 1].slice(1);
    }

    /**
     * Regla de Esri: funcion NDVI con las bandas roja (B4, indice 3) e infrarroja (B8, indice 7) -> salida de 8 bits
     * (NDVI + 1) * 100 (0..200); Remap en tramos de 0.05 de NDVI (de -0.2 a 1; por debajo, un solo tramo) y Colormap
     * con un color por tramo. Asi la URL queda corta (~1.5 KB) en vez de un color por cada valor (~6 KB).
     */
    function reglaNdvi() {
        var rangos = [0, 80], salidas = [1], colores = [[1].concat(colorDeNdvi(-0.5))];
        var clase = 2;
        for (var v = 80; v < 200; v += 5) {
            rangos.push(v, v + 5);
            salidas.push(clase);
            colores.push([clase].concat(colorDeNdvi((v + 2.5) / 100 - 1)));
            clase += 1;
        }
        rangos[rangos.length - 1] = 201;   // incluye NDVI = 1
        return {
            rasterFunction: "Colormap",
            rasterFunctionArguments: {
                Colormap: colores,
                Raster: {
                    rasterFunction: "Remap",
                    rasterFunctionArguments: {
                        InputRanges: rangos, OutputValues: salidas, AllowUnmatched: false,
                        Raster: { rasterFunction: "NDVI", rasterFunctionArguments: { VisibleBandID: 3, InfraredBandID: 7 } }
                    }
                }
            }
        };
    }

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

    /** URL de la imagen NDVI (PNG transparente) del rectangulo. `respaldo`: con el render de Esri. */
    function urlNdvi(caja, ancho, alto, respaldo) {
        var p = [
            "bbox=" + [caja.xmin, caja.ymin, caja.xmax, caja.ymax].map(function (n) { return n.toFixed(2); }).join(","),
            "bboxSR=3857", "imageSR=3857",
            "size=" + ancho + "," + alto,
            "format=png", "transparent=true",
            "renderingRule=" + encodeURIComponent(JSON.stringify(respaldo ? { rasterFunction: RENDER } : reglaNdvi())),
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

    /**
     * REQ-157: TODAS las areas del usuario, sin importar el equipo abierto: circulos de los pivotes centrales
     * (centro y radio) y parcelas de redes de sensores y estacionarios. [{ clave, puntos } | { clave, circulo }]
     */
    function areasDelUsuario(sistemas, normalizar, esValido, esCoordenadaValida) {
        var lista = [];
        Object.keys(sistemas || {}).forEach(function (k) {
            var s = sistemas[k];
            if (!s || s.type !== "PC") return;
            var lat = Number(s.latitude), lng = Number(s.longitude);
            var radio = parseInt(s.length, 10) > 0 ? parseInt(s.length, 10) : 50;
            var valida = esCoordenadaValida ? esCoordenadaValida(lat, lng) : (isFinite(lat) && isFinite(lng) && (lat || lng));
            if (valida && !(lat === 0 && lng === 0)) lista.push({ clave: k, circulo: { lat: lat, lng: lng, radio: radio } });
        });
        return lista.concat(parcelasDelUsuario(sistemas, normalizar, esValido));
    }

    /**
     * REQ-157: consulta de la fecha de la imagen mas reciente del rectangulo (catalogo de Sentinel-2): si es posterior a
     * la guardada, se vuelve a pedir la imagen; si no, se usa la guardada.
     */
    function urlFechaReciente(caja) {
        var p = [
            "where=" + encodeURIComponent("category = 1"),
            "geometry=" + encodeURIComponent([caja.xmin, caja.ymin, caja.xmax, caja.ymax].map(function (n) { return n.toFixed(2); }).join(",")),
            "geometryType=esriGeometryEnvelope", "inSR=3857", "spatialRel=esriSpatialRelIntersects",
            "outFields=acquisitiondate", "orderByFields=" + encodeURIComponent("acquisitiondate DESC"),
            "resultRecordCount=1", "returnGeometry=false", "f=json"
        ];
        return SERVICIO.replace(/exportImage$/, "query") + "?" + p.join("&");
    }

    /** Fecha (ms) de la respuesta de urlFechaReciente, o null. */
    function fechaDeRespuesta(json) {
        var f = json && json.features && json.features[0] && json.features[0].attributes;
        var v = f && Number(f.acquisitiondate);
        return isFinite(v) && v > 0 ? v : null;
    }

    var REVISAR_CADA_MS = 12 * 3600000;       // la fecha del catalogo se consulta como mucho cada 12 h por area

    /**
     * Que hacer con una imagen guardada. meta: { guardada (ms en que se descargo), revisada (ms de la ultima consulta) }.
     *   "descargar": no hay copia; "usar": la copia vale; "revisar": usar la copia y consultar si hay una mas reciente.
     */
    function decision(meta, ahora) {
        if (!meta || !isFinite(meta.guardada)) return "descargar";
        if (isFinite(meta.revisada) && ahora - meta.revisada < REVISAR_CADA_MS) return "usar";
        return "revisar";
    }

    /** Hay una imagen mas reciente que la guardada (la fecha de adquisicion es posterior a la descarga)? */
    function hayMasReciente(meta, fechaReciente) {
        return !!(meta && isFinite(fechaReciente) && fechaReciente > meta.guardada);
    }

    return {
        areasDelUsuario: areasDelUsuario,
        urlFechaReciente: urlFechaReciente,
        fechaDeRespuesta: fechaDeRespuesta,
        decision: decision,
        hayMasReciente: hayMasReciente,
        RENDER: RENDER,
        PALETA: PALETA,
        colorDeNdvi: colorDeNdvi,
        reglaNdvi: reglaNdvi,
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
