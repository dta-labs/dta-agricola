/**
 * REQ-040 / REQ-050 - Componente <dta-ayuda>: manual de uso en un modal (estilo comun de ventanas).
 *
 *   <dta-ayuda ng-if="ayudaAbierta" al-cerrar="cerrarAyuda()">
 *
 * Mismo mecanismo que <dta-fichas-tecnicas> (REQ-048): abre el modal al montarse; al cerrarse por
 * cualquier via avisa con `al-cerrar` y el ng-if lo desmonta. Las secciones son un acordeon de
 * Bootstrap (data-bs-*): no hay nada que inicializar.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.06.003";
    var URL_APP = "https://dta-agricola.web.app";

    /** Enlace de WhatsApp para compartir la app (puro: se prueba en Node). */
    function enlaceParaCompartir(url) {
        var mensaje = "DTA - Monitoring & Control: " + (url || URL_APP);
        return "https://wa.me/?text=" + encodeURIComponent(mensaje);
    }

    function ControladorAyuda($window, $timeout, $element, dtaUi) {
        var vm = this;

        var modal = null;
        function elementoModal() {
            if (modal) return modal;
            var raizDom = $element && $element[0];
            modal = raizDom ? raizDom.querySelector(".ayuda-modal") : null;
            return modal;
        }

        vm.$onInit = function () {
            vm.mostrarQR = false;
        };

        vm.$postLink = function () {
            dtaUi.abrirModal(elementoModal(), {
                alCerrar: function () { $timeout(function () { vm.alCerrar(); }); }
            });
        };

        vm.$onDestroy = function () {
            dtaUi.destruirModal(elementoModal());
        };

        vm.cerrar = function () {
            dtaUi.cerrarModal(elementoModal());
        };

        vm.compartir = function () {
            $window.open(enlaceParaCompartir(URL_APP), "_blank", "noopener");
        };
    }
    ControladorAyuda.$inject = ["$window", "$timeout", "$element", "dtaUi"];

    var definicion = {
        templateUrl: "./assets/js/components/ayuda/ayuda.html?v=" + VERSION,
        controller: ControladorAyuda,
        controllerAs: "vm",
        bindings: { alCerrar: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorAyuda, enlaceParaCompartir: enlaceParaCompartir, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaAyuda", definicion);
})(typeof window !== "undefined" ? window : globalThis);
