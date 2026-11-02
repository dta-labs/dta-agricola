/**
 * REQ-010 - Repositorio: conoce el ESQUEMA de la base de datos y construye las rutas.
 *
 * No sabe nada de Firebase ni de Angular: recibe un adaptador con los metodos minimos.
 * Asi el esquema (que es la parte valiosa y facil de romper) queda cubierto por pruebas.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.repositorio = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var SUFIJO_MAXIMO = "\uf8ff";   // idioma de Firebase para "hasta el final de este prefijo"

    function sinBarrasIniciales(segmento) {
        return String(segmento == null ? "" : segmento).replace(/^\/+/, "");
    }

    function rutaSistema(clave, resto) {
        var base = "systems/" + clave;
        var cola = sinBarrasIniciales(resto);
        return cola ? base + "/" + cola : base;
    }

    var METODOS_LECTURA = ["escuchar", "escucharUltimos", "leer", "leerUltimos", "leerRango", "escucharPorClave"];
    var METODOS_ESCRITURA = ["escribir", "actualizar", "empujar", "borrar"];

    function claveDeEmail(email) {
        return String(email == null ? "" : email).replace(/\./g, "-");
    }

    function crear(adaptador) {
        if (!adaptador) throw new Error("repositorio: falta el adaptador");

        var metodos = {};
        METODOS_LECTURA.concat(METODOS_ESCRITURA).forEach(function (nombre) {
            if (typeof adaptador[nombre] !== "function") {
                throw new Error("repositorio: el adaptador no implementa " + nombre + "()");
            }
            metodos[nombre] = adaptador[nombre].bind(adaptador);
        });

        function suscripcion(ruta, cancelar) {
            return {
                ruta: ruta,
                off: typeof cancelar === "function" ? cancelar : function () {}
            };
        }

        return {
            /** systems/{clave}/settings */
            escucharSistema: function (clave, alCambiar, alError) {
                var ruta = rutaSistema(clave, "settings");
                return suscripcion(ruta, metodos.escuchar(ruta, alCambiar, alError));
            },

            /** systems/{clave}/users */
            escucharUsuariosSistema: function (clave, alCambiar, alError) {
                var ruta = rutaSistema(clave, "users");
                return suscripcion(ruta, metodos.escuchar(ruta, alCambiar, alError));
            },

            /** systems/{clave}/{directorio} limitToLast(1) en vivo */
            escucharUltimoLog: function (clave, directorio, alCambiar, alError) {
                var ruta = rutaSistema(clave, directorio);
                return suscripcion(ruta, metodos.escucharUltimos(ruta, 1, alCambiar, alError));
            },

            /** systems/{clave}/{directorio} limitToLast(registros) */
            leerLogs: function (clave, directorio, registros) {
                return metodos.leerUltimos(rutaSistema(clave, directorio), registros);
            },

            /** systems/{clave}/{directorio} por rango de "date" */
            leerLogsPorRango: function (clave, directorio, desde, hasta) {
                return metodos.leerRango(rutaSistema(clave, directorio), "date", desde, hasta + SUFIJO_MAXIMO);
            },

            /** users/{email con puntos -> guiones}, escuchando por clave */
            escucharUsuarioPorClave: function (email, alCambiar, alError) {
                var clave = claveDeEmail(email);
                var ruta = "users";
                return suscripcion(ruta + "/" + clave, metodos.escucharPorClave(ruta, clave, alCambiar, alError));
            },

            /** cultivos */
            leerCultivos: function () {
                return metodos.leer("cultivos");
            },

            /** configurations/{tipo} */
            leerConfiguracion: function (tipo) {
                return metodos.leer("configurations/" + tipo);
            },

            // ---------------- escrituras (REQ-011) ----------------

            /** Solo el estado del equipo. */
            escribirEstadoSistema: function (clave, estado) {
                return metodos.actualizar(rutaSistema(clave, "settings"), { status: estado });
            },

            /** Reemplaza toda la configuracion del equipo. */
            guardarSettingsSistema: function (clave, settings) {
                return metodos.actualizar(rutaSistema(clave, "settings"), settings);
            },

            /** Crea (o reemplaza) un equipo con su bloque de settings. */
            crearSistema: function (clave, settings) {
                return metodos.escribir(rutaSistema(clave), { settings: settings });
            },

            /** Vincula usuario <-> sistema en las dos direcciones. */
            vincularUsuarioASistema: function (email, clave, rol, alias) {
                var emailKey = claveDeEmail(email);
                var enUsuario = {};
                enUsuario[clave] = rol;
                var enSistema = {};
                enSistema[emailKey] = { alias: alias, role: rol };
                return Promise.all([
                    metodos.actualizar("users/" + emailKey + "/systems", enUsuario),
                    metodos.actualizar(rutaSistema(clave, "users"), enSistema)
                ]);
            },

            /** Quita el vinculo usuario <-> sistema en las dos direcciones. */
            desvincularUsuarioDeSistema: function (clave, email) {
                var emailKey = claveDeEmail(email);
                var enSistema = {};
                enSistema[emailKey] = null;
                var enUsuario = {};
                enUsuario[clave] = null;
                return Promise.all([
                    metodos.actualizar(rutaSistema(clave, "users"), enSistema),
                    metodos.actualizar("users/" + emailKey + "/systems", enUsuario)
                ]);
            },

            /** Perfil del usuario. */
            guardarPerfilUsuario: function (email, perfil) {
                return metodos.actualizar("users/" + claveDeEmail(email) + "/profile", perfil);
            },

            /** Registro de auditoria de accesos. */
            registrarAcceso: function (id, tipo, datos) {
                var entrada = {};
                entrada[String(Date.now())] = { accessType: tipo, data: datos };
                return metodos.actualizar("access/" + id, entrada);
            },

            /** Mediciones ya resueltas (array), para quien no necesite el snapshot. */
            leerMediciones: function (clave, registros) {
                return metodos.leerUltimos(rutaSistema(clave, "logs"), registros)
                    .then(function (snapshot) {
                        return snapshot && typeof snapshot.val === "function" && snapshot.val()
                            ? Object.values(snapshot.val()) : [];
                    });
            },

            /** Solo para pruebas y diagnostico. */
            _rutas: { sistema: rutaSistema, email: claveDeEmail }
        };
    }

    return { crear: crear };
}));
