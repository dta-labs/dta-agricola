/**
 * REQ-066 - <input dta-temperatura="sensor.t.minValue" dta-unidad="actualSystem.tempUnit">
 *
 * Muestra y edita la temperatura en la unidad del sistema (°C o °F) y la guarda SIEMPRE en °C, que es como
 * la manda el equipo y como la compara el servidor para las alertas. Sin ng-model a proposito: el modelo
 * esta en °C y el campo en otra unidad.
 */
(function (raiz) {
    "use strict";

    function crearDirectiva(unidades) {
        return ["$parse", function ($parse) {
            return {
                restrict: "A",
                link: function (scope, elemento, atributos) {
                    var leer = $parse(atributos.dtaTemperatura);
                    var escribir = leer.assign;
                    var leerUnidad = $parse(atributos.dtaUnidad);
                    var campo = elemento[0];

                    var dejarDeVigilar = scope.$watchGroup([leer, leerUnidad], function (valores) {
                        var mostrado = String(unidades.temperaturaParaMostrar(valores[0], valores[1]));
                        if (document.activeElement !== campo && campo.value !== mostrado) campo.value = mostrado;
                    });

                    function alCambiar() {
                        if (!escribir) return;
                        var guardado = unidades.temperaturaParaGuardar(campo.value, leerUnidad(scope));
                        scope.$evalAsync(function () { escribir(scope, guardado); });
                    }

                    elemento.on("change", alCambiar);
                    elemento.on("input", alCambiar);
                    scope.$on("$destroy", function () {
                        dejarDeVigilar();
                        elemento.off("change", alCambiar);
                        elemento.off("input", alCambiar);
                    });
                }
            };
        }];
    }

    if (typeof module !== "undefined" && module.exports) module.exports = { crearDirectiva: crearDirectiva };
    if (raiz.angular && raiz.DTALogic && raiz.DTALogic.unidades) {
        raiz.angular.module("Administracion").directive("dtaTemperatura", crearDirectiva(raiz.DTALogic.unidades));
    }
})(typeof window !== "undefined" ? window : globalThis);
