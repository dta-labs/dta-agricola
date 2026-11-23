/**
 * REQ-114 - <dta-tablero>: vista de resumen (pagina de entrada). Los datos los calcula logic/tablero.js (core.js los
 * pasa ya cacheados).
 *
 *   <dta-tablero datos="tableroActual()" hoy="hoyActual()" al-abrir-equipo="abrirEquipo($clave)"
 *       al-ver-equipos="cambiarVistaPrincipal('equipos')" al-agregar-equipo="..."></dta-tablero>
 * REQ-115: sugerencias del dia y, sin equipos registrados, bienvenida con las sugerencias de inicio.
 * REQ-155: enfoques por rol (Todo, Riego, Agronomía, Campo, Administración), "Qué atender primero" con maximo 5
 *   visibles, "Lo que toca hoy" como lista de verificacion (marcas del dia en este dispositivo) y la actividad del
 *   dia plegada.
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.22.032";
    var CLAVE_ENFOQUE = "dta-resumen-enfoque";
    var VISIBLES = 5;

    // Secciones y avisos de cada enfoque (categorias de logic/tablero.js)
    var ENFOQUES = [
        { clave: "todo", nombre: "Todo", icono: "dashboard", secciones: ["atiende", "toca", "sugerencias", "cultivos", "actividad"], avisos: null },
        { clave: "riego", nombre: "Riego", icono: "water_drop", secciones: ["atiende", "toca", "sugerencias"], avisos: ["critico", "confirmacion", "comunicacion", "agronomia"] },
        { clave: "agronomia", nombre: "Agronomía", icono: "eco", secciones: ["atiende", "cultivos", "sugerencias"], avisos: ["critico", "agronomia"] },
        { clave: "campo", nombre: "Campo", icono: "engineering", secciones: ["atiende", "toca", "actividad"], avisos: null },
        { clave: "admin", nombre: "Administración", icono: "insights", secciones: ["atiende", "cultivos"], avisos: ["critico"] }
    ];

    function hoyTexto() {
        var d = new Date();
        return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    }

    function leer(clave, defecto) {
        try { var v = raiz.localStorage && raiz.localStorage.getItem(clave); return v === null || v === undefined ? defecto : v; }
        catch (e) { return defecto; }
    }

    function guardar(clave, valor) {
        try { if (raiz.localStorage) raiz.localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ }
    }

    function ControladorTablero() {
        var vm = this;

        vm.enfoques = ENFOQUES;
        vm.enfoque = ENFOQUES.some(function (e) { return e.clave === leer(CLAVE_ENFOQUE, "todo"); }) ? leer(CLAVE_ENFOQUE, "todo") : "todo";
        vm.verTodos = false;
        vm.verActividad = false;

        function enfoqueActual() {
            return ENFOQUES.filter(function (e) { return e.clave === vm.enfoque; })[0] || ENFOQUES[0];
        }

        vm.elegirEnfoque = function (clave) {
            vm.enfoque = clave;
            vm.verTodos = false;
            guardar(CLAVE_ENFOQUE, clave);
        };

        vm.muestra = function (seccion) {
            return enfoqueActual().secciones.indexOf(seccion) >= 0;
        };

        // Avisos del enfoque (misma lista mientras no cambien los datos ni el enfoque: sin infdig)
        var cacheAvisos = { datos: null, enfoque: null, lista: [] };
        vm.avisos = function () {
            var datos = vm.datos;
            if (cacheAvisos.datos !== datos || cacheAvisos.enfoque !== vm.enfoque) {
                var permitidos = enfoqueActual().avisos;
                var todos = (datos && datos.atiende) || [];
                cacheAvisos = { datos: datos, enfoque: vm.enfoque, lista: permitidos ? todos.filter(function (a) { return permitidos.indexOf(a.categoria) >= 0; }) : todos };
            }
            return cacheAvisos.lista;
        };
        vm.limite = function () { return vm.verTodos ? 1000 : VISIBLES; };

        // "Lo que toca hoy": marcas del dia (se reinician cada dia)
        var claveHecho = function () { return "dta-toca-hoy:" + hoyTexto(); };
        var hechos = {};
        try { hechos = JSON.parse(leer(claveHecho(), "{}")) || {}; } catch (e) { hechos = {}; }
        vm.hecho = function (item) { return !!(item && hechos[item.id]); };
        vm.marcar = function (item) {
            if (!item) return;
            if (hechos[item.id]) delete hechos[item.id]; else hechos[item.id] = true;
            guardar(claveHecho(), JSON.stringify(hechos));
        };
        vm.pendientes = function () {
            var lista = (vm.datos && vm.datos.tocaHoy) || [];
            return lista.filter(function (i) { return !hechos[i.id]; }).length;
        };

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
            else if (item && item.tipo === "helada") vm.alAbrirNotificaciones();
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

        /** REQ-156: "14,500" (miles con coma, como en Mexico). */
        vm.miles = function (n) {
            return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        /** REQ-156: contexto del consumo de agua (equipos activos, sin caudal configurado, caudalimetros). */
        vm.notaAgua = function () {
            var a = vm.datos && vm.datos.kpis && vm.datos.kpis.agua;
            if (!a) return "";
            if (!a.activos && !a.medidos) return "Sin riego en curso";
            var partes = [];
            if (a.activos) partes.push(a.activos + (a.activos === 1 ? " equipo activo" : " equipos activos"));
            if (a.sinCaudal) partes.push(a.sinCaudal + " sin caudal configurado");
            if (a.medidos) partes.push(a.medidos + (a.medidos === 1 ? " caudalímetro" : " caudalímetros"));
            return partes.join(" · ");
        };

        /** Ancho (%) de la barra de superficie de un cultivo respecto al mayor. */
        vm.barra = function (cultivo) {
            var lista = (vm.datos && vm.datos.cultivos) || [];
            var max = lista.reduce(function (m, c) { return Math.max(m, c.hectareas || 0); }, 0);
            return max && cultivo.hectareas ? Math.max(3, Math.round(cultivo.hectareas * 100 / max)) : 0;
        };
    }

    var definicion = {
        templateUrl: "./assets/js/components/tablero/tablero.html?v=" + VERSION,
        controller: ControladorTablero,
        controllerAs: "vm",
        bindings: { datos: "<", hoy: "<", alAbrirEquipo: "&", alVerEquipos: "&", alAgregarEquipo: "&", alAbrirNotificaciones: "&" }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorTablero, VERSION: VERSION, ENFOQUES: ENFOQUES };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaTablero", definicion);
})(typeof window !== "undefined" ? window : globalThis);
