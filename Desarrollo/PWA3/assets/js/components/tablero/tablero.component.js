/**
 * REQ-114 - <dta-tablero>: vista de resumen (pagina de entrada). Indicadores, "Atiende primero", "Mis cultivos" y
 * "Hoy". Los datos los calcula logic/tablero.js (core.js los pasa ya cacheados).
 *
 *   <dta-tablero datos="tableroActual()" hoy="hoyActual()" al-abrir-equipo="abrirEquipo($clave)"
 *       al-ver-equipos="cambiarVistaPrincipal('equipos')" al-agregar-equipo="..."></dta-tablero>
 * REQ-115: sugerencias del dia (al final) y, sin equipos registrados, bienvenida con las sugerencias de inicio.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.22.015";

    function ControladorTablero() {
        var vm = this;

        /** REQ-115: accion de una sugerencia (abrir equipo, ver equipos, agregar equipo o pagina externa). */
        vm.sugerencia = function (s) {
            var a = s && s.accion;
            if (!a) return;
            if (a.tipo === "equipo" && a.clave) vm.alAbrirEquipo({ $clave: a.clave });
            else if (a.tipo === "agregar") vm.alAgregarEquipo();
            else if (a.tipo === "url" && /^https:\/\//.test(a.url || "")) raiz.open(a.url, "_blank", "noopener");
            else vm.alVerEquipos();
        };

        vm.abrir = function (item) {
            if (item && item.clave) vm.alAbrirEquipo({ $clave: item.clave });
            else vm.alVerEquipos();
        };

        /** "−2 °C" con el signo menos tipografico. */
        vm.grados = function (valor) {
            if (valor === null || valor === undefined) return "—";
            return String(valor).replace("-", "−") + " °C";
        };

        vm.titulo = function (texto) {
            return String(texto || "").replace(/ -(\d)/g, " −$1");
        };
    }

    var definicion = {
        templateUrl: "./assets/js/components/tablero/tablero.html?v=" + VERSION,
        controller: ControladorTablero,
        controllerAs: "vm",
        bindings: { datos: "<", hoy: "<", alAbrirEquipo: "&", alVerEquipos: "&", alAgregarEquipo: "&", alAbrirNotificaciones: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorTablero, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaTablero", definicion);
})(typeof window !== "undefined" ? window : globalThis);
