/**
 * REQ-051 - <dta-mapa-selector>: marcar una posicion o el poligono de una parcela en un mapa.
 *
 *   Punto (sensor, equipo):
 *     <dta-mapa-selector modo="punto" latitud="newSensor.latitude" longitud="newSensor.longitude"
 *         centro-lat="..." centro-lng="..." al-cambiar="newSensor.latitude = $lat; newSensor.longitude = $lng">
 *   Poligono (parcela):
 *     <dta-mapa-selector modo="poligono" poligono="edicionParcela.poligono"
 *         al-cambiar="edicionParcela.poligono = $poligono">
 *
 * Entradas de una via ('<') y salida ('&'): el padre guarda el valor (en el formato de siempre).
 * Usar propiedades de un objeto en `al-cambiar` (no variables sueltas) para no crear copias en scopes hijos.
 * Con modo="poligono" se muestra siempre una ayuda visual para el productor.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.08.011";

    function ControladorMapaSelector($element, $timeout, $q, dtaMapa, dtaReglas) {
        var vm = this;
        var geo = dtaReglas.geo;
        var lienzo = null;

        function enAngular(fn) {
            return function () {
                var args = arguments;
                $timeout(function () { fn.apply(null, args); });
            };
        }

        function centroDeReferencia() {
            return geo.punto(vm.centroLat, vm.centroLng);
        }

        /** REQ-087: punto de referencia (p. ej. la ubicacion del sensor al dibujar su parcela). */
        function marca() {
            return geo.punto(vm.marcaLat, vm.marcaLng);
        }

        function objetivoDeEncuadre() {
            if (vm.esPoligono && vm.puntos.length) return { puntos: vm.puntos };
            if (!vm.esPoligono && vm.punto) return { punto: vm.punto };
            var m = vm.esPoligono ? marca() : null;
            if (m) return { punto: m };                 // REQ-087: sin parcela, centrado en el sensor
            var c = centroDeReferencia();
            return c ? { centro: c } : null;
        }

        function dibujarReferencia() {
            if (lienzo && lienzo.mostrarReferencia && vm.esPoligono) lienzo.mostrarReferencia(marca());
        }

        function dibujar() {
            if (!lienzo) return;
            if (vm.esPoligono) lienzo.mostrarPoligono(vm.puntos);
            else lienzo.mostrarPunto(vm.punto);
        }

        function emitirPoligono() {
            dibujar();
            vm.alCambiar({ $poligono: vm.puntos.map(function (p) { return [p[0], p[1]]; }) });
        }

        function leerEntradas() {
            vm.puntos = vm.esPoligono ? geo.normalizarPoligono(vm.poligono) : [];
            vm.punto = vm.esPoligono ? null : geo.punto(vm.latitud, vm.longitud);
            vm.latTexto = vm.punto ? String(vm.punto.lat) : "";
            vm.lngTexto = vm.punto ? String(vm.punto.lng) : "";
        }

        vm.$onInit = function () {
            vm.esPoligono = vm.modo === "poligono";
            vm.mensaje = null;
            vm.buscando = false;
            leerEntradas();
            // La ayuda se abre sola cuando no hay nada marcado.
            vm.ayudaAbierta = vm.esPoligono && vm.puntos.length === 0;
        };

        vm.$postLink = function () {
            var raizDom = $element && $element[0];
            var contenedor = raizDom ? raizDom.querySelector(".mapa-lienzo") : null;
            lienzo = dtaMapa.crearLienzo(contenedor, { centro: centroDeReferencia() }, {
                alTocar: enAngular(function (lat, lng) {
                    if (vm.esPoligono) vm.agregarVertice(lat, lng);
                    else vm.fijarPunto(lat, lng, false);
                }),
                alMoverPunto: enAngular(function (lat, lng) { vm.fijarPunto(lat, lng, false); }),
                alMoverVertice: enAngular(function (i, lat, lng) { vm.moverVertice(i, lat, lng); })
            });
            dibujar();
            dibujarReferencia();
            if (lienzo) lienzo.encuadrar(objetivoDeEncuadre());
        };

        /** Si el padre cambia el valor (otro sensor, otra parcela), se redibuja y encuadra. */
        vm.$onChanges = function (cambios) {
            if (vm.esPoligono === undefined) return;   // antes de $onInit
            // REQ-087: cambia la ubicacion de referencia (el sensor) o el centro: pin y, si aun no hay parcela,
            // el mapa se situa ahi.
            if (vm.esPoligono && (cambios.marcaLat || cambios.marcaLng || cambios.centroLat || cambios.centroLng)) {
                dibujarReferencia();
                if (lienzo && !vm.puntos.length && !cambios.poligono) lienzo.encuadrar(objetivoDeEncuadre());
            }
            var antes = JSON.stringify(vm.esPoligono ? vm.puntos : vm.punto);
            if (!cambios.poligono && !cambios.latitud && !cambios.longitud) return;
            leerEntradas();
            if (JSON.stringify(vm.esPoligono ? vm.puntos : vm.punto) === antes) return;   // eco de nuestro propio cambio
            dibujar();
            if (lienzo) lienzo.encuadrar(objetivoDeEncuadre());
        };

        vm.$onDestroy = function () {
            if (lienzo) lienzo.destruir();
            lienzo = null;
        };

        // ---------- punto ----------

        vm.fijarPunto = function (lat, lng, encuadrar) {
            var p = geo.punto(lat, lng);
            if (!p) return false;
            vm.punto = p;
            vm.latTexto = String(p.lat);
            vm.lngTexto = String(p.lng);
            vm.mensaje = null;
            dibujar();
            if (encuadrar && lienzo) lienzo.encuadrar({ punto: p });
            vm.alCambiar({ $lat: p.lat, $lng: p.lng });
            return true;
        };

        /** Coordenadas escritas a mano. */
        vm.alEscribir = function () {
            if (!vm.latTexto && !vm.lngTexto) return;
            if (!geo.esCoordenadaValida(vm.latTexto, vm.lngTexto)) {
                vm.mensaje = "Latitud entre -90 y 90 y longitud entre -180 y 180 (ej. 28.632, -106.069).";
                return;
            }
            vm.fijarPunto(vm.latTexto, vm.lngTexto, true);
        };

        // ---------- poligono ----------

        vm.agregarVertice = function (lat, lng) {
            var p = geo.punto(lat, lng);
            if (!p) return false;
            vm.puntos.push([p.lat, p.lng]);
            vm.mensaje = null;
            emitirPoligono();
            return true;
        };

        vm.moverVertice = function (i, lat, lng) {
            var p = geo.punto(lat, lng);
            if (!p || !vm.puntos[i]) return false;
            vm.puntos[i] = [p.lat, p.lng];
            emitirPoligono();
            return true;
        };

        vm.deshacer = function () {
            if (!vm.puntos.length) return;
            vm.puntos.pop();
            emitirPoligono();
        };

        vm.borrarTodo = function () {
            vm.puntos = [];
            emitirPoligono();
            vm.ayudaAbierta = true;
        };

        vm.faltan = function () {
            return Math.max(0, 3 - vm.puntos.length);
        };

        vm.area = function () {
            return geo.textoArea(vm.puntos);
        };

        // ---------- mi ubicacion ----------

        /** Punto: coloca el punto. Poligono: agrega una esquina (caminando el perimetro). */
        vm.miUbicacion = function () {
            if (vm.buscando) return $q.when();
            vm.buscando = true;
            vm.mensaje = null;
            return $q.when(dtaMapa.ubicacionActual()).then(function (pos) {
                if (vm.esPoligono) {
                    vm.agregarVertice(pos.lat, pos.lng);
                    if (lienzo) lienzo.encuadrar({ puntos: vm.puntos });
                } else {
                    vm.fijarPunto(pos.lat, pos.lng, true);
                }
                if (pos.precision && pos.precision > 30) {
                    vm.mensaje = "Ubicación aproximada (±" + Math.round(pos.precision) + " m). Puedes arrastrar el punto para corregirla.";
                }
            }, function (error) {
                vm.mensaje = (error && error.message) || "No se pudo obtener tu ubicación.";
            }).finally(function () {
                vm.buscando = false;
            });
        };
    }
    ControladorMapaSelector.$inject = ["$element", "$timeout", "$q", "dtaMapa", "dtaReglas"];

    var definicion = {
        templateUrl: "./assets/js/components/comunes/mapa-selector/mapa-selector.html?v=" + VERSION,
        controller: ControladorMapaSelector,
        controllerAs: "vm",
        bindings: {
            modo: "@",
            latitud: "<",
            longitud: "<",
            poligono: "<",
            centroLat: "<",
            centroLng: "<",
            marcaLat: "<",
            marcaLng: "<",
            alCambiar: "&"
        }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorMapaSelector, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaMapaSelector", definicion);
})(typeof window !== "undefined" ? window : globalThis);
