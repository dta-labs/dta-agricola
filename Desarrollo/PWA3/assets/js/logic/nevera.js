/**
 * REQ-133/134 - Tarjeta de un sensor de nevera (puro, UMD: DTALogic.nevera / Node).
 *
 * Datos de la nevera (`log.dataRaw`): 3 valores por sensor [v0, v1, vcc] (S0 = posiciones 0..2).
 * Todos los tipos comparten la tarjeta: valor principal grande, valor secundario pequeño en una segunda columna (si el
 * tipo lo tiene y llega), estado con su tono (colores del listado) e iconos propios del tipo.
 *
 *   Tipo     Principal (posicion)            Secundario (posicion)        Estado
 *   SHT2     Temperatura °C/°F (v1)          Humedad relativa % (v0)      Helado / Adecuado / Caliente (t.min/max; 0 y 3 °C)
 *   Contact  Puerta (v0: 1 abierta, 0 cerr.) -                            Abierta (atencion) / Cerrada (ok)
 *   Irms     Corriente A (v0)                Corriente 2 A (v1)           Encendido (>= 0.2 A) / Apagado
 *   Psi      Presion psi (v0)                Presion 2 psi (v1)           Baja / Normal / Alta (psi.min/max); sin umbrales: Con / Sin presion
 *   Fl       Caudal L/min (v0)               Caudal 2 L/min (v1)          Bajo / Normal / Alto (fl.min/max); sin umbrales: Fluyendo / Sin flujo
 * Tonos: frio (azul), ok (verde), atencion (ambar), alerta (rojo), inactivo (gris).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.nevera = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var VALORES_POR_SENSOR = 3;
    var TEMPERATURA_POR_DEFECTO = { min: 0, max: 3 };
    var CORRIENTE_ENCENDIDO = 0.2;   // A
    var SIN_DATO = { nivel: "sin-dato", texto: "Sin lectura", icono: "help_outline", tono: "inactivo" };

    function numero(valor) {
        if (valor === null || valor === undefined || valor === "" || valor === "NaN" || valor === "NAN") return null;
        var n = Number(String(valor).replace(",", "."));
        return isFinite(n) ? n : null;
    }

    /** { min, max } de unos umbrales (en cualquier orden), o null si faltan o son iguales. */
    function rango(umbrales) {
        var u = umbrales || {};
        var a = numero(u.minValue), b = numero(u.maxValue);
        if (a === null || b === null || a === b) return null;
        return { min: Math.min(a, b), max: Math.max(a, b) };
    }

    function redondear(n, decimales) {
        var f = Math.pow(10, decimales);
        return Math.round(n * f) / f;
    }

    function texto(n, decimales) {
        return n === null ? "--" : redondear(n, decimales).toFixed(decimales);
    }

    function estado(nivel, textoEstado, icono, tono) {
        return { nivel: nivel, texto: textoEstado, icono: icono, tono: tono };
    }

    /** Posicion del sensor ("S3" -> 3) o null. */
    function indiceDe(clave) {
        var m = /^S(\d+)$/.exec(String(clave || ""));
        return m ? parseInt(m[1], 10) : null;
    }

    function enUnidad(celsius, unidad) {
        return unidad === "F" ? celsius * 9 / 5 + 32 : celsius;
    }

    // ---------- por tipo ----------

    function temperatura(s, v0, v1, unidad) {
        var t = v1, hr = v0;
        var limites = rango(s.t);
        var l = limites || TEMPERATURA_POR_DEFECTO;
        var simbolo = unidad === "F" ? "°F" : "°C";
        var e = t === null ? SIN_DATO
            : t < l.min ? estado("helado", "Helado", "ac_unit", "frio")
            : t > l.max ? estado("caliente", "Caliente", "whatshot", "alerta")
            : estado("adecuado", "Adecuado", "check_circle", "ok");
        var lh = rango(s.h);
        var eh = hr === null || !lh ? null : hr < lh.min ? "Seca" : hr > lh.max ? "Alta" : "Adecuada";
        var r = function (c) { return redondear(enUnidad(c, unidad), 1); };
        return {
            estado: e,
            principal: { icono: "device_thermostat", valorTexto: t === null ? "--" : r(t).toFixed(1), unidad: simbolo, etiqueta: "Temperatura" },
            secundario: { icono: "opacity", valorTexto: texto(hr, 0), unidad: "% Hr", etiqueta: eh || "Humedad" },
            rangoTexto: "Rango " + r(l.min) + " a " + r(l.max) + " " + simbolo + (limites ? "" : " (por defecto)")
        };
    }

    function puerta(s, v0) {
        var abierta = v0 === null ? null : v0 >= 0.5;
        return {
            estado: abierta === null ? SIN_DATO
                : abierta ? estado("abierta", "Abierta", "warning", "atencion") : estado("cerrada", "Cerrada", "check_circle", "ok"),
            principal: { icono: "sensor_door", valorTexto: abierta === null ? "--" : abierta ? "Abierta" : "Cerrada", unidad: "", etiqueta: "Puerta", esTexto: true },
            secundario: null,
            rangoTexto: ""
        };
    }

    function corriente(s, v0, v1) {
        var on = v0 === null ? null : v0 >= CORRIENTE_ENCENDIDO;
        return {
            estado: on === null ? SIN_DATO
                : on ? estado("encendido", "Encendido", "power", "ok") : estado("apagado", "Apagado", "power_off", "inactivo"),
            principal: { icono: "flash_on", valorTexto: texto(v0, 1), unidad: "A", etiqueta: "Corriente" },
            secundario: v1 === null ? null : { icono: "flash_on", valorTexto: texto(v1, 1), unidad: "A", etiqueta: "Corriente 2" },
            rangoTexto: ""
        };
    }

    function porUmbrales(v0, v1, umbrales, def) {
        var l = rango(umbrales);
        var e;
        if (v0 === null) e = SIN_DATO;
        else if (l && v0 < l.min) e = estado("bajo", def.bajo, "south", "alerta");
        else if (l && v0 > l.max) e = estado("alto", def.alto, "north", "atencion");
        else if (l) e = estado("normal", "Normal", "check_circle", "ok");
        else e = v0 > def.minimo ? estado("activo", def.activo, "check_circle", "ok") : estado("inactivo", def.inactivo, "remove_circle_outline", "inactivo");
        return {
            estado: e,
            principal: { icono: def.icono, valorTexto: texto(v0, 1), unidad: def.unidad, etiqueta: def.etiqueta },
            secundario: v1 === null ? null : { icono: def.icono, valorTexto: texto(v1, 1), unidad: def.unidad, etiqueta: def.etiqueta + " 2" },
            rangoTexto: l ? "Rango " + l.min + " a " + l.max + " " + def.unidad : ""
        };
    }

    var TIPOS = {
        SHT2: temperatura,
        Contact: puerta,
        Irms: corriente,
        Psi: function (s, v0, v1) {
            return porUmbrales(v0, v1, s.psi, { icono: "speed", unidad: "psi", etiqueta: "Presión", bajo: "Presión baja", alto: "Presión alta", activo: "Con presión", inactivo: "Sin presión", minimo: 0.5 });
        },
        Fl: function (s, v0, v1) {
            return porUmbrales(v0, v1, s.fl, { icono: "waves", unidad: "L/min", etiqueta: "Caudal", bajo: "Caudal bajo", alto: "Caudal alto", activo: "Fluyendo", inactivo: "Sin flujo", minimo: 0 });
        }
    };

    /**
     * Datos para la tarjeta.
     * @param sensor   configuracion del sensor (type, alias, id y umbrales t, h, psi, fl)
     * @param datos    dataRaw de la nevera (arreglo)
     * @param indice   posicion del sensor (S0 = 0)
     * @param unidad   "C" (por defecto) o "F"
     */
    function tarjeta(sensor, datos, indice, unidad) {
        var s = sensor || {};
        var d = Array.isArray(datos) ? datos : [];
        var base = (indice || 0) * VALORES_POR_SENSOR;
        var tipo = TIPOS[s.type] ? s.type : "SHT2";      // sin tipo: el sensor de temperatura y humedad de siempre
        var r = TIPOS[tipo](s, numero(d[base]), numero(d[base + 1]), unidad);
        r.tipo = tipo;
        r.nombre = s.alias || s.id || "Sensor";
        r.voltaje = numero(d[base + 2]);
        return r;
    }

    return { tarjeta: tarjeta, indiceDe: indiceDe, TIPOS: Object.keys(TIPOS) };
}));
