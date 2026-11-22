/**
 * REQ-109 - Resumen humano y accionable de un equipo para el listado (puro: sin DOM ni Firebase).
 *
 * Responde de un vistazo lo que le importa al dueno: ¿esta todo bien o hace falta actuar?, ¿hay una emergencia?,
 * ¿que esta haciendo el equipo? En lugar de siglas o datos crudos:
 *   "Operando (237°) · Velocidad 45 %" / "Sin alertas"
 *   "Regando Sector 2 y Sector 4" / "Sin alertas"
 *   "4 sensores · 12 °C" / "Alerta: suelo seco en Sensor 2"
 *
 * Estado: "ok" | "atencion" | "emergencia" | "inactivo" (da el color de la tarjeta).
 * Dependencias (reglas): { panel, humedad, medidor } de logic/. UMD (DTALogic.resumen / Node).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.resumen = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var COLORES = { ok: "#2e7d32", atencion: "#ef6c00", emergencia: "#c62828", inactivo: "#78909c" };
    var ICONOS = { ok: "check_circle", atencion: "warning", emergencia: "error", inactivo: "pause_circle_filled" };

    function dos(n) { return String(n).padStart(2, "0"); }

    /**
     * Fecha del equipo -> { dia: "dd/mm", hora: "HH:MM" } (24 h). Acepta "AAAAMMDD hhmmam", "AAAAMMDD HHMM" y
     * "AAAAMMDD HH:MM" (algunos firmwares mandan los dos puntos: de ahi el "09::48" de la cabecera).
     */
    function fechaCorta(cadena) {
        var c = String(cadena || "").trim();
        var m = /^(\d{4})(\d{2})(\d{2})(?:\s+(\d{1,2}):?(\d{2})\s*([ap]m)?)?/i.exec(c);
        if (!m) return { dia: "", hora: "", anio: "" };
        var resultado = { dia: m[3] + "/" + m[2], hora: "", anio: m[1] };
        if (m[4] !== undefined) {
            var h = parseInt(m[4], 10);
            var sufijo = (m[6] || "").toLowerCase();
            if (sufijo === "pm") h = (h % 12) + 12;
            else if (sufijo === "am") h = h % 12;
            resultado.hora = dos(h) + ":" + m[5];
        }
        return resultado;
    }

    function numero(v) {
        if (v === undefined || v === null || v === "" || String(v).toUpperCase() === "NAN") return null;
        var n = Number(v);
        return isFinite(n) ? n : null;
    }

    function lista(nombres) {
        if (nombres.length <= 1) return nombres.join("");
        if (nombres.length === 2) return nombres[0] + " y " + nombres[1];
        return nombres[0] + " y " + (nombres.length - 1) + " más";
    }

    // REQ-110: mensajes cortos y precisos; si no caben, el generico del nivel. "Sin alertas" siempre con el check.
    var MAXIMO_MENSAJE = 26;
    var GENERICOS = { emergencia: "Acción inmediata", atencion: "Requiere atención" };

    function mensajeCorto(estado, mensaje) {
        if (mensaje.length <= MAXIMO_MENSAJE || !GENERICOS[estado]) return mensaje;
        return GENERICOS[estado];
    }

    function resultado(estado, linea, mensaje) {
        var texto = mensajeCorto(estado, mensaje);
        var sinAlertas = /^Sin alertas/.test(texto);
        return { estado: estado, linea: linea, mensaje: texto, color: COLORES[estado], icono: sinAlertas ? "check_circle" : ICONOS[estado] };
    }

    /** "Suelo seco en Nogal" / "Suelo seco en 3 sensores" */
    function enQuien(texto, nombres) {
        return texto + " en " + (nombres.length === 1 ? nombres[0] : nombres.length + " sensores");
    }

    function temperaturaTexto(c, unidad) {
        if (c === null) return "--";
        return unidad === "C" ? (Math.round(c * 10) / 10) + " °C" : Math.round(c * 9 / 5 + 32) + " °F";
    }

    function pivote(s, reglas) {
        var log = s.log || {};
        var estado = reglas.panel.estadoDeEquipo(s).estado;
        var posicion = (numero(log.position) || 0) + (s.type === "PL" ? " %" : "°");
        var velocidad = numero(log.speed) || 0;
        var presion = numero(log.presion);
        var agua = presion ? " · " + presion + " psi" : "";
        switch (estado) {
            case "falla": return resultado("emergencia", "Detenido · Sin energía", "Falla eléctrica");
            case "seguridad": return resultado("emergencia", "Detenido · Posición " + posicion, "Falla de seguridad");
            case "sin-conexion": return resultado("atencion", "Posición " + posicion, "Sin comunicación");
            case "pendiente": return resultado("atencion", "Posición " + posicion, "Esperando confirmación");
            case "apagado": return resultado("inactivo", "Detenido · Posición " + posicion, "Sin alertas");
            default: return resultado("ok", "Operando (" + posicion + ") · Velocidad " + velocidad + " %", "Sin alertas" + agua);
        }
    }

    /** REQ-110: valvulas (1..7) y motor (M) con su estado: encendido, pendiente o apagado (logic/panel.js). */
    function valvulas(s, reglas) {
        return Object.keys(s.plots || {}).filter(function (k) { return /^p[0-7]$/.test(k) && s.plots[k]; }).sort()
            .map(function (k) {
                var motor = k === "p7";
                return { clave: k, texto: motor ? "M" : String(parseInt(k.slice(1), 10) + 1), motor: motor, estado: reglas.panel.estadoParcela(s, k) };
            });
    }

    function estacionario(s, reglas) {
        var r = estacionarioSinValvulas(s, reglas);
        r.valvulas = valvulas(s, reglas);
        return r;
    }

    function estacionarioSinValvulas(s, reglas) {
        if (s.status === "OFF") return resultado("inactivo", "Detenido", "Sin alertas");
        var activas = [], pendientes = [];
        Object.keys(s.plots || {}).filter(function (k) { return /^p[0-6]$/.test(k); }).sort().forEach(function (k) {
            var p = s.plots[k] || {};
            var nombre = p.name ? String(p.name) : "Sector " + (parseInt(k.slice(1), 10) + 1);
            var e = reglas.panel.estadoParcela(s, k);
            if (e === "encendido") activas.push(nombre);
            else if (e === "pendiente") pendientes.push(nombre);
        });
        if (pendientes.length) return resultado("atencion", activas.length ? "Regando " + lista(activas) : "En espera", "Esperando confirmación");
        if (activas.length) return resultado("ok", "Regando " + lista(activas), "Sin alertas");
        return resultado("ok", "En espera · Sin riego activo", "Sin alertas");
    }

    function pozo(s) {
        var presion = numero(s.log && s.log.presion);
        if (s.status === "OFF") return resultado("inactivo", "Detenido", "Sin alertas");
        return resultado("ok", "Bombeando" + (presion ? " · " + presion + " psi" : ""), "Sin alertas");
    }

    function sensoresDe(s) {
        return Object.keys(s.sensors || {}).filter(function (k) { return /^S\d+$/.test(k) && s.sensors[k] && s.sensors[k].id; })
            .sort(function (a, b) { return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10); });
    }

    function redDeSensores(s, reglas, opciones) {
        var claves = sensoresDe(s);
        var unidad = s.tempUnit === "C" ? "C" : "F";
        var datos = reglas.humedad.datosCrudos(s);
        var secos = [], estres = [], helada = [], temperaturas = [];
        claves.forEach(function (k) {
            var sensor = s.sensors[k];
            var nombre = sensor.alias || sensor.id;
            var v = reglas.humedad.valoresDeSensor(s, parseInt(k.slice(1), 10), datos);
            if (v.t !== null) {
                temperaturas.push(v.t);
                if (reglas.medidor.escalaTemperatura(v.t, sensor, "C").nivel === "frio") helada.push(nombre);
            }
            if (v.ms !== null) {
                var etiqueta = reglas.medidor.escalaHumedadSuelo(sensor, v.ms).etiqueta;
                if (etiqueta === "Suelo seco" || etiqueta === "Suelo muy seco") secos.push(nombre);
                else if (etiqueta === "Estrés moderado") estres.push(nombre);
            }
        });
        var media = temperaturas.length ? temperaturas.reduce(function (a, b) { return a + b; }, 0) / temperaturas.length : null;
        var linea = claves.length + (claves.length === 1 ? " sensor" : " sensores") + (media !== null ? " · " + temperaturaTexto(media, unidad) : "");
        if (opciones.lecturaVieja) return resultado("atencion", linea, "Sin reportar " + (opciones.antiguedad || "en 24 h"));
        if (helada.length) return resultado("emergencia", linea, enQuien("Helada", helada));
        if (secos.length) return resultado("atencion", linea, enQuien("Suelo seco", secos));
        if (estres.length) return resultado("atencion", linea, "Programar riego");
        if (!claves.length) return resultado("inactivo", "Sin sensores registrados", "Sin sensores");
        return resultado("ok", linea + " · Humedad adecuada", "Sin alertas");
    }

    function nevera(s, reglas, opciones) {
        var claves = sensoresDe(s);
        var unidad = "C";   // las neveras se leen en °C
        var datos = reglas.humedad.datosCrudos(s);
        var fuera = [], valores = [];
        (claves.length ? claves : ["S0"]).forEach(function (k) {
            var sensor = (s.sensors && s.sensors[k]) || {};
            var v = reglas.humedad.valoresDeSensor(s, parseInt(k.slice(1), 10), datos);
            if (v.t === null) return;
            valores.push(v.t);
            var minimo = numero(sensor.t && sensor.t.minValue), maximo = numero(sensor.t && sensor.t.maxValue);
            if ((minimo !== null && v.t < minimo) || (maximo !== null && v.t > maximo)) fuera.push(sensor.alias || sensor.id || k);
        });
        var linea = valores.length ? temperaturaTexto(valores.reduce(function (a, b) { return a + b; }, 0) / valores.length, unidad) : "Sin lectura";
        if (opciones.lecturaVieja) return resultado("atencion", linea, "Sin reportar " + (opciones.antiguedad || "en 24 h"));
        if (fuera.length) return resultado("emergencia", linea, "Temperatura fuera de rango");
        if (!valores.length) return resultado("inactivo", linea, "Sin lectura");
        return resultado("ok", linea + " · Estable", "Sin alertas");
    }

    /** Resumen del equipo. opciones: { lecturaVieja, antiguedad ("hace 2 d") }. */
    function resumenDeEquipo(sistema, reglas, opciones) {
        var s = sistema || {};
        var o = opciones || {};
        var r;
        switch (s.type) {
            case "PC": case "PL": r = pivote(s, reglas); break;
            case "Estacionario": r = estacionario(s, reglas); break;
            case "Pozo": case "Pump": r = pozo(s); break;
            case "Sensor": r = redDeSensores(s, reglas, o); break;
            case "Nevera": case "Invernadero": r = nevera(s, reglas, o); break;
            default: r = resultado("inactivo", "", "Sin datos del equipo");
        }
        var log = s.log || {};
        r.fecha = fechaCorta(s.type === "Sensor" || s.type === "Nevera" || s.type === "Invernadero" ? log.date : (log.update || log.date));
        return r;
    }

    return { COLORES: COLORES, ICONOS: ICONOS, fechaCorta: fechaCorta, resumenDeEquipo: resumenDeEquipo };
}));
