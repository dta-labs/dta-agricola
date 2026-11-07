/**
 * REQ-057 - <dta-panel-pivote-central>: controles y estado del pivote central sobre el mapa.
 *
 *   <dta-panel-pivote-central ng-if="actualSystem.type == 'PC'" sistema="actualSystem"
 *       al-avanzar="playForward()" al-retroceder="playBackward()" al-detener="stopSystem()">
 *
 * Primer paso de la extraccion de "Sistema": mismo marcado y aspecto que antes; los comandos siguen
 * en core.js (salidas '&') y los calculos de la vista en logic/panel.js.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.06.001";
    var ENCENDIDO = "springgreen";
    var APAGADO = "lightgray";

    function ControladorPanelPivoteCentral(dtaReglas) {
        var vm = this;
        var panel = dtaReglas.panel;

        vm.log = function () {
            return (vm.sistema && vm.sistema.log) || {};
        };

        vm.colorBoton = function (boton) {
            return { color: panel.botonesMovimiento(vm.sistema)[boton] ? ENCENDIDO : APAGADO };
        };

        vm.senal = function () { return panel.porcentajeSenal(vm.log().signal); };
        vm.comunicacionOk = function () { return panel.comunicacionOk(vm.log()); };
        vm.gpsOk = function () { return panel.gpsOk(vm.log()); };
        vm.seguridadOk = function () { return panel.seguridadOk(vm.log()); };
    }
    ControladorPanelPivoteCentral.$inject = ["dtaReglas"];

    var definicion = {
        templateUrl: "./assets/js/components/sistema/panel-pivote-central/panel-pivote-central.html?v=" + VERSION,
        controller: ControladorPanelPivoteCentral,
        controllerAs: "vm",
        bindings: { sistema: "<", alAvanzar: "&", alRetroceder: "&", alDetener: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorPanelPivoteCentral, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaPanelPivoteCentral", definicion);
})(typeof window !== "undefined" ? window : globalThis);
