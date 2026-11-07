/**
 * <dta-version-app>: muestra la version de la app (p. ej. al pie del menu lateral).
 * Sirve para saber que version tiene cada usuario cuando reporta un problema.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.07.003";

    function ControladorVersionApp(dtaVersion) {
        var vm = this;
        vm.$onInit = function () {
            vm.version = dtaVersion.app;
            vm.compilacion = dtaVersion.compilacion;
        };
    }
    ControladorVersionApp.$inject = ["dtaVersion"];

    var definicion = {
        templateUrl: "./assets/js/components/comunes/version-app/version-app.html?v=" + VERSION,
        controller: ControladorVersionApp,
        controllerAs: "vm",
        bindings: {}
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorVersionApp, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaVersionApp", definicion);
})(typeof window !== "undefined" ? window : globalThis);
