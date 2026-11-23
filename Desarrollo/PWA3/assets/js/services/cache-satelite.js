/**
 * REQ-157 - Copia local de las imagenes satelitales (NDVI) en Cache Storage.
 *
 * La vista satelital pedia todas las imagenes cada vez. Ahora:
 *   - sin copia: se descarga, se guarda y se muestra;
 *   - con copia: se muestra al instante. Solo cuando el usuario pide ver la imagen (REQ-159: activa Satelite o
 *     Reintentar) se consulta en el catalogo si hay una mas reciente que la descarga y, solo entonces, se vuelve a
 *     pedir (y se cambia en el mapa al llegar). Al mover el mapa no se consulta.
 * Si el navegador no tiene Cache Storage o el servicio no permite leer la imagen (CORS), se usa la URL directa (como
 * antes). Las reglas puras (decision, hayMasReciente, urlFechaReciente) estan en logic/satelite.js.
 * Navegador: window.DTAServicios.cacheSatelite.
 */
(function (raiz) {
    "use strict";

    var CACHE = "dta-satelite-v1";
    var META = "dta-satelite-meta";
    var OLVIDAR_MS = 90 * 86400000;          // copias sin usar en 90 dias se borran

    function reglas() { return raiz.DTALogic && raiz.DTALogic.satelite; }

    function leerMeta() {
        try { return JSON.parse(raiz.localStorage.getItem(META) || "{}") || {}; } catch (e) { return {}; }
    }

    function guardarMeta(meta) {
        try { raiz.localStorage.setItem(META, JSON.stringify(meta)); } catch (e) { /* sin espacio: sin copia */ }
    }

    function descargar(url) {
        return raiz.fetch(url, { mode: "cors", cache: "no-store" }).then(function (r) {
            var tipo = (r.headers && r.headers.get("content-type")) || "";
            if (!r.ok || !/^image\//.test(tipo)) throw new Error("respuesta sin imagen");
            return r;
        });
    }

    function aObjeto(respuesta) {
        return respuesta.blob().then(function (b) { return raiz.URL.createObjectURL(b); });
    }

    /**
     * Fuente para la imagen `url` (objectURL de la copia, o la URL directa si no se puede guardar).
     * urlFecha: consulta del catalogo (logic/satelite.urlFechaReciente). alActualizar(src): llega una imagen mas reciente.
     * pedida: el usuario pidio ver la imagen (solo entonces se consulta si hay una mas reciente).
     */
    function obtener(url, urlFecha, alActualizar, pedida) {
        var sat = reglas();
        if (!raiz.caches || !raiz.fetch || !sat) return Promise.resolve(url);
        var ahora = Date.now();
        return raiz.caches.open(CACHE).then(function (cache) {
            return cache.match(url).then(function (guardada) {
                var meta = leerMeta();
                var m = meta[url];
                var que = guardada ? sat.decision(m, !!pedida) : "descargar";
                if (que !== "descargar") {
                    m.usada = ahora;
                    guardarMeta(meta);
                    if (que === "revisar") revisar(cache, url, urlFecha, alActualizar);
                    return aObjeto(guardada);
                }
                return descargar(url).then(function (r) {
                    return cache.put(url, r.clone()).catch(function () {}).then(function () {
                        var mm = leerMeta();
                        mm[url] = { guardada: ahora, revisada: ahora, usada: ahora };
                        guardarMeta(mm);
                        return aObjeto(r);
                    });
                });
            });
        }).catch(function () { return url; });
    }

    function revisar(cache, url, urlFecha, alActualizar) {
        var sat = reglas();
        var marcar = function () { var meta = leerMeta(); if (meta[url]) { meta[url].revisada = Date.now(); guardarMeta(meta); } };
        if (!urlFecha) { marcar(); return; }
        raiz.fetch(urlFecha, { mode: "cors", cache: "no-store" }).then(function (r) { return r.json(); }).then(function (json) {
            var meta = leerMeta();
            var m = meta[url];
            marcar();
            if (!sat.hayMasReciente(m, sat.fechaDeRespuesta(json))) return;
            return descargar(url).then(function (r) {
                return cache.put(url, r.clone()).then(function () {
                    var mm = leerMeta();
                    mm[url] = { guardada: Date.now(), revisada: Date.now(), usada: Date.now() };
                    guardarMeta(mm);
                    return aObjeto(r);
                });
            }).then(function (src) { if (src && alActualizar) alActualizar(src); });
        }).catch(marcar);
    }

    /** Borra las copias sin usar en 90 dias. */
    function limpiar() {
        if (!raiz.caches) return Promise.resolve();
        var meta = leerMeta();
        var ahora = Date.now();
        var viejas = Object.keys(meta).filter(function (u) { return !(ahora - (meta[u].usada || meta[u].guardada || 0) < OLVIDAR_MS); });
        if (!viejas.length) return Promise.resolve();
        return raiz.caches.open(CACHE).then(function (cache) {
            return Promise.all(viejas.map(function (u) { delete meta[u]; return cache.delete(u); }));
        }).then(function () { guardarMeta(meta); }).catch(function () {});
    }

    var servicio = { obtener: obtener, limpiar: limpiar, CACHE: CACHE };
    raiz.DTAServicios = raiz.DTAServicios || {};
    raiz.DTAServicios.cacheSatelite = servicio;
    if (typeof module !== "undefined" && module.exports) module.exports = servicio;
})(typeof window !== "undefined" ? window : globalThis);
