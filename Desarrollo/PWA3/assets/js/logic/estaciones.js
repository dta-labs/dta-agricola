/**
 * REQ-121/122 - Estaciones meteorologicas locales: catalogo (Firebase /stations, respaldo
 * assets/data/estaciones.json) y settings.station.
 * UMD, sin dependencias.
 *
 * settings.station = { region: "NAMIQUIPA", id: "_osm" }
 * El servidor (WS v7) consulta estaciones.php?...&re=<region>&es=<id> para completar HR y temperatura.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.estaciones = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function lista(catalogo) {
        return Array.isArray(catalogo) ? catalogo.filter(function (e) {
            return e && typeof e.id === "string" && typeof e.region === "string";
        }) : [];
    }

    /** Regiones en el orden del catalogo, sin repetir. */
    function regiones(catalogo) {
        var vistas = [];
        lista(catalogo).forEach(function (e) {
            if (vistas.indexOf(e.region) < 0) vistas.push(e.region);
        });
        return vistas;
    }

    /** Estaciones de una region, en el orden del catalogo. */
    function deRegion(catalogo, region) {
        return lista(catalogo).filter(function (e) { return e.region === region; });
    }

    function buscar(catalogo, id) {
        var encontrada = null;
        lista(catalogo).some(function (e) {
            if (e.id === id) { encontrada = e; return true; }
            return false;
        });
        return encontrada;
    }

    /**
     * Valor de settings.station listo para los selectores: siempre { region, id }.
     * Acepta el objeto nuevo y el texto de REQ-120 ("_fac"), cuya region se toma del catalogo.
     */
    function normalizar(valor, catalogo) {
        if (typeof valor === "string") {
            var id = valor.trim();
            var e = buscar(catalogo, id);
            return { region: e ? e.region : "", id: id };
        }
        if (valor && typeof valor === "object") {
            var idObj = typeof valor.id === "string" ? valor.id.trim() : "";
            var region = typeof valor.region === "string" ? valor.region.trim() : "";
            if (!region && idObj) {
                var porId = buscar(catalogo, idObj);
                if (porId) region = porId.region;
            }
            return { region: region, id: idObj };
        }
        return { region: "", id: "" };
    }

    /**
     * Lo que se guarda en Firebase: { region, id } si la estacion existe en esa region del catalogo;
     * null (sin estacion: Firebase elimina la clave) en otro caso.
     */
    function paraGuardar(valor, catalogo) {
        var v = normalizar(valor, catalogo);
        var e = buscar(catalogo, v.id);
        if (!e || e.region !== v.region) return null;
        return { region: e.region, id: e.id };
    }

    /** "FACIATEC (NAMIQUIPA)" o "" */
    function etiqueta(valor, catalogo) {
        var e = buscar(catalogo, normalizar(valor, catalogo).id);
        return e ? e.name + " (" + e.region + ")" : "";
    }

    function texto(v) {
        return typeof v === "string" ? v.trim() : (typeof v === "number" ? String(v) : "");
    }

    function nombreDe(o) {
        return texto(o.name) || texto(o.estacion) || texto(o.nombre);
    }

    function esObjeto(v) {
        return v !== null && typeof v === "object";
    }

    /**
     * REQ-122: convierte el nodo /stations de Firebase en [{ id, name, region }]. Acepta:
     *   - lista u objeto de estaciones: [{ id, name, region }] o { "_osm": { name, region } }
     *     (tambien "estacion"/"nombre" en lugar de "name")
     *   - agrupado por region: { "NAMIQUIPA": { "_osm": "Óscar Soto Maynez" } },
     *     { "NAMIQUIPA": { "_osm": { name } } } o { "NAMIQUIPA": [{ id, name }] }
     * En el agrupado, la region no empieza con "_" y el id de estacion si (como "_osm"), salvo que traiga "id".
     * Descarta entradas sin id o sin region y los id repetidos (gana el primero).
     */
    function desdeFirebase(valor) {
        var salida = [];
        var vistos = {};
        function agregar(id, name, region) {
            id = texto(id); region = texto(region);
            if (!id || !region || vistos[id]) return;
            vistos[id] = true;
            salida.push({ id: id, name: texto(name) || id, region: region });
        }
        if (!esObjeto(valor)) return salida;
        Object.keys(valor).forEach(function (clave) {
            var v = valor[clave];
            if (!esObjeto(v)) return;
            if (texto(v.region) || texto(v.re)) {                    // estacion suelta
                agregar(texto(v.id) || clave, nombreDe(v), texto(v.region) || texto(v.re));
                return;
            }
            if (clave.charAt(0) === "_") return;                   // un id de estacion no es una region
            Object.keys(v).forEach(function (sub) {                  // agrupado por region
                var e = v[sub];
                var esId = sub.charAt(0) === "_";
                if (typeof e === "string") { if (esId) agregar(sub, e, clave); }
                else if (esObjeto(e) && (texto(e.id) || esId)) agregar(texto(e.id) || sub, nombreDe(e), clave);
            });
        });
        return salida;
    }

    return {
        desdeFirebase: desdeFirebase,
        regiones: regiones,
        deRegion: deRegion,
        buscar: buscar,
        normalizar: normalizar,
        paraGuardar: paraGuardar,
        etiqueta: etiqueta
    };
}));
