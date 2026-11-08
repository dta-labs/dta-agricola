/**
 * REQ-051 - dtaMapa: Leaflet para los componentes (un "lienzo" de mapa con punto o poligono).
 *
 * El componente <dta-mapa-selector> no toca Leaflet directamente: pide un lienzo aqui y le dice que
 * dibujar. Asi su logica se prueba en Node con un doble, y Leaflet se cambia en un solo sitio.
 *
 * Detalles de Leaflet dentro de modales que resuelve este fichero:
 *   - el mapa se crea cuando el modal aun esta oculto (0x0): un ResizeObserver llama a invalidateSize()
 *     y vuelve a encuadrar cuando el contenedor recibe tamano;
 *   - los marcadores son divIcon (sin imagenes externas ni rutas de iconos).
 */
(function (raiz) {
    "use strict";

    var TESELAS = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    var ATRIBUCION = "Imágenes &copy; Esri";
    var CENTRO_MEXICO = [23.6, -102.5];

    /**
     * @param obtenerL          funcion que devuelve Leaflet (`L`)
     * @param obtenerNavegador  funcion que devuelve `navigator` (geolocalizacion)
     * @param obtenerVentana    funcion que devuelve `window` (ResizeObserver)
     */
    function crear(obtenerL, obtenerNavegador, obtenerVentana) {

        function icono(L, clase, html) {
            return L.divIcon({ className: "mapa-icono " + clase, html: html || "<span></span>", iconSize: [26, 26], iconAnchor: [13, 13] });
        }

        /**
         * contenedor: elemento del mapa. opciones: { centro: {lat,lng}|null }.
         * eventos: { alTocar(lat,lng), alMoverPunto(lat,lng), alMoverVertice(indice,lat,lng) }
         */
        function crearLienzo(contenedor, opciones, eventos) {
            var L = obtenerL && obtenerL();
            if (!L || !contenedor) return null;
            var ventana = obtenerVentana && obtenerVentana();
            var centro = opciones && opciones.centro;

            var mapa = L.map(contenedor, { zoomControl: true, attributionControl: true, tap: true });
            L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 19, maxNativeZoom: 18 }).addTo(mapa);
            mapa.setView(centro ? [centro.lat, centro.lng] : CENTRO_MEXICO, centro ? 15 : 5);

            var capaPunto = null;
            var capaReferencia = null;   // REQ-087: pin fijo (no se arrastra ni se toca), p. ej. el sensor
            var capaPoligono = null;
            var vertices = [];
            var pendiente = null;   // ultimo encuadre pedido, para repetirlo al recibir tamano

            mapa.on("click", function (e) {
                if (eventos && eventos.alTocar) eventos.alTocar(e.latlng.lat, e.latlng.lng);
            });

            function encuadrar(objetivo) {
                pendiente = objetivo;
                var tam = mapa.getSize();
                if (!tam.x || !tam.y) return;          // aun oculto: se hara al recibir tamano
                if (objetivo && objetivo.puntos && objetivo.puntos.length > 1) {
                    mapa.fitBounds(L.latLngBounds(objetivo.puntos), { padding: [30, 30], maxZoom: 18 });
                } else if (objetivo && objetivo.puntos && objetivo.puntos.length === 1) {
                    mapa.setView(objetivo.puntos[0], 17);
                } else if (objetivo && objetivo.punto) {
                    mapa.setView([objetivo.punto.lat, objetivo.punto.lng], Math.max(mapa.getZoom(), 17));
                } else if (objetivo && objetivo.centro) {
                    mapa.setView([objetivo.centro.lat, objetivo.centro.lng], 15);
                }
            }

            var observador = null;
            if (ventana && typeof ventana.ResizeObserver === "function") {
                observador = new ventana.ResizeObserver(function () {
                    mapa.invalidateSize();
                    if (pendiente) encuadrar(pendiente);
                });
                observador.observe(contenedor);
            }

            return {
                mostrarPunto: function (p) {
                    if (capaPunto) { mapa.removeLayer(capaPunto); capaPunto = null; }
                    if (!p) return;
                    capaPunto = L.marker([p.lat, p.lng], { draggable: true, icon: icono(L, "mapa-pin", "<span></span>"), keyboard: false }).addTo(mapa);
                    capaPunto.on("dragend", function () {
                        var ll = capaPunto.getLatLng();
                        if (eventos && eventos.alMoverPunto) eventos.alMoverPunto(ll.lat, ll.lng);
                    });
                },

                mostrarPoligono: function (puntos) {
                    if (capaPoligono) { mapa.removeLayer(capaPoligono); capaPoligono = null; }
                    vertices.forEach(function (v) { mapa.removeLayer(v); });
                    vertices = [];
                    var lista = puntos || [];
                    if (lista.length >= 3) {
                        capaPoligono = L.polygon(lista, { color: "#ffeb3b", weight: 3, fillColor: "#ffeb3b", fillOpacity: 0.25, interactive: false }).addTo(mapa);
                    } else if (lista.length === 2) {
                        capaPoligono = L.polyline(lista, { color: "#ffeb3b", weight: 3, dashArray: "6 6", interactive: false }).addTo(mapa);
                    }
                    lista.forEach(function (p, i) {
                        var v = L.marker(p, { draggable: true, icon: icono(L, "mapa-vertice", "<span>" + (i + 1) + "</span>"), keyboard: false }).addTo(mapa);
                        v.on("dragend", function () {
                            var ll = v.getLatLng();
                            if (eventos && eventos.alMoverVertice) eventos.alMoverVertice(i, ll.lat, ll.lng);
                        });
                        vertices.push(v);
                    });
                },

                /** REQ-087: pin de referencia fijo (null lo quita). */
                mostrarReferencia: function (p) {
                    if (capaReferencia) { mapa.removeLayer(capaReferencia); capaReferencia = null; }
                    if (!p) return;
                    capaReferencia = L.marker([p.lat, p.lng], {
                        icon: icono(L, "mapa-pin mapa-referencia", "<span></span>"), interactive: false, keyboard: false
                    }).addTo(mapa);
                },

                encuadrar: encuadrar,

                destruir: function () {
                    if (observador) observador.disconnect();
                    mapa.off();
                    mapa.remove();
                }
            };
        }

        /** Posicion del dispositivo: Promise { lat, lng, precision }. */
        function ubicacionActual() {
            var nav = obtenerNavegador && obtenerNavegador();
            return new Promise(function (resolver, rechazar) {
                if (!nav || !nav.geolocation) {
                    rechazar(new Error("Este dispositivo no permite obtener la ubicación."));
                    return;
                }
                nav.geolocation.getCurrentPosition(function (pos) {
                    resolver({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy });
                }, function (error) {
                    var mensajes = {
                        1: "Permite el acceso a tu ubicación en el navegador para usar esta opción.",
                        2: "No se pudo determinar tu ubicación. Prueba al aire libre.",
                        3: "La ubicación tardó demasiado. Inténtalo de nuevo."
                    };
                    rechazar(new Error(mensajes[error && error.code] || "No se pudo obtener tu ubicación."));
                }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
            });
        }

        return { crearLienzo: crearLienzo, ubicacionActual: ubicacionActual };
    }

    if (typeof module !== "undefined" && module.exports) module.exports = { crear: crear };
    if (raiz.angular) {
        raiz.angular.module("Administracion").factory("dtaMapa", function () {
            return crear(function () { return raiz.L; }, function () { return raiz.navigator; }, function () { return raiz; });
        });
    }
})(typeof window !== "undefined" ? window : globalThis);
