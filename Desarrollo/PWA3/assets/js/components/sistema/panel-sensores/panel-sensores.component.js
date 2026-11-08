/**
 * REQ-057 - <dta-panel-sensores>: panel de la red de sensores (barra y tarjetas) sobre el mapa.
 *
 * Fase S1: mismo marcado y aspecto que antes. Los comandos y los calculos que aun viven en core.js llegan
 * como salidas '&' (ver la etiqueta en index.html); los modales se abren con al-abrir($modal) porque
 * `modal-trigger` no funciona dentro de un componente.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.07.020";

    function Controlador(dtaReglas) {
        var vm = this;
        var panel = dtaReglas.panel;

        // REQ-074: lectura de humedad del suelo, su zona (etiqueta) y la clase de color de la ficha.
        // Clase por zona; el tensiometro (cb) usa las 6 zonas de REQ-070, los sensores en % sus umbrales.
        var CLASE_POR_ETIQUETA = {
            "Suelo saturado": "saturado", "Muy húmedo": "muy-humedo", "Humedad adecuada": "adecuada",
            "Estrés moderado": "estres", "Suelo muy seco": "seco", "Suelo seco": "seco", "Fuera de rango": "fuera"
        };
        var cacheDatos = { fuente: null, datos: [] };

        function datos() {
            var fuente = vm.sistema && vm.sistema.log ? vm.sistema.log.dataRaw : null;
            if (fuente !== cacheDatos.fuente) cacheDatos = { fuente: fuente, datos: dtaReglas.humedad.datosCrudos(vm.sistema) };
            return cacheDatos.datos;
        }

        vm.lectura = function (clave, sensor) {
            var indice = Number(String(clave).replace(/\D/g, ""));
            var valores = dtaReglas.humedad.valoresDeSensor(vm.sistema, indice, datos());
            var escala = dtaReglas.medidor.escalaHumedadSuelo(sensor, valores.ms);
            var sinDato = valores.ms === null;
            return {
                ms: sinDato ? "--" : Math.round(valores.ms),
                unidad: sensor && sensor.type === "WM" ? "cb" : "%",
                etiqueta: sinDato ? "Sin lectura" : escala.etiqueta,
                zona: sinDato ? "sin-dato" : (CLASE_POR_ETIQUETA[escala.etiqueta] || "adecuada")
            };
        };

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
        bindings: { sistema: "<", clima: "<", mostrarLista: "<", valorSensor: "&", alGrafica: "&", alEditarSensor: "&", alAbrir: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: Controlador, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaPanelSensores", definicion);
})(typeof window !== "undefined" ? window : globalThis);
