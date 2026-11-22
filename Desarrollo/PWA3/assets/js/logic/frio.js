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
    function acumulado(logs, dayLogs, sensor, hoy) {
        var inicio = inicioTemporada(hoy);
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
    function acumuladoPorRegistro(registros, sensor) {
        var ordenados = lista(registros).filter(function (r) { return diaDe(r); })
            .slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
        var salida = {};
        var total = null;
        var temporada = null;
        ordenados.forEach(function (r) {
            var t = inicioTemporada(diaDe(r));
            if (t !== temporada) { temporada = t; total = null; }
            var uf = valorUF(r, sensor);
            if (uf !== null) total = (total || 0) + uf;
            salida[r.date] = total === null ? null : Math.round(total * 10) / 10;
        });
        return salida;
    }

    return { inicioTemporada: inicioTemporada, acumulado: acumulado, horaDe: horaDe, acumuladoPorRegistro: acumuladoPorRegistro };
}));
