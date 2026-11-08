/**
 * Version de la app: fuente unica para la interfaz y la consola.
 *
 * Debe coincidir con `package.json -> version` (lo comprueba test/unit/version.test.js).
 * Mientras no se publica lleva el sufijo "-dev". Al publicar: quitar el sufijo aqui y en
 * package.json, cerrar la entrada en CHANGELOG.md y etiquetar el commit (ver PROMOTE.md).
 *
 * `compilacion`: identifica CADA entrega, tambien las de desarrollo (la version "1.1.0-dev" no cambia
 * hasta publicar). Es el sello ?v= mas reciente de index.html (AA.MM.DD.NNN): la prueba version.test.js
 * falla si se sube el ?v= de cualquier fichero y no este.
 */
(function (raiz) {
    "use strict";

    var VERSION = Object.freeze({
        app: "1.1.0-dev",
        compilacion: "26.11.08.011",
        fecha: "2026-11-08"
    });

    if (typeof module !== "undefined" && module.exports) module.exports = VERSION;
    if (raiz.angular) {
        raiz.angular.module("Administracion").constant("dtaVersion", VERSION);
        if (raiz.console) raiz.console.info("[app] PWA3 v" + VERSION.app + " · compilación " + VERSION.compilacion + " (" + VERSION.fecha + ")");
    }
})(typeof window !== "undefined" ? window : globalThis);
