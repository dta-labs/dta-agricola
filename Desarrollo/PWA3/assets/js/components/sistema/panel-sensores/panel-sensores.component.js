/**
 * REQ-057 - <dta-panel-sensores>: panel de la red de sensores (barra y tarjetas) sobre el mapa.
 *
 * Fase S1: mismo marcado y aspecto que antes. Los comandos y los calculos que aun viven en core.js llegan
 * como salidas '&' (ver la etiqueta en index.html); los modales se abren con al-abrir($modal) porque
 * `modal-trigger` no funciona dentro de un componente.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.07.001";

    function Controlador(dtaReglas) {
        var vm = this;
        var panel = dtaReglas.panel;

        /** Senal del modem en % (logic/panel.js). */
        vm.senal = function () {
            return panel.porcentajeSenal(vm.sistema && vm.sistema.log && vm.sistema.log.signal);
        };
    }
    Controlador.$inject = ["dtaReglas"];

    var definicion = {
        templateUrl: "./assets/js/components/sistema/panel-sensores/panel-sensores.html?v=" + VERSION,
        controller: Controlador,
        controllerAs: "vm",
        bindings: { sistema: "<", mostrarLista: "<", valorSensor: "&", alGrafica: "&", alEditarSensor: "&", alAbrir: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: Controlador, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaPanelSensores", definicion);
})(typeof window !== "undefined" ? window : globalThis);
