/**
 * REQ-013 - Servicio de dominio `equipos`.
 *
 * Sostiene el estado y las suscripciones de los equipos del usuario. Recibe el repositorio
 * (inyectado) y usa las reglas puras de logic/equipos.js. Nunca toca $scope ni Angular:
 * avisa con callbacks y el controlador decide que hacer con la vista.
 *
 * En el navegador se expone como DTALogic.equiposServicio (DTALogic.equipos son las reglas).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory(require("../logic/equipos"));
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.equiposServicio = factory(root.DTALogic.equipos);
    }
}(typeof self !== "undefined" ? self : this, function (reglas) {
    "use strict";

    var METODOS_REQUERIDOS = ["escucharSistema", "escucharUsuariosSistema", "escucharUltimoLog"];

    function crear(repositorio) {
        if (!repositorio) {
            throw new Error("servicio equipos: falta el repositorio");
        }
        METODOS_REQUERIDOS.forEach(function (metodo) {
            if (typeof repositorio[metodo] !== "function") {
                throw new Error("servicio equipos: el repositorio no implementa " + metodo + "()");
            }
        });

        var sistemas = {};
        var suscripcionesSistema = {};
        var suscripcionesUsuarios = {};
        var suscripcionesUltimoLog = {};
        var ultimaAlarmaPorEquipo = {};

        function cancelar(mapa, clave) {
            var suscripcion = mapa[clave];
            if (suscripcion && typeof suscripcion.off === "function") suscripcion.off();
            delete mapa[clave];
        }

        return {
            /** Suscribe el bloque settings de cada equipo. Reemplaza suscripciones previas. */
            cargar: function (claves, opciones) {
                var op = opciones || {};
                (claves || []).forEach(function (clave) {
                    cancelar(suscripcionesSistema, clave);
                    suscripcionesSistema[clave] = repositorio.escucharSistema(clave, function (snapshot) {
                        var valor = snapshot && typeof snapshot.val === "function" ? snapshot.val() : null;
                        var sistema = reglas.normalizarSistema(valor, clave);
                        if (!sistema) return;
                        sistemas[clave] = sistema;
                        if (typeof op.alCambiarSistema === "function") op.alCambiarSistema(sistema, clave);
                    }, function (error) {
                        if (typeof op.alError === "function") op.alError(clave, error);
                    });
                });
            },

            /** Usuarios con acceso al equipo. Reemplaza la suscripcion anterior. */
            escucharUsuarios: function (clave, alCambiar, alError) {
                cancelar(suscripcionesUsuarios, clave);
                suscripcionesUsuarios[clave] = repositorio.escucharUsuariosSistema(clave, alCambiar, alError);
            },

            /** Ultima lectura en vivo. No re-suscribe si la ruta no cambio. */
            escucharUltimoLog: function (clave, directorio, alCambiar, alError) {
                var ruta = "systems/" + clave + "/" + directorio;
                var actual = suscripcionesUltimoLog[clave];
                if (actual && actual.ruta === ruta) return;
                cancelar(suscripcionesUltimoLog, clave);
                var suscripcion = repositorio.escucharUltimoLog(clave, directorio, alCambiar, alError);
                suscripcionesUltimoLog[clave] = { off: suscripcion.off, ruta: suscripcion.ruta || ruta };
            },

            /** Cancela todo y olvida el estado (al cerrar sesion). */
            detenerTodo: function () {
                Object.keys(suscripcionesSistema).forEach(function (clave) { cancelar(suscripcionesSistema, clave); });
                Object.keys(suscripcionesUsuarios).forEach(function (clave) { cancelar(suscripcionesUsuarios, clave); });
                Object.keys(suscripcionesUltimoLog).forEach(function (clave) { cancelar(suscripcionesUltimoLog, clave); });
                sistemas = {};
                ultimaAlarmaPorEquipo = {};
            },

            sistema: function (clave) { return sistemas[clave] || null; },
            sistemas: function () { return sistemas; },

            /**
             * Alarmas termicas del equipo para la lectura indicada.
             * Deduplica por fecha: la misma lectura no vuelve a sonar.
             */
            evaluarAlertas: function (sistema, fecha) {
                if (!sistema) return { alarmas: [], sonar: false };
                var clave = sistema.key || sistema.name || "sin-clave";
                if (ultimaAlarmaPorEquipo[clave] === fecha) {
                    return { alarmas: [], sonar: false };
                }
                ultimaAlarmaPorEquipo[clave] = fecha;

                var datos = [];
                try {
                    datos = JSON.parse((sistema.log && sistema.log.dataRaw) || "[]");
                } catch (error) {
                    console.warn("[equipos] dataRaw invalido en " + clave + ":", (error && error.message) || error);
                    datos = [];
                }
                var alarmas = reglas.alarmasDeSensores(sistema, Array.isArray(datos) ? datos : []);
                return { alarmas: alarmas, sonar: alarmas.length > 0 };
            },

            /**
             * Etiqueta de retraso por equipo (solo tipo != Sensor).
             * `mapa` permite evaluar un conjunto distinto del cacheado (util en pruebas).
             */
            marcarRetrasos: function (ahora, mapa) {
                var universo = mapa || sistemas;
                var resultado = [];
                Object.keys(universo).forEach(function (clave) {
                    var equipo = universo[clave];
                    if (!equipo || equipo.type === "Sensor") return;
                    resultado.push({ clave: clave, etiqueta: reglas.etiquetaDeRetraso(equipo.log, ahora) });
                });
                return resultado;
            }
        };
    }

    return { crear: crear };
}));
