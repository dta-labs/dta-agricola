/**
 * REQ-039 - Componente <dta-login>: la vista de acceso.
 *
 * Google, correo en dos pasos (correo -> contrasena), alta de cuenta y recuperar contrasena.
 * No navega: al entrar, el observador de sesion de core.js lleva al listado.
 * Los mensajes se muestran debajo del formulario (vm.mensaje), no en una ventana aparte: quedan
 * junto a los campos y no dependen de SweetAlert.
 * El observador y salir() no son de esta vista (siguen en core.js).
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.06.004";

    function ControladorLogin($q, $element, dtaAuth, dtaReglas, dtaUi) {
        var vm = this;

        // REQ-043: al abrirse, el modal de Bootstrap se mueve al <body> (portal de dtaUi); se guarda la
        // referencia la primera vez porque despues ya no esta dentro del componente.
        var modal = null;
        function modalDeAlta() {
            if (modal) return modal;
            var raizDom = $element && $element[0];
            modal = raizDom ? raizDom.querySelector(".login-modal-alta") : null;
            return modal;
        }

        function mostrar(texto, tipo) {
            vm.mensaje = texto ? { texto: texto, tipo: tipo || "error" } : null;
        }

        function mostrarErrorDeAcceso(error) {
            mostrar(dtaAuth.mensajeDeError(error), "error");
        }

        function avisarError(error) {
            if (dtaAuth.debeAvisar(error)) mostrarErrorDeAcceso(error);
        }

        vm.limpiarMensaje = function () {
            vm.mensaje = null;
        };

        /** Ejecuta una accion de acceso evitando dobles envios. */
        function enCurso(accion) {
            if (vm.ocupado) return $q.when();
            vm.ocupado = true;
            return $q.when()
                .then(accion)
                .finally(function () { vm.ocupado = false; });
        }

        vm.$onInit = function () {
            vm.paso = "correo";
            vm.correo = "";
            vm.clave = "";
            vm.alta = { correo: "", clave: "" };
            vm.ocupado = false;
            vm.mensaje = null;
            vm.mensajeAlta = null;
            // Si se vuelve de Google con error, el usuario queda aqui y debe verlo (REQ-035 C-2).
            return $q.when(dtaAuth.recogerRedireccion()).catch(avisarError);
        };

        vm.$onDestroy = function () {
            dtaUi.destruirModal(modalDeAlta());
        };

        vm.google = function () {
            vm.limpiarMensaje();
            return enCurso(function () {
                return $q.when(dtaAuth.accederConGoogle()).catch(avisarError);
            });
        };

        /** Paso 1 -> 2. Devuelve true si avanza. */
        vm.siguiente = function () {
            if (!dtaReglas.login.esCorreoValido(vm.correo)) {
                mostrar("Escribe un correo electrónico válido.");
                return false;
            }
            vm.limpiarMensaje();
            vm.paso = "contrasena";
            return true;
        };

        vm.atras = function () {
            vm.paso = "correo";
            vm.clave = "";
            vm.limpiarMensaje();
        };

        vm.entrar = function () {
            if (!vm.clave) {
                mostrar("Escribe tu contraseña.");
                return $q.when();
            }
            vm.limpiarMensaje();
            return enCurso(function () {
                return $q.when(dtaAuth.entrarConCorreo(vm.correo.trim(), vm.clave)).catch(mostrarErrorDeAcceso);
            });
        };

        /** ng-submit del formulario: Enter avanza en el paso 1 y entra en el paso 2. */
        vm.enviar = function () {
            if (vm.paso === "correo") {
                vm.siguiente();
                return $q.when();
            }
            return vm.entrar();
        };

        vm.recuperar = function () {
            var correo = (vm.correo || "").trim();
            if (!correo) {
                mostrar("Escribe tu correo y vuelve a pulsar \"¿Olvidaste tu contraseña?\".");
                return $q.when();
            }
            return enCurso(function () {
                return $q.when(dtaAuth.recuperarContrasena(correo)).then(function () {
                    // No se revela si el correo existe.
                    mostrar("Si el correo está registrado, recibirás un enlace para cambiar la contraseña.", "exito");
                }, mostrarErrorDeAcceso);
            });
        };

        vm.abrirAlta = function () {
            vm.alta = { correo: vm.correo || "", clave: "" };
            vm.mensajeAlta = null;
            dtaUi.abrirModal(modalDeAlta());
        };

        vm.cerrarAlta = function () {
            dtaUi.cerrarModal(modalDeAlta());
        };

        vm.crearCuenta = function () {
            var correo = (vm.alta.correo || "").trim();
            if (!dtaReglas.login.esCorreoValido(correo)) {
                vm.mensajeAlta = "Escribe un correo electrónico válido.";
                return $q.when();
            }
            vm.mensajeAlta = null;
            return enCurso(function () {
                return $q.when(dtaAuth.crearCuenta(correo, vm.alta.clave)).then(function () {
                    dtaUi.cerrarModal(modalDeAlta());
                    mostrar("Cuenta creada correctamente.", "exito");
                }, function (error) {
                    vm.mensajeAlta = dtaAuth.mensajeDeError(error);
                });
            });
        };
    }
    ControladorLogin.$inject = ["$q", "$element", "dtaAuth", "dtaReglas", "dtaUi"];

    var definicion = {
        templateUrl: "./assets/js/components/login/login.html?v=" + VERSION,
        controller: ControladorLogin,
        controllerAs: "vm",
        bindings: {}
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorLogin, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaLogin", definicion);
})(typeof window !== "undefined" ? window : globalThis);
