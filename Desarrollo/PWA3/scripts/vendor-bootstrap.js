"use strict";

/**
 * REQ-043 fase B - Prepara Bootstrap para la app (sin CDN, RNF-COM-03).
 *
 *   npm i -D bootstrap@5.3 sass      (una vez)
 *   npm run vendor:bootstrap         (cada vez que cambie el tema o la version)
 *
 * Genera en assets/vendor/bootstrap/ (se versiona en git; el despliegue no compila nada):
 *   - bootstrap-dta.css        Bootstrap aislado en `.bs` con el tema de DTA
 *   - bootstrap.bundle.min.js  JavaScript de Bootstrap (incluye Popper; sin jQuery)
 *   - version.json             version de Bootstrap usada
 */
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const DESTINO = path.join(RAIZ, "assets", "vendor", "bootstrap");
const ENTRADA = path.join(RAIZ, "assets", "scss", "bootstrap-dta.scss");

function requerir(nombre) {
    try {
        return require(nombre);
    } catch (error) {
        console.error("Falta el paquete '" + nombre + "'. Ejecuta primero: npm i -D bootstrap@5.3 sass");
        process.exit(1);
    }
}

const sass = requerir("sass");
const paqueteBootstrap = requerir("bootstrap/package.json");

fs.mkdirSync(DESTINO, { recursive: true });

// Bootstrap 5.3 usa @import: las versiones nuevas de Sass avisan de que esta obsoleto. Se silencian
// solo esos avisos de dependencias; un error real sigue parando el proceso.
const opciones = {
    loadPaths: [path.join(RAIZ, "node_modules"), path.join(RAIZ, "assets", "scss")],
    style: "compressed",
    quietDeps: true,
    silenceDeprecations: ["import", "global-builtin", "color-functions", "mixed-decls"]
};

let resultado;
try {
    resultado = sass.compile(ENTRADA, opciones);
} catch (error) {
    if (/silenceDeprecations|deprecation/i.test(String(error && error.message))) {
        delete opciones.silenceDeprecations;
        resultado = sass.compile(ENTRADA, opciones);
    } else {
        throw error;
    }
}

const cabecera = "/* Bootstrap " + paqueteBootstrap.version + " aislado en .bs - generado por scripts/vendor-bootstrap.js (REQ-043). No editar a mano. */\n";
// Sass antepone un BOM cuando hay caracteres no ASCII; detras de la cabecera invalidaria la primera
// regla (:root con las variables --bs-*). Se quita siempre.
const css = resultado.css.replace(/\uFEFF/g, "");
fs.writeFileSync(path.join(DESTINO, "bootstrap-dta.css"), cabecera + css + "\n");

const bundle = require.resolve("bootstrap/dist/js/bootstrap.bundle.min.js");
fs.copyFileSync(bundle, path.join(DESTINO, "bootstrap.bundle.min.js"));
fs.writeFileSync(path.join(DESTINO, "version.json"), JSON.stringify({ bootstrap: paqueteBootstrap.version }, null, 2) + "\n");

const kb = archivo => (fs.statSync(path.join(DESTINO, archivo)).size / 1024).toFixed(1) + " KB";
console.log("[bootstrap] " + paqueteBootstrap.version + " listo en assets/vendor/bootstrap/");
console.log("  bootstrap-dta.css        " + kb("bootstrap-dta.css"));
console.log("  bootstrap.bundle.min.js  " + kb("bootstrap.bundle.min.js"));
