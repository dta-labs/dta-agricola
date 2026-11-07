/**
 * REQ-040 / REQ-048 - Componente <dta-fichas-tecnicas>: catalogo de cultivos y su ficha por etapas,
 * en un modal (mismo estilo que "Mi perfil").
 *
 *   <dta-fichas-tecnicas ng-if="fichasAbiertas" al-cerrar="fichasAbiertas = false">
 *
 * Al montarse abre el modal sobre la pantalla actual; al cerrarlo (boton, Esc o clic fuera) avisa con
 * `al-cerrar` y el ng-if lo desmonta. Dentro: lista con buscador -> ficha del cultivo -> volver.
 * Lee /cultivos al abrir (REQ-040 F-3/F-5) y prepara la ficha sin modificar los datos (F-1).
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.06.003";

    function ControladorFichasTecnicas($q, $timeout, $element, dtaRepo, dtaReglas, dtaUi) {
        var vm = this;
        var reglas = dtaReglas.cultivos;

        // El modal de Bootstrap se mueve al <body> al abrirse (portal de dtaUi): se guarda la referencia.
        var modal = null;
        function elementoModal() {
            if (modal) return modal;
            var raizDom = $element && $element[0];
            modal = raizDom ? raizDom.querySelector(".fichas-modal") : null;
            return modal;
        }

        vm.$onInit = function () {
            vm.estado = "cargando";
            vm.cultivos = [];
            vm.ficha = null;
            vm.aviso = null;
            vm.filtro = "";
            return $q.when(dtaRepo.leerCultivos()).then(function (instantanea) {
                var datos = instantanea && typeof instantanea.val === "function" ? instantanea.val() : instantanea;
                vm.cultivos = reglas.cultivosVisibles(datos);
                vm.estado = vm.cultivos.length ? "lista" : "vacia";
            }, function (error) {
                // Las reglas desplegadas pueden denegar /cultivos: se dice, no se deja la lista muda.
                if (raiz.console) raiz.console.warn("[fichas] no se pudieron leer los cultivos:", (error && error.message) || error);
                vm.cultivos = [];
                vm.estado = "vacia";
            });
        };

        vm.$postLink = function () {
            dtaUi.abrirModal(elementoModal(), {
                alCerrar: function () {
                    // El evento de Bootstrap llega fuera del ciclo de Angular.
                    $timeout(function () { vm.alCerrar(); });
                }
            });
        };

        vm.$onDestroy = function () {
            dtaUi.destruirModal(elementoModal());
        };

        vm.esGratuito = function (cultivo) {
            return reglas.esGratuito(cultivo);
        };

        /** Gratuito: muestra su ficha dentro del modal. De pago: aviso en la lista. */
        vm.abrir = function (cultivo) {
            vm.aviso = null;
            if (!reglas.esGratuito(cultivo)) {
                vm.aviso = "La ficha técnica de " + cultivo.culture
                    + (cultivo.detail ? " (" + cultivo.detail + ")" : "") + " es un recurso de pago.";
                return false;
            }
            vm.ficha = reglas.prepararFicha(cultivo);
            return true;
        };

        vm.volverALista = function () {
            vm.ficha = null;
        };

        vm.cerrar = function () {
            dtaUi.cerrarModal(elementoModal());
        };
    }
    ControladorFichasTecnicas.$inject = ["$q", "$timeout", "$element", "dtaRepo", "dtaReglas", "dtaUi"];

    var definicion = {
        templateUrl: "./assets/js/components/fichas-tecnicas/fichas-tecnicas.html?v=" + VERSION,
        controller: ControladorFichasTecnicas,
        controllerAs: "vm",
        bindings: { alCerrar: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorFichasTecnicas, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaFichasTecnicas", definicion);
})(typeof window !== "undefined" ? window : globalThis);
