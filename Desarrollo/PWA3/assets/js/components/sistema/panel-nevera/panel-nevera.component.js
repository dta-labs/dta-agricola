/**
 * REQ-057 - <dta-panel-nevera>: panel de la nevera (barra y tarjetas) sobre el mapa.
 *
 * Fase S1: mismo marcado y aspecto que antes. Los comandos y los calculos que aun viven en core.js llegan
 * como salidas '&' (ver la etiqueta en index.html); los modales se abren con al-abrir($modal) porque
 * `modal-trigger` no funciona dentro de un componente.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.22.021";

    function Controlador(dtaReglas) {
        var vm = this;
        var panel = dtaReglas.panel;

        /** Bateria del sensor en % a partir del voltaje (antes $scope.voltageToPercent). */
        vm.bateria = function (voltaje) {
            return panel.porcentajeBateria(voltaje);
        };

        // REQ-133: datos de cada tarjeta (logic/nevera.js), en cache mientras no cambien las lecturas ni el sensor
        var cache = { datos: null, unidad: null, porClave: {} };
        vm.tarjeta = function (clave, sensor) {
            var unidad = vm.sistema && vm.sistema.tempUnit === "F" ? "F" : "C";
            if (cache.datos !== vm.datos || cache.unidad !== unidad) cache = { datos: vm.datos, unidad: unidad, porClave: {} };
            var huella = JSON.stringify([sensor && sensor.type, sensor && sensor.alias, sensor && sensor.id, sensor && sensor.t, sensor && sensor.h, sensor && sensor.psi, sensor && sensor.fl, sensor && sensor.culture, sensor && sensor.cultures]);
            var guardada = cache.porClave[clave];
            if (guardada && guardada.huella === huella) return guardada.valor;
            var nevera = (raiz.DTALogic && raiz.DTALogic.nevera) || (typeof require === "function" ? require("../../../logic/nevera.js") : null);
            var valor = nevera.tarjeta(sensor, vm.datos, nevera.indiceDe(clave), unidad);
            cache.porClave[clave] = { huella: huella, valor: valor };
            return valor;
        };

        /** REQ-142: ciclos que el gateway lleva sin recibir de este sensor (0 = recibe; ver log.lo). */
        vm.ciclosSinRecepcion = function (clave) {
            var nevera = (raiz.DTALogic && raiz.DTALogic.nevera) || (typeof require === "function" ? require("../../../logic/nevera.js") : null);
            return nevera.ciclosSinRecepcion(vm.sistema && vm.sistema.log, nevera.indiceDe(clave));
        };

        /** Senal del modem en % (logic/panel.js). */
        vm.senal = function () {
            return panel.porcentajeSenal(vm.sistema && vm.sistema.log && vm.sistema.log.signal);
        };
    }
    Controlador.$inject = ["dtaReglas"];

    var definicion = {
        templateUrl: "./assets/js/components/sistema/panel-nevera/panel-nevera.html?v=" + VERSION,
        controller: Controlador,
        controllerAs: "vm",
        bindings: { sistema: "<", datos: "<", alGrafica: "&", alEditarSensor: "&", alAbrir: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: Controlador, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaPanelNevera", definicion);
})(typeof window !== "undefined" ? window : globalThis);
