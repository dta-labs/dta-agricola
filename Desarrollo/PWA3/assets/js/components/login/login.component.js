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

    var VERSION = "26.11.24.004";

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
            // REQ-167: con el correo sin verificar se ofrece reenviar el enlace
            vm.puedeReenviar = !!(error && error.code === "dta/correo-sin-verificar");
        }

        function avisarError(error) {
            if (dtaAuth.debeAvisar(error)) mostrarErrorDeAcceso(error);
        }

        vm.limpiarMensaje = function () {
            vm.mensaje = null;
            vm.puedeReenviar = false;
        };

        /** REQ-167: reenviar el correo de verificacion (con el correo y la contrasena escritos). */
        vm.reenviarVerificacion = function () {
            var correo = (vm.correo || "").trim();
            if (!correo || !vm.clave) { mostrar("Escribe tu correo y tu contraseña para reenviar el enlace."); return $q.when(); }
            return enCurso(function () {
                return $q.when(dtaAuth.reenviarVerificacion(correo, vm.clave)).then(function () {
                    vm.puedeReenviar = false;
                    mostrar("Te reenviamos el enlace a " + correo + ". Ábrelo y vuelve a entrar (revisa también spam).", "exito");
                }, mostrarErrorDeAcceso);
            });
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
            vm.alta = { correo: "", clave: "", confirmacion: "" };
            vm.verClave = false;
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
            if (!dtaReglas.login.esCorreoValido(correo)) {
                mostrar("Escribe tu correo y vuelve a pulsar \"¿Olvidaste tu contraseña?\".");
                return $q.when();
            }
            return enCurso(function () {
                return $q.when(dtaAuth.recuperarContrasena(correo)).then(function () {
                    // No se revela si el correo existe. REQ-164: donde buscarlo (suele caer en spam).
                    mostrar("Si " + correo + " está registrado, te enviamos un enlace para cambiar la contraseña. " +
                        "Revisa también la carpeta de spam o correo no deseado (remitente noreply). " +
                        "Si entras con Google, usa \"Continuar con Google\": esa cuenta no tiene contraseña en DTA-Agrícola.", "exito");
                }, mostrarErrorDeAcceso);
            });
        };

        vm.abrirAlta = function () {
            vm.alta = { correo: vm.correo || "", clave: "", confirmacion: "" };
            vm.verClave = false;
            vm.mensajeAlta = null;
            dtaUi.abrirModal(modalDeAlta());
        };

        /** REQ-164: barra de ayuda de la contrasena (0 a 3) y su texto. */
        vm.fuerza = function () { return dtaReglas.login.fuerzaDeClave(vm.alta && vm.alta.clave); };
        vm.textoFuerza = function () { return ["", "Débil", "Aceptable", "Fuerte"][vm.fuerza()]; };
        vm.coinciden = function () { return !!(vm.alta && vm.alta.confirmacion && vm.alta.clave === vm.alta.confirmacion); };

        vm.cerrarAlta = function () {
            dtaUi.cerrarModal(modalDeAlta());
        };

        vm.crearCuenta = function () {
            var correo = (vm.alta.correo || "").trim();
            // REQ-164: correo valido, contrasena de 6+ caracteres con letras y numeros, y confirmada
            var problema = dtaReglas.login.validarAlta(correo, vm.alta.clave, vm.alta.confirmacion);
            if (problema) {
                vm.mensajeAlta = problema;
                return $q.when();
            }
            vm.mensajeAlta = null;
            return enCurso(function () {
                return $q.when(dtaAuth.crearCuenta(correo, vm.alta.clave)).then(function (resultado) {
                    dtaUi.cerrarModal(modalDeAlta());
                    // REQ-167: no se entra hasta verificar el correo; queda listo para entrar con el correo ya escrito
                    vm.correo = correo;
                    vm.clave = "";
                    vm.paso = "contrasena";
                    mostrar(resultado && resultado.verificacion
                        ? "Cuenta creada. Te enviamos un enlace a " + correo + " para verificar tu correo (revisa también spam). " +
                          "Ábrelo y después entra con tu contraseña."
                        : "Cuenta creada, pero no se pudo enviar el correo de verificación. Escribe tu contraseña y pulsa \"Reenviar enlace\".", "exito");
                    vm.puedeReenviar = !(resultado && resultado.verificacion);
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
