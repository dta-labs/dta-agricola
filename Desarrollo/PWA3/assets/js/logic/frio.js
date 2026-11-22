/**
 * REQ-123 - Unidades frio acumuladas de un sensor (modelo Utah).
 * UMD, sin dependencias.
 *
 * Fuentes (dataRaw de 8 valores por sensor; el indice 6 son las unidades frio):
 *   - systems/{red}/logs     resumen diario ("AAAAMMDD 0000am"): UF del dia (promedio horario x 24)
 *   - systems/{red}/dayLogs  registros del dia en curso ("AAAAMMDD hhmmam"): UF por hora del momento
 * Acumulado = suma de los resumenes diarios desde el inicio de la temporada + lo que va del dia.
 * Los dias que todavia estan solo en dayLogs (sin resumen) se estiman con el promedio de sus registros.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.frio = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var INDICE_UF = 6;
    var VALORES_POR_SENSOR = 8;
    var MES_INICIO = 11;    // la temporada de frio se acumula desde el 1 de noviembre
    var DIA_INICIO = 1;

    function dos(n) { return (n < 10 ? "0" : "") + n; }

    /** "AAAAMMDD" del 1 de noviembre de la temporada en curso para el dia hoy ("AAAAMMDD"). */
    function inicioTemporada(hoy) {
        var anio = parseInt(String(hoy).substr(0, 4), 10);
        var mes = parseInt(String(hoy).substr(4, 2), 10);
        if (mes < MES_INICIO) anio -= 1;
        return anio + dos(MES_INICIO) + dos(DIA_INICIO);
    }

    // ---------- REQ-129: temporada de frio segun el cultivo ----------
    // El frio solo cuenta durante el reposo invernal (de la caida de la hoja a la salida del reposo). Fechas
    // orientativas para el hemisferio norte (Mexico); en el sur se desplazan 6 meses. Los cultivos que no estan en la
    // lista (hortalizas, granos, citricos...) no necesitan frio: no se muestran unidades frio.
    //   Alto requerimiento (manzano, peral, membrillo, cerezo, nogal de Castilla): 1 nov - 15 mar
    //   Medio o bajo (durazno, nectarina, ciruelo, chabacano, almendro, nogal pecanero, pistache, vid, kiwi,
    //   arandano, frambuesa, zarzamora, higuera, olivo, granado, caqui): 1 nov - 28/29 feb
    var ALTO = { inicio: [11, 1], fin: [3, 15] };
    var MEDIO = { inicio: [11, 1], fin: [2, 29] };
    var CULTIVOS_CON_FRIO = [
        { patron: /\b(nogal|nuez) de castilla\b|\bjuglans\b/, nombre: "Nogal de Castilla", fechas: ALTO },
        { patron: /\bmanzan/, nombre: "Manzano", fechas: ALTO },
        { patron: /\bperal\b|\bperas?\b/, nombre: "Peral", fechas: ALTO },
        { patron: /\bmembrill/, nombre: "Membrillo", fechas: ALTO },
        { patron: /\bcerez|\bguind/, nombre: "Cerezo", fechas: ALTO },
        { patron: /\bdurazn|\bmelocot|\bnectar/, nombre: "Durazno", fechas: MEDIO },
        { patron: /\bciruel/, nombre: "Ciruelo", fechas: MEDIO },
        { patron: /\bchabacan|\balbaricoq|\bdamasc/, nombre: "Chabacano", fechas: MEDIO },
        { patron: /\balmendr/, nombre: "Almendro", fechas: MEDIO },
        { patron: /\bnogal|\bnuez|\bpecan/, nombre: "Nogal pecanero", fechas: MEDIO },
        { patron: /\bpistach/, nombre: "Pistache", fechas: MEDIO },
        { patron: /\bvid\b|\buvas?\b|\bvinedo|\bvitis\b/, nombre: "Vid", fechas: MEDIO },
        { patron: /\bkiwi/, nombre: "Kiwi", fechas: MEDIO },
        { patron: /\barandan|\bblueberr/, nombre: "Arándano", fechas: MEDIO },
        { patron: /\bframbues/, nombre: "Frambuesa", fechas: MEDIO },
        { patron: /\bzarzamor/, nombre: "Zarzamora", fechas: MEDIO },
        { patron: /\bhig(o|os|uera)\b/, nombre: "Higuera", fechas: MEDIO },
        { patron: /\boliv|\baceitun/, nombre: "Olivo", fechas: MEDIO },
        { patron: /\bgranad(o|a)\b/, nombre: "Granado", fechas: MEDIO },
        { patron: /\bcaqui|\bkaki|\bpersimon/, nombre: "Caqui", fechas: MEDIO }
    ];
    var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    function normalizar(texto) {
        return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }

    function sumarMeses(md, meses) {
        return [((md[0] - 1 + meses) % 12) + 1, md[1]];
    }

    /**
     * Temporada de frio del cultivo, o null si el cultivo no necesita frio (o no hay cultivo).
     * @return { cultivo, inicio: [mes, dia], fin: [mes, dia], texto: "1 nov – 15 mar" }
     */
    function temporadaDeCultivo(cultivo, latitud) {
        var t = normalizar(cultivo);
        if (!t) return null;
        var item = CULTIVOS_CON_FRIO.filter(function (c) { return c.patron.test(t); })[0];
        if (!item) return null;
        var sur = Number(latitud) < 0;
        var inicio = sur ? sumarMeses(item.fechas.inicio, 6) : item.fechas.inicio.slice();
        var fin = sur ? sumarMeses(item.fechas.fin, 6) : item.fechas.fin.slice();
        if (sur && fin[0] === 8 && fin[1] === 29) fin = [8, 31];
        var etiqueta = function (md) { return md[1] + " " + MESES[md[0] - 1]; };
        return { cultivo: item.nombre, inicio: inicio, fin: fin, texto: etiqueta(inicio) + " – " + (fin[0] === 2 && fin[1] === 29 ? "28 feb" : etiqueta(fin)) };
    }

    function finDeMes(anio, mes, dia) {
        var ultimo = new Date(anio, mes, 0).getDate();   // 28/29 feb
        return Math.min(dia, ultimo);
    }

    /** Rango { inicio, fin } ("AAAAMMDD") de la temporada que contiene el dia, o null si el dia esta fuera. */
    function rangoDeTemporada(dia, temporada) {
        if (!temporada || !/^\d{8}/.test(String(dia))) return null;
        var anio = parseInt(String(dia).substr(0, 4), 10);
        var md = parseInt(String(dia).substr(4, 4), 10);
        var ini = temporada.inicio[0] * 100 + temporada.inicio[1];
        var fin = temporada.fin[0] * 100 + temporada.fin[1];
        var cruza = ini > fin;                                   // nov -> mar: cruza el año
        var anioInicio = cruza && md < ini ? anio - 1 : anio;
        var anioFin = cruza ? anioInicio + 1 : anioInicio;
        var desde = anioInicio + dos(temporada.inicio[0]) + dos(temporada.inicio[1]);
        var hasta = anioFin + dos(temporada.fin[0]) + dos(finDeMes(anioFin, temporada.fin[0], temporada.fin[1]));
        var d = String(dia).substr(0, 8);
        return d >= desde && d <= hasta ? { inicio: desde, fin: hasta } : null;
    }

    function valorUF(registro, sensor) {
        if (!registro || typeof registro.dataRaw !== "string") return null;
        var datos;
        try { datos = JSON.parse(registro.dataRaw); } catch (e) { return null; }
        if (!Array.isArray(datos)) return null;
        var v = datos[sensor * VALORES_POR_SENSOR + INDICE_UF];
        if (v === null || v === undefined || v === "" || v === "NaN" || v === "NAN") return null;
        var n = parseFloat(v);
        return isFinite(n) ? n : null;
    }

    function diaDe(registro) {
        var d = registro && typeof registro.date === "string" ? registro.date.substr(0, 8) : "";
        return /^\d{8}$/.test(d) ? d : null;
    }

    /** Hora decimal de "AAAAMMDD hhmmam/pm" (p. ej. "20261120 0230pm" -> 14.5), o null. */
    function horaDe(registro) {
        var m = /^\d{8} (\d{2})(\d{2})(am|pm)$/i.exec(registro && registro.date || "");
        if (!m) return null;
        var h = parseInt(m[1], 10) % 12 + (m[3].toLowerCase() === "pm" ? 12 : 0);
        return h + parseInt(m[2], 10) / 60;
    }

    function lista(valor) {
        if (Array.isArray(valor)) return valor;
        return valor && typeof valor === "object" ? Object.keys(valor).map(function (k) { return valor[k]; }) : [];
    }

    /**
     * Unidades frio acumuladas del sensor desde el inicio de la temporada hasta hoy, o null si no hay datos.
     * @param logs      registros de /logs (lista u objeto de Firebase)
     * @param dayLogs   registros de /dayLogs (lista u objeto)
     * @param sensor    indice del sensor (S0 = 0)
     * @param hoy       "AAAAMMDD" (dia local del sistema)
     */
    function acumulado(logs, dayLogs, sensor, hoy, temporada) {
        // REQ-129: con temporada del cultivo, solo dentro de ella (fuera: null); sin ella, desde el 1 de noviembre.
        var rango = temporada ? rangoDeTemporada(hoy, temporada) : null;
        if (temporada && !rango) return null;
        var inicio = rango ? rango.inicio : inicioTemporada(hoy);
        var total = 0;
        var hayDatos = false;
        var diasConResumen = {};

        lista(logs).forEach(function (r) {
            var dia = diaDe(r);
            if (!dia || dia < inicio || dia >= hoy || diasConResumen[dia]) return;
            var uf = valorUF(r, sensor);
            if (uf === null) return;
            diasConResumen[dia] = true;
            total += uf;
            hayDatos = true;
        });

        // Dias solo en dayLogs (hoy y, si aun no se cerro, el anterior): promedio horario x horas del dia
        var porDia = {};
        lista(dayLogs).forEach(function (r) {
            var dia = diaDe(r);
            if (!dia || dia < inicio || dia > hoy || diasConResumen[dia]) return;
            var uf = valorUF(r, sensor);
            if (uf === null) return;
            var d = porDia[dia] || (porDia[dia] = { suma: 0, n: 0, ultimaHora: 0 });
            d.suma += uf;
            d.n++;
            var h = horaDe(r);
            if (h !== null && h > d.ultimaHora) d.ultimaHora = h;
        });
        Object.keys(porDia).forEach(function (dia) {
            var d = porDia[dia];
            var horas = dia < hoy ? 24 : d.ultimaHora;
            total += d.suma / d.n * horas;
            hayDatos = true;
        });

        return hayDatos ? Math.round(total * 10) / 10 : null;
    }

    /**
     * REQ-128 - Unidades frio ACUMULADAS de cada registro diario del historial (los resumenes de /logs traen las UF
     * de cada dia: se mostraban sueltas). Se suman del dia mas antiguo mostrado al mas reciente y vuelven a 0 al
     * empezar una temporada (1 de noviembre). Registros sin dato no suman y quedan con el acumulado hasta ese dia.
     * @param registros  registros diarios (cualquier orden), con { date: "AAAAMMDD ...", dataRaw }
     * @param sensor     indice del sensor (S0 = 0)
     * @return objeto { "AAAAMMDD ...": acumulado (1 decimal) | null si aun no hay datos }
     */
    function acumuladoPorRegistro(registros, sensor, temporada, previos) {
        // REQ-129: solo dentro de la temporada del cultivo (los dias fuera quedan sin valor: undefined) y sumando
        // tambien los dias de la temporada anteriores a los mostrados (`previos`, de /logs desde su inicio).
        var porFecha = {};
        lista(previos).concat(lista(registros)).forEach(function (r) { if (diaDe(r)) porFecha[r.date] = r; });
        var ordenados = Object.keys(porFecha).sort().map(function (k) { return porFecha[k]; });
        var salida = {};
        var total = null;
        var actual = null;
        ordenados.forEach(function (r) {
            var rango = temporada ? rangoDeTemporada(diaDe(r), temporada) : { inicio: inicioTemporada(diaDe(r)) };
            if (!rango) return;
            if (rango.inicio !== actual) { actual = rango.inicio; total = null; }
            var uf = valorUF(r, sensor);
            if (uf !== null) total = (total || 0) + uf;
            salida[r.date] = total === null ? null : Math.round(total * 10) / 10;
        });
        return salida;
    }

    return {
        inicioTemporada: inicioTemporada, acumulado: acumulado, horaDe: horaDe, acumuladoPorRegistro: acumuladoPorRegistro,
        temporadaDeCultivo: temporadaDeCultivo, rangoDeTemporada: rangoDeTemporada
    };
}));
