/**
 * REQ-038 / REQ-043 - dtaUi: avisos y modales para los componentes.
 *
 * Los componentes no llaman a `swal`, `M.Modal` ni `bootstrap.Modal` directamente: asi no dependen
 * del framework (se cambia aqui) y se prueban con un doble.
 *
 * Modales:
 *   - Bootstrap (componentes migrados, dentro de `.bs`): al abrir, el modal se mueve a un contenedor
 *     `.bs` hijo directo de <body> ("portal"). Asi ningun contenedor de la pagina con z-index u
 *     overflow puede dejarlo debajo de su fondo. Angular sigue enlazado (mover nodos no rompe el
 *     enlace) y `destruirModal` lo retira al destruir el componente.
 *   - Materialize (lo que aun no se ha migrado): se inicializa al abrir.
 */
(function (raiz) {
    "use strict";

    var CLASE_PORTAL = "dta-portal";

    /**
     * @param obtenerSwal       funcion que devuelve `swal` (se carga desde CDN, puede llegar tarde)
     * @param obtenerM          funcion que devuelve `M` (Materialize)
     * @param consola           para trazas
     * @param obtenerBootstrap  funcion que devuelve `bootstrap` (assets/vendor/bootstrap)
     * @param obtenerDocumento  funcion que devuelve `document`
     */
    function crear(obtenerSwal, obtenerM, consola, obtenerBootstrap, obtenerDocumento) {
        var traza = consola || console;

        function bootstrapDisponible() {
            var b = obtenerBootstrap && obtenerBootstrap();
            return b && b.Modal ? b : null;
        }

        /** Un modal es de Bootstrap si esta (o estuvo) dentro de `.bs`. */
        function esDeBootstrap(elemento) {
            if (!elemento || typeof elemento.closest !== "function") return false;
            return !!elemento.closest(".bs") || !!(elemento.classList && elemento.classList.contains("dta-modal-bs"));
        }

        function portal() {
            var doc = obtenerDocumento && obtenerDocumento();
            if (!doc || !doc.body) return null;
            var existente = doc.body.querySelector(":scope > ." + CLASE_PORTAL);
            if (existente) return existente;
            var nuevo = doc.createElement("div");
            nuevo.className = "bs " + CLASE_PORTAL;
            doc.body.appendChild(nuevo);
            return nuevo;
        }

        function instanciaMaterialize(elemento) {
            var M = obtenerM && obtenerM();
            if (!elemento || !M || !M.Modal) return null;
            return M.Modal.getInstance(elemento) || M.Modal.init(elemento);
        }

        function limpiarFondosDeBootstrap() {
            var doc = obtenerDocumento && obtenerDocumento();
            if (!doc || !doc.body) return;
            Array.prototype.forEach.call(doc.querySelectorAll(".modal-backdrop"), function (fondo) { fondo.remove(); });
            doc.body.classList.remove("modal-open");
            doc.body.style.removeProperty("overflow");
            doc.body.style.removeProperty("padding-right");
        }

        return {
            /** tipo: "warning" (por defecto), "success", "error", "info" */
            avisar: function (texto, tipo) {
                if (!texto) return;
                var swal = obtenerSwal && obtenerSwal();
                if (typeof swal === "function") {
                    swal({ title: texto, icon: tipo || "warning" });
                } else {
                    traza.warn("[ui]", texto);
                }
            },

            /**
             * opciones.alCerrar: se llama una vez cuando el modal termina de cerrarse por cualquier via
             * (boton, Esc, clic fuera). Solo modales de Bootstrap (REQ-048).
             */
            abrirModal: function (elemento, opciones) {
                if (!elemento) return false;
                var b = bootstrapDisponible();
                if (b && esDeBootstrap(elemento)) {
                    var destino = portal();
                    elemento.classList.add("dta-modal-bs");
                    if (destino && elemento.parentNode !== destino) destino.appendChild(elemento);
                    if (opciones && typeof opciones.alCerrar === "function" && typeof elemento.addEventListener === "function") {
                        elemento.addEventListener("hidden.bs.modal", opciones.alCerrar, { once: true });
                    }
                    b.Modal.getOrCreateInstance(elemento).show();
                    return true;
                }
                var modal = instanciaMaterialize(elemento);
                if (modal) modal.open();
                return !!modal;
            },

            cerrarModal: function (elemento) {
                if (!elemento) return;
                var b = bootstrapDisponible();
                if (b && esDeBootstrap(elemento)) {
                    var instancia = b.Modal.getInstance(elemento);
                    if (instancia) instancia.hide();
                    return;
                }
                var M = obtenerM && obtenerM();
                var modal = M && M.Modal ? M.Modal.getInstance(elemento) : null;
                if (modal) modal.close();
            },

            /** Para $onDestroy: retira la instancia, su fondo y (Bootstrap) el nodo movido al portal. */
            destruirModal: function (elemento) {
                if (!elemento) return;
                var b = bootstrapDisponible();
                if (b && esDeBootstrap(elemento)) {
                    var instancia = b.Modal.getInstance(elemento);
                    var estabaAbierto = elemento.classList && elemento.classList.contains("show");
                    if (instancia) instancia.dispose();
                    if (estabaAbierto) limpiarFondosDeBootstrap();
                    if (elemento.parentNode && elemento.parentNode.classList && elemento.parentNode.classList.contains(CLASE_PORTAL)) {
                        elemento.parentNode.removeChild(elemento);
                    }
                    return;
                }
                var M = obtenerM && obtenerM();
                var modal = M && M.Modal ? M.Modal.getInstance(elemento) : null;
                if (modal) modal.destroy();
            }
        };
    }

    if (typeof module !== "undefined" && module.exports) module.exports = { crear: crear };
    if (raiz.angular) {
        raiz.angular.module("Administracion").factory("dtaUi", function () {
            return crear(
                function () { return raiz.swal; },
                function () { return raiz.M; },
                raiz.console,
                function () { return raiz.bootstrap; },
                function () { return raiz.document; }
            );
        });
    }
})(typeof window !== "undefined" ? window : globalThis);
