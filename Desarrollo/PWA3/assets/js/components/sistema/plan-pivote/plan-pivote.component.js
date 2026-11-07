/**
 * REQ-059 - <dta-plan-pivote>: crear o editar un plan de riego del pivote (sector por angulos).
 *
 *   <dta-plan-pivote sistema="actualSystem" edicion="planPivote" cultivos="listOfCultures"
 *       redes-sensores="redesDeSensores" al-guardar="guardarPlanPivote($plan, $indice)"
 *       al-ver-velocidades="verVelocidadesPivote($velocidad)">
 *
 * Sustituye a "Nuevo plan" (#modalRiego, que leia los campos del DOM) y "Planificacion" (#modalEditRiego):
 * eran el mismo formulario dos veces. `edicion` = { indice: "pN" | null, plan: formulario }; el
 * formulario se edita en el sitio (mismo objeto que core.js, asi la tabla de velocidades puede fijar
 * la velocidad). Valida en la vista con logic/pivote.js y solo entonces entrega el plan a guardar.
 * El modal es de Materialize (lo abre core.js con abrirModal("modalPlanPivote")); el contenido, Bootstrap.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.07.008";

    function ControladorPlanPivote($element, dtaReglas, dtaUi) {
        var vm = this;
        var pivote = dtaReglas.pivote;
        var modal = null;

        function elementoModal() {
            if (modal) return modal;
            var raizDom = $element && $element[0];
            modal = raizDom ? raizDom.querySelector("#modalPlanPivote") : null;
            return modal;
        }

        /** Referencia fija al formulario (ng-model necesita una expresion asignable estable). */
        function tomarPlan() {
            vm.plan = (vm.edicion && vm.edicion.plan) || {};
        }

        vm.$onInit = function () {
            vm.suelos = pivote.SUELOS;
            vm.errores = {};
            tomarPlan();
        };

        vm.$onChanges = function (cambios) {
            if (cambios.edicion) {
                vm.errores = {};
                tomarPlan();
            }
        };

        vm.esNuevo = function () {
            return !vm.edicion || !vm.edicion.indice;
        };

        vm.maximo = function () {
            var m = Number(vm.sistema && vm.sistema.maxVelocity);
            return isFinite(m) && m > 0 && m <= 100 ? m : 100;
        };

        vm.hayErrores = function () {
            return Object.keys(vm.errores).length > 0;
        };

        vm.guardar = function () {
            // REQ-060: tambien comprueba que el sector no se solape con los demas planes del pivote.
            vm.errores = pivote.erroresDelPlan(vm.plan, vm.sistema && vm.sistema.maxVelocity,
                vm.sistema && vm.sistema.plans, vm.edicion ? vm.edicion.indice : null);
            if (vm.hayErrores()) return false;
            dtaUi.cerrarModal(elementoModal());
            vm.alGuardar({ $plan: pivote.planParaGuardar(vm.plan), $indice: vm.edicion ? vm.edicion.indice : null });
            return true;
        };

        vm.cerrar = function () {
            dtaUi.cerrarModal(elementoModal());
        };

        vm.alternarPistola = function () {
            var f = vm.plan;
            f.pistola = !f.pistola;
        };

        vm.verVelocidades = function () {
            vm.alVerVelocidades({ $velocidad: vm.plan.velocidad });
        };
    }
    ControladorPlanPivote.$inject = ["$element", "dtaReglas", "dtaUi"];

    var definicion = {
        templateUrl: "./assets/js/components/sistema/plan-pivote/plan-pivote.html?v=" + VERSION,
        controller: ControladorPlanPivote,
        controllerAs: "vm",
        bindings: { sistema: "<", edicion: "<", cultivos: "<", redesSensores: "<", alGuardar: "&", alVerVelocidades: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorPlanPivote, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaPlanPivote", definicion);
})(typeof window !== "undefined" ? window : globalThis);
