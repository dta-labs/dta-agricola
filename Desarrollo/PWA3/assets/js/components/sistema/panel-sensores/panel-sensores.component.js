/**
 * REQ-057 - <dta-panel-sensores>: panel de la red de sensores (barra y tarjetas) sobre el mapa.
 *
 * Fase S1: mismo marcado y aspecto que antes. Los comandos y los calculos que aun viven en core.js llegan
 * como salidas '&' (ver la etiqueta en index.html); los modales se abren con al-abrir($modal) porque
 * `modal-trigger` no funciona dentro de un componente.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.08.001";

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

        // REQ-076: por ficha, humedad del suelo (por defecto) o temperatura como valor principal.
        // REQ-077: la eleccion llega del usuario (`intercambios`: { S0: "temperatura" }) y se guarda con al-intercambiar.
        vm.intercambiado = {};

        function leerIntercambios() {
            var guardados = vm.intercambios || {};
            vm.intercambiado = {};
            Object.keys(guardados).forEach(function (clave) {
                if (guardados[clave] === "temperatura") vm.intercambiado[clave] = true;
            });
        }

        vm.$onInit = function () { leerIntercambios(); };
        vm.$onChanges = function (cambios) { if (cambios.intercambios) leerIntercambios(); };

        vm.alternar = function (clave, evento) {
            if (evento && evento.stopPropagation) evento.stopPropagation();
            vm.intercambiado[clave] = !vm.intercambiado[clave];
            if (vm.alIntercambiar) vm.alIntercambiar({ $clave: clave, $temperatura: vm.intercambiado[clave] });
        };

        // REQ-076: bateria en 4 niveles (llena, media, casi vacia, vacia) con su % debajo.
        function bateria(voltaje) {
            if (voltaje === null) return { icono: "battery-empty", texto: "--" };
            var pct = Number(dtaReglas.panel.porcentajeBateria(voltaje));
            var icono = pct > 75 ? "battery-full" : pct > 40 ? "battery-half" : pct > 10 ? "battery-quarter" : "battery-empty";
            return { icono: icono, texto: pct + "%" };
        }

        var ZONA_TEMPERATURA = { frio: "frio", bien: "adecuada", critico: "calor" };

        vm.lectura = function (clave, sensor) {
            var indice = Number(String(clave).replace(/\D/g, ""));
            var valores = dtaReglas.humedad.valoresDeSensor(vm.sistema, indice, datos());
            var resultado = { bateria: bateria(valores.bateria) };
            if (vm.intercambiado[clave]) {
                var unidad = vm.sistema && vm.sistema.tempUnit === "C" ? "C" : "F";
                var escalaT = dtaReglas.medidor.escalaTemperatura(valores.t, sensor, unidad);
                var sinT = valores.t === null;
                resultado.valor = sinT ? "--" : Math.round(unidad === "C" ? valores.t : valores.t * 9 / 5 + 32);
                resultado.unidad = unidad === "C" ? "°C" : "°F";
                resultado.etiqueta = sinT ? "Sin lectura" : escalaT.etiqueta;
                resultado.zona = sinT ? "sin-dato" : (ZONA_TEMPERATURA[escalaT.nivel] || "adecuada");
                resultado.titulo = "Temperatura";
                return resultado;
            }
            var escala = dtaReglas.medidor.escalaHumedadSuelo(sensor, valores.ms);
            var sinDato = valores.ms === null;
            resultado.valor = sinDato ? "--" : Math.round(valores.ms);
            resultado.unidad = sensor && sensor.type === "WM" ? "cb" : "%";
            resultado.etiqueta = sinDato ? "Sin lectura" : escala.etiqueta;
            resultado.zona = sinDato ? "sin-dato" : (CLASE_POR_ETIQUETA[escala.etiqueta] || "adecuada");
            resultado.titulo = "Humedad del suelo";
            return resultado;
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
        bindings: { sistema: "<", clima: "<", mostrarLista: "<", intercambios: "<", valorSensor: "&", alGrafica: "&", alEditarSensor: "&", alAbrir: "&", alIntercambiar: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: Controlador, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaPanelSensores", definicion);
})(typeof window !== "undefined" ? window : globalThis);
