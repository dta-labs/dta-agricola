/**
 * REQ-006 - Programacion de parcelas de un plan de riego (logica pura, sin $scope).
 *
 * Extraido de core.js: createStationaryProgram + runLoop + excecuteProgram.
 * El controller sigue siendo quien escribe en $scope.actualSystem.plots; aqui solo se calcula
 * QUE hay que escribir.
 *
 * UMD. Depende de DTALogic.fechas y DTALogic.secuencias.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./fechas"), require("./secuencias"));
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.riego = factory(root.DTALogic.fechas, root.DTALogic.secuencias);
    }
}(typeof self !== "undefined" ? self : this, function (fechas, secuencias) {
    "use strict";

    var PARCELAS = 7;
    var MINUTOS_POR_PERIODO = { "1": 1440, "2": 10080, "3": 43200 };   // dias, semanas, meses de 30 d

    function idPorDefecto() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Calcula las entradas de programacion de un plan.
     *
     * plan: { nombre, periodo ("0" veces | "1" dias | "2" semanas | "3" meses), cada,
     *         fecha_inicio ("YYYY-MM-DD"), hora_inicio ("HH:MM AM|PM"),
     *         fecha_fin ("YYYY-MM-DD"), t: [minutos por parcela] }
     *
     * Devuelve { id, entradas: [{ parcela, id, nombre, date, t, time, value }] }.
     *
     * DEFECTOS CONSERVADOS (ver docs/spec/REQ-006-riego.md):
     *   D-03  el cierre de cada bloque se formatea en UTC, y el bloque siguiente arranca con esa
     *         hora: en periodo "veces" con cada > 1 la programacion se desplaza 6 h en Mexico.
     *   D-13  si `t` no tiene al menos 6 tiempos positivos, se lanza TypeError.
     */
    function programar(plan, opciones) {
        var generarId = (opciones && typeof opciones.generarId === "function")
            ? opciones.generarId : idPorDefecto;
        var id = generarId();
        var entradas = [];

        var aviso = null;

        function anadirBloque(fechaInicio, horaInicio) {
            // D-06 (REQ-007): `t` puede no ser un array; se normaliza para no lanzar en .forEach.
            var tiempos = Array.isArray(plan.t) ? plan.t : [];
            var fechasParcelas = secuencias.generarSecuenciaParcelas(fechaInicio, horaInicio, tiempos);
            // D-13 (REQ-007): antes, con menos de 7 tiempos, fechasParcelas[i] era undefined y
            // `.slice` lanzaba TypeError. Ahora se programa lo que se puede y se devuelve un aviso.
            var limite = Math.min(PARCELAS, fechasParcelas.length, tiempos.length);
            if (limite < PARCELAS) {
                aviso = "faltan tiempos por parcela: se programaron " + limite + " de " + PARCELAS;
            }
            for (var i = 0; i < limite; i += 1) {
                entradas.push({
                    parcela: i,
                    id: id,
                    nombre: plan.nombre,
                    date: fechasParcelas[i].slice(0, 10),
                    t: "",
                    time: fechasParcelas[i].slice(11, 16),
                    value: plan.t[i] * 60 * 1000
                });
            }
            return fechasParcelas[fechasParcelas.length - 1];
        }

        var periodo = String(plan.periodo);
        var i;

        if (periodo === "0") {
            var fecha = plan.fecha_inicio;
            var hora = plan.hora_inicio;
            for (i = 0; i < plan.cada; i += 1) {
                var fin = anadirBloque(fecha, hora);
                fecha = fin.slice(0, 10);
                hora = fin.slice(11, 16);
            }
        } else if (MINUTOS_POR_PERIODO[periodo]) {
            var minutos = MINUTOS_POR_PERIODO[periodo];
            var fechaLoop = plan.fecha_inicio;
            while (fechas.menorIgual(fechaLoop, plan.fecha_fin)) {
                anadirBloque(fechaLoop, plan.hora_inicio);
                var inicio = new Date(fechaLoop + " " + plan.hora_inicio);
                inicio = new Date(inicio.getTime() + plan.cada * minutos * 60000);
                var d = String(inicio.getDate()).padStart(2, "0");
                var m = String(inicio.getMonth() + 1).padStart(2, "0");
                fechaLoop = inicio.getFullYear() + "-" + m + "-" + d;
            }
        }

        return { id: id, entradas: entradas, aviso: aviso };
    }

    /**
     * REQ-009b - Mensaje para la UI a partir del resultado de `programar`.
     * Es puro: la vista solo lo pinta, asi que se puede probar sin DOM.
     */
    function mensajeDeResultado(resultado) {
        if (!resultado) {
            return { icono: "warning", titulo: "No se pudo programar el riego", detalle: "" };
        }
        if (resultado.aviso) {
            return {
                icono: "warning",
                titulo: "Programa iniciado con avisos",
                detalle: resultado.aviso + ". Revisa las parcelas sin tiempo."
            };
        }
        return { icono: "success", titulo: "Programa de riego iniciado correctamente!", detalle: "" };
    }

    return { programar: programar, mensajeDeResultado: mensajeDeResultado };
}));
