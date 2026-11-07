/**
 * REQ-043 - Campos nativos de fecha y hora que guardan en el formato de siempre.
 *
 *   <input type="date" dta-fecha-guardada="programaEstacionario.fecha_inicio">   ("Nov 06, 2026")
 *   <input type="time" dta-hora-guardada="programaEstacionario.hora_inicio">     ("8:30 AM")
 *   <input type="date" dta-fecha-iso="perfil.fechaNacimiento">                    ("2026-11-06")
 *
 * Sustituyen al datepicker/timepicker de Materialize: en el movil abren el selector del sistema.
 * No usan ng-model a proposito: input[date] de AngularJS exige objetos Date en el modelo, y aqui el
 * modelo es texto en el formato que ya esta guardado (y que lee el resto del sistema).
 */
(function (raiz) {
    "use strict";

    /** Enlaza un <input> nativo con una expresion de texto, convirtiendo en ambos sentidos. */
    function crearDirectiva(nombreAtributo, aCampo, aGuardado) {
        return ["$parse", function ($parse) {
            return {
                restrict: "A",
                link: function (scope, elemento, atributos) {
                    var expresion = atributos[nombreAtributo];
                    var leer = $parse(expresion);
                    var escribir = leer.assign;
                    var campo = elemento[0];

                    var dejarDeVigilar = scope.$watch(leer, function (valor) {
                        var mostrado = aCampo(valor);
                        if (campo.value !== mostrado) campo.value = mostrado;
                    });

                    function alCambiar() {
                        var guardado = campo.value ? aGuardado(campo.value) : "";
                        if (!escribir) return;
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

    function registrar(angular, fechas) {
        angular.module("Administracion")
            .directive("dtaFechaGuardada", crearDirectiva("dtaFechaGuardada", fechas.isoDesdeFechaGuardada, fechas.fechaGuardadaDesdeIso))
            .directive("dtaHoraGuardada", crearDirectiva("dtaHoraGuardada", fechas.hora24DesdeHoraGuardada, fechas.horaGuardadaDesde24))
            // REQ-045: fecha como texto ISO; acepta tambien lo que se guardo antes como Date serializado.
            .directive("dtaFechaIso", crearDirectiva("dtaFechaIso", fechas.isoDesdeFechaGuardada, fechas.isoDesdeFechaGuardada));
    }

    if (typeof module !== "undefined" && module.exports) module.exports = { crearDirectiva: crearDirectiva };
    if (raiz.angular && raiz.DTALogic && raiz.DTALogic.fechas) registrar(raiz.angular, raiz.DTALogic.fechas);
})(typeof window !== "undefined" ? window : globalThis);
