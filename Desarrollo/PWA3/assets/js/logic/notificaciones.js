/**
 * REQ-101 - Bandeja de notificaciones (pura: sin DOM, sin Firebase). Se usa en la app y en el service worker.
 *
 * Fuentes: notificaciones push del servidor (functions/index.js: data.alertType = electricidad | seguridad |
 * soil-moisture-threshold | temperature-threshold | disease-risk) y alarmas de helada evaluadas en la app.
 * Cada entrada: { id, tipo, nivel, titulo, mensaje, sistema, fecha (ms), leida }.
 * UMD (navegador y service worker: DTALogic.notificaciones / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.notificaciones = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var MAXIMO = 200;   // entradas guardadas por usuario y dispositivo

    // Iconos de Material Icons (version clasica, la que usa la app).
    var TIPOS = {
        riego: { etiqueta: "Riego", icono: "invert_colors", color: "#1e88e5" },
        temperatura: { etiqueta: "Temperatura", icono: "whatshot", color: "#ef6c00" },
        helada: { etiqueta: "Helada", icono: "ac_unit", color: "#0277bd" },
        plagas: { etiqueta: "Plagas", icono: "bug_report", color: "#6d4c41" },
        electricidad: { etiqueta: "Electricidad", icono: "flash_on", color: "#f9a825" },
        seguridad: { etiqueta: "Seguridad", icono: "security", color: "#ad1457" },
        sinDatos: { etiqueta: "Sin datos", icono: "portable_wifi_off", color: "#757575" },   // REQ-142
        general: { etiqueta: "Aviso", icono: "notifications", color: "#546e7a" }
    };

    var NIVELES = {
        critica: { etiqueta: "Crítica", icono: "error", color: "#c62828", orden: 4 },
        alta: { etiqueta: "Alta", icono: "warning", color: "#ef6c00", orden: 3 },
        media: { etiqueta: "Media", icono: "info", color: "#f9a825", orden: 2 },
        baja: { etiqueta: "Baja", icono: "info_outline", color: "#1e88e5", orden: 1 }
    };

    function textoSinFecha(cuerpo) {
        return String(cuerpo || "").replace(/\s*\n?\s*Fecha:\s*[^\n]*$/i, "").trim();
    }

    function instante(valor, porDefecto) {
        if (valor === undefined || valor === null || valor === "") return porDefecto;
        var n = typeof valor === "number" ? valor : Date.parse(valor);
        return isFinite(n) ? n : porDefecto;
    }

    function tipoYNivel(datos) {
        var alerta = String(datos.alertType || "").toLowerCase();
        if (alerta === "electricidad") return { tipo: "electricidad", nivel: "critica" };
        if (alerta === "seguridad") return { tipo: "seguridad", nivel: "critica" };
        if (alerta === "soil-moisture-threshold") return { tipo: "riego", nivel: "media" };
        if (alerta === "temperature-threshold") return { tipo: "temperatura", nivel: "alta" };
        if (alerta === "disease-risk") {
            var p = Number(datos.probability);
            return { tipo: "plagas", nivel: p >= 70 ? "alta" : p >= 40 ? "media" : "baja" };
        }
        return { tipo: "general", nivel: "media" };
    }

    /** Entrada a partir de una notificacion push de FCM ({ notification, data }). */
    function desdePush(payload, ahora) {
        var p = payload || {};
        var datos = p.data || {};
        var aviso = p.notification || {};
        var tn = tipoYNivel(datos);
        var fecha = instante(datos.occurredAt, ahora || Date.now());
        var mensaje = textoSinFecha(aviso.body || datos.body || "");
        var id = [datos.alertType || "aviso", datos.systemId || "", datos.sensorKey || datos.metricKey || "", datos.disease || "", datos.occurredAt || mensaje].join("|");
        return {
            id: id,
            tipo: tn.tipo,
            nivel: tn.nivel,
            titulo: aviso.title || "DTA-Agricola",
            mensaje: mensaje,
            sistema: datos.systemId || "",
            fecha: fecha,
            leida: false,
            // REQ-156: para el indicador "Riesgo de plagas" del Resumen
            enfermedad: datos.disease || undefined,
            probabilidad: isFinite(Number(datos.probability)) && datos.probability !== "" && datos.probability !== undefined ? Math.round(Number(datos.probability)) : undefined
        };
    }

    /** Entrada para una alarma de helada evaluada en la app (logic/equipos.js -> alarmasDeSensores). */
    function desdeAlarmaDeHelada(alarma, sistema, fechaLog, instanteLog) {
        var s = sistema || {};
        return {
            id: ["helada", s.key || s.name || "", alarma.sensor, fechaLog || ""].join("|"),
            tipo: "helada",
            nivel: "alta",
            titulo: "Riesgo de helada en " + (s.name || "un equipo"),
            mensaje: (alarma.alias || alarma.sensor) + ": " + alarma.tempC + " °C / " + alarma.tempF.toFixed(1) + " °F, por debajo del mínimo",
            sistema: s.key || "",
            fecha: instanteLog || Date.now(),
            leida: false
        };
    }

    /**
     * REQ-142: entrada para un sensor del que el gateway no recibe datos (logic/nevera.js -> sensoresSinRecepcion).
     * El id lleva el instante "desde" redondeado a la frecuencia: mientras siga sin datos es la misma notificacion;
     * si vuelve y se pierde otra vez, es una nueva.
     */
    function desdeSensorSinRecepcion(item, sistema, ahora) {
        var s = sistema || {};
        var paso = (item.frecuencia || 1) * 60000;
        var desde = isFinite(item.desde) && item.desde !== null ? Math.round(item.desde / paso) * paso : null;
        var cuando = desde !== null ? "desde " + fechaLegible(desde, ahora) : "hace " + item.ciclos + " ciclos";
        return {
            id: ["sin-datos", s.key || s.name || "", item.clave, desde !== null ? desde : "?"].join("|"),
            tipo: "sinDatos",
            nivel: "alta",
            titulo: "Sensor sin datos en " + (s.name || "un equipo"),
            mensaje: item.nombre + ": no se actualiza " + cuando + " (" + item.ciclos + (item.ciclos === 1 ? " ciclo" : " ciclos") + " sin recibir)",
            sistema: s.key || "",
            fecha: desde !== null ? desde : (ahora || Date.now()),
            leida: false
        };
    }

    /** Agrega una entrada si no estaba (mismo id). Devuelve { lista, nueva }. Mas reciente primero; maximo MAXIMO. */
    function agregar(lista, entrada) {
        var actual = Array.isArray(lista) ? lista : [];
        if (!entrada || !entrada.id) return { lista: actual, nueva: false };
        if (actual.some(function (e) { return e.id === entrada.id; })) return { lista: actual, nueva: false };
        var nueva = actual.concat([entrada]).sort(function (a, b) { return b.fecha - a.fecha; }).slice(0, MAXIMO);
        return { lista: nueva, nueva: nueva.indexOf(entrada) >= 0 };
    }

    /** { sinLeer, historial } (cada una de la mas reciente a la mas antigua). */
    function separar(lista) {
        var orden = (Array.isArray(lista) ? lista : []).slice().sort(function (a, b) { return b.fecha - a.fecha; });
        return { sinLeer: orden.filter(function (e) { return !e.leida; }), historial: orden.filter(function (e) { return e.leida; }) };
    }

    function marcarLeidas(lista) {
        return (Array.isArray(lista) ? lista : []).map(function (e) {
            return e.leida ? e : Object.assign({}, e, { leida: true });
        });
    }

    function dos(n) { return String(n).padStart(2, "0"); }

    /** "Hoy 14:05", "Ayer 08:30" o "12/11/2026 21:40". */
    function fechaLegible(ms, ahora) {
        var d = new Date(ms), hoy = new Date(ahora || Date.now());
        var hora = dos(d.getHours()) + ":" + dos(d.getMinutes());
        var mismoDia = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
        if (mismoDia(d, hoy)) return "Hoy " + hora;
        var ayer = new Date(hoy.getTime()); ayer.setDate(ayer.getDate() - 1);
        if (mismoDia(d, ayer)) return "Ayer " + hora;
        return dos(d.getDate()) + "/" + dos(d.getMonth() + 1) + "/" + d.getFullYear() + " " + hora;
    }

    return {
        MAXIMO: MAXIMO,
        TIPOS: TIPOS,
        NIVELES: NIVELES,
        textoSinFecha: textoSinFecha,
        desdePush: desdePush,
        desdeAlarmaDeHelada: desdeAlarmaDeHelada,
        desdeSensorSinRecepcion: desdeSensorSinRecepcion,
        agregar: agregar,
        separar: separar,
        marcarLeidas: marcarLeidas,
        fechaLegible: fechaLegible
    };
}));
