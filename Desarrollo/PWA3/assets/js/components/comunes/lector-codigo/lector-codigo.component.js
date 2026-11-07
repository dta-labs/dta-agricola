/**
 * REQ-052 - <dta-lector-codigo>: botones para leer un identificador con la camara (QR o codigo de
 * barras) o por NFC.
 *
 *   <dta-lector-codigo al-leer="newSensor.id = $codigo" que="sensor"></dta-lector-codigo>
 *
 * La camara se apaga sola al leer, al pulsar otra vez el boton, al desmontarse el componente o cuando
 * deja de verse (p. ej. se cierra el modal): antes quedaba encendida si se cerraba el modal.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.06.001";
    var contador = 0;

    function ControladorLectorCodigo($element, $timeout, $q, $window, dtaLector) {
        var vm = this;
        var detenerCamara = null;
        var detenerNfc = null;
        var observador = null;

        function apagarCamara() {
            var detener = detenerCamara;
            detenerCamara = null;
            vm.camaraActiva = false;
            return detener ? $q.when(detener()) : $q.when();
        }

        function apagarNfc() {
            if (detenerNfc) detenerNfc();
            detenerNfc = null;
            vm.nfcActivo = false;
        }

        function entregar(codigo, origen) {
            $timeout(function () {
                vm.alLeer({ $codigo: codigo });
                vm.mensaje = (origen === "nfc" ? "Etiqueta NFC leída: " : "Código leído: ") + codigo;
                vm.error = false;
                apagarCamara();
                apagarNfc();
            });
        }

        function avisar(mensaje) {
            vm.mensaje = mensaje;
            vm.error = true;
        }

        vm.$onInit = function () {
            contador += 1;
            vm.idVisor = "dtaLector" + contador;
            vm.camaraActiva = false;
            vm.nfcActivo = false;
            vm.nfcDisponible = dtaLector.nfcDisponible();
            vm.mensaje = "";
            vm.error = false;
        };

        vm.$postLink = function () {
            var raizDom = $element && $element[0];
            if (raizDom && typeof $window.IntersectionObserver === "function") {
                observador = new $window.IntersectionObserver(function (entradas) {
                    var visible = entradas.some(function (e) { return e.isIntersecting; });
                    if (!visible && (vm.camaraActiva || vm.nfcActivo)) {
                        $timeout(function () { apagarCamara(); apagarNfc(); });
                    }
                });
                observador.observe(raizDom);
            }
        };

        vm.$onDestroy = function () {
            if (observador) observador.disconnect();
            apagarCamara();
            apagarNfc();
        };

        vm.alternarCamara = function () {
            if (vm.camaraActiva) return apagarCamara();
            apagarNfc();
            vm.mensaje = "Apunta la cámara al código QR o de barras" + (vm.que ? " del " + vm.que : "") + ".";
            vm.error = false;
            vm.camaraActiva = true;
            // El visor debe estar visible (ng-show) antes de arrancar la camara.
            return $timeout(function () {}).then(function () {
                return $q.when(dtaLector.iniciarCamara(vm.idVisor, function (codigo) { entregar(codigo, "camara"); }));
            }).then(function (detener) {
                if (!vm.camaraActiva) { detener(); return; }
                detenerCamara = detener;
            }, function (error) {
                vm.camaraActiva = false;
                avisar(error.message);
            });
        };

        vm.alternarNfc = function () {
            if (vm.nfcActivo) { apagarNfc(); vm.mensaje = ""; return $q.when(); }
            apagarCamara();
            vm.nfcActivo = true;
            vm.mensaje = "Acerca la etiqueta NFC" + (vm.que ? " del " + vm.que : "") + " a la parte trasera del teléfono.";
            vm.error = false;
            return $q.when(dtaLector.leerNfc(function (codigo) { entregar(codigo, "nfc"); }, function (error) {
                $timeout(function () { avisar(error.message); });
            })).then(function (detener) {
                if (!vm.nfcActivo) { detener(); return; }
                detenerNfc = detener;
            }, function (error) {
                vm.nfcActivo = false;
                avisar(error.message);
            });
        };
    }
    ControladorLectorCodigo.$inject = ["$element", "$timeout", "$q", "$window", "dtaLector"];

    var definicion = {
        templateUrl: "./assets/js/components/comunes/lector-codigo/lector-codigo.html?v=" + VERSION,
        controller: ControladorLectorCodigo,
        controllerAs: "vm",
        bindings: { alLeer: "&", que: "@" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorLectorCodigo, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaLectorCodigo", definicion);
})(typeof window !== "undefined" ? window : globalThis);
