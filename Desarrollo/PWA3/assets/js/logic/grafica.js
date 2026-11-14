/**
 * REQ-093 - Herramientas de las graficas del historial de sensores (puras: sin Chart.js ni DOM).
 * Fechas de los registros, CSV de la grafica, nombre de archivo y navegacion por fecha.
 * UMD (navegador: DTALogic.grafica / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.grafica = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function dos(n) { return String(n).padStart(2, "0"); }

    /**
     * Fecha de un registro del equipo ("AAAAMMDD hhmmam", hora local del equipo) -> { clave, iso, texto }.
     * clave "AAAAMMDD"; iso "AAAA-MM-DD HH:MM" (para el CSV); texto "DD/MM/AAAA HH:MM" (para la pantalla).
     */
    function fechaDeRegistro(fecha) {
        var c = String(fecha || "");
        var anio = c.substring(0, 4), mes = c.substring(4, 6), dia = c.substring(6, 8);
        if (!/^\d{8}/.test(c)) return { clave: "", iso: c, texto: c };
        var hora = parseInt(c.substring(9, 11), 10);
        var minuto = c.substring(11, 13);
        var sufijo = c.substring(13, 15).toLowerCase();
        if (!isFinite(hora) || !/^\d{2}$/.test(minuto)) {
            return { clave: anio + mes + dia, iso: anio + "-" + mes + "-" + dia, texto: dia + "/" + mes + "/" + anio };
        }
        if (sufijo === "pm") hora = (hora % 12) + 12;
        else if (sufijo === "am") hora = hora % 12;
        return {
            clave: anio + mes + dia,
            iso: anio + "-" + mes + "-" + dia + " " + dos(hora) + ":" + minuto,
            texto: dia + "/" + mes + "/" + anio + " " + dos(hora) + ":" + minuto
        };
    }

    function campoCsv(valor) {
        if (valor === null || valor === undefined || (typeof valor === "number" && !isFinite(valor))) return "";
        var texto = String(valor);
        return /[",\n\r]/.test(texto) ? '"' + texto.replace(/"/g, '""') + '"' : texto;
    }

    /** CSV (separador coma, decimal punto): Fecha + una columna por serie. Sin BOM (se anade al descargar). */
    function csvDeGrafica(fechas, series) {
        var lineas = [["Fecha"].concat((series || []).map(function (s) { return s.nombre; })).map(campoCsv).join(",")];
        (fechas || []).forEach(function (fecha, i) {
            var fila = [fecha].concat((series || []).map(function (s) {
                var v = s.valores ? s.valores[i] : null;
                return typeof v === "number" ? Math.round(v * 100) / 100 : v;
            }));
            lineas.push(fila.map(campoCsv).join(","));
        });
        return lineas.join("\r\n") + "\r\n";
    }

    /** Nombre de archivo seguro: "red-norte-sensor-1-temperatura-20261113.csv". */
    function nombreDeArchivo(partes, extension, hoy) {
        var d = hoy || new Date();
        var sello = d.getFullYear() + dos(d.getMonth() + 1) + dos(d.getDate());
        var base = (partes || []).filter(Boolean).map(function (p) {
            return String(p).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        }).filter(Boolean).join("-") || "grafica";
        return base + "-" + sello + "." + extension;
    }

    /** Primer punto cuyo dia es >= `clave` ("AAAAMMDD"); si la fecha es posterior a todas, el ultimo. */
    function indiceDeFecha(claves, clave) {
        if (!claves || !claves.length) return -1;
        for (var i = 0; i < claves.length; i += 1) {
            if (claves[i] && claves[i] >= clave) return i;
        }
        return claves.length - 1;
    }

    /** Ventana de `ancho` puntos centrada en `indice`, dentro de [0, total - 1]. */
    function ventanaAlrededor(indice, ancho, total) {
        var a = Math.max(2, Math.min(ancho, total));
        var min = Math.round(indice - a / 2);
        min = Math.max(0, Math.min(min, total - a));
        return { min: min, max: min + a - 1 };
    }

    return {
        fechaDeRegistro: fechaDeRegistro,
        csvDeGrafica: csvDeGrafica,
        nombreDeArchivo: nombreDeArchivo,
        indiceDeFecha: indiceDeFecha,
        ventanaAlrededor: ventanaAlrededor
    };
}));
