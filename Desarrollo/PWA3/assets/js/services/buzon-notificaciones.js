/**
 * REQ-101 - Buzon de notificaciones pendientes (IndexedDB), compartido entre el service worker y la app.
 *
 * El service worker deja aqui las notificaciones push que llegan con la app cerrada; la app las recoge al abrirse
 * (y al volver a primer plano) y las pasa a la bandeja del usuario. Funciona en window y en ServiceWorkerGlobalScope.
 * UMD (DTAServicios.buzonNotificaciones / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTAServicios = root.DTAServicios || {};
        root.DTAServicios.buzonNotificaciones = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var BASE = "dta-notificaciones";
    var ALMACEN = "pendientes";

    function abrir(idb) {
        var fabrica = idb || (typeof indexedDB !== "undefined" ? indexedDB : null);
        return new Promise(function (resolver, rechazar) {
            if (!fabrica) return rechazar(new Error("IndexedDB no disponible"));
            var peticion = fabrica.open(BASE, 1);
            peticion.onupgradeneeded = function () {
                var db = peticion.result;
                if (!db.objectStoreNames.contains(ALMACEN)) db.createObjectStore(ALMACEN, { keyPath: "id" });
            };
            peticion.onsuccess = function () { resolver(peticion.result); };
            peticion.onerror = function () { rechazar(peticion.error); };
        });
    }

    /** Guarda una entrada (logic/notificaciones.js) hasta que la app la recoja. */
    function guardar(entrada, idb) {
        return abrir(idb).then(function (db) {
            return new Promise(function (resolver, rechazar) {
                var tx = db.transaction(ALMACEN, "readwrite");
                tx.objectStore(ALMACEN).put(entrada);
                tx.oncomplete = function () { db.close(); resolver(); };
                tx.onerror = function () { db.close(); rechazar(tx.error); };
            });
        });
    }

    /** Devuelve las pendientes y las borra del buzon. */
    function tomar(idb) {
        return abrir(idb).then(function (db) {
            return new Promise(function (resolver, rechazar) {
                var tx = db.transaction(ALMACEN, "readwrite");
                var almacen = tx.objectStore(ALMACEN);
                var lectura = almacen.getAll();
                var entradas = [];
                lectura.onsuccess = function () { entradas = lectura.result || []; almacen.clear(); };
                tx.oncomplete = function () { db.close(); resolver(entradas); };
                tx.onerror = function () { db.close(); rechazar(tx.error); };
            });
        });
    }

    return { guardar: guardar, tomar: tomar };
}));
