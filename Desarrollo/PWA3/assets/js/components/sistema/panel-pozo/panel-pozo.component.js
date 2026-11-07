/**
 * REQ-057 - <dta-panel-pozo>: controles y estado de un sistema de bombeo (pozo).
 *
 *   <dta-panel-pozo ng-if="actualSystem.type == 'Pozo'" sistema="actualSystem"
 *       al-encender="playForward()" al-detener="stopSystem()">
 *
 * Mismo marcado y aspecto que antes; comandos en core.js, calculos en logic/panel.js.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.06.001";

    function ControladorPanelPozo(dtaReglas) {
        var vm = this;
        var panel = dtaReglas.panel;

        vm.log = function () {
            return (vm.sistema && vm.sistema.log) || {};
        };

        vm.botones = function () {
            return panel.botonesMovimiento(vm.sistema);
        };

        vm.senal = function () { return panel.porcentajeSenal(vm.log().signal); };

        vm.parcela = function () {
            return panel.parcelaActual(vm.sistema) || {};
        };

        vm.duracion = function () {
            return panel.duracionTexto(vm.parcela().value);
        };

        vm.numeroParcela = function () {
            var p = vm.sistema && Number(vm.sistema.position);
            return isFinite(p) ? p + 1 : "";
        };
    }
    ControladorPanelPozo.$inject = ["dtaReglas"];

    var definicion = {
        templateUrl: "./assets/js/components/sistema/panel-pozo/panel-pozo.html?v=" + VERSION,
        controller: ControladorPanelPozo,
        controllerAs: "vm",
        bindings: { sistema: "<", alEncender: "&", alDetener: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorPanelPozo, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaPanelPozo", definicion);
})(typeof window !== "undefined" ? window : globalThis);
