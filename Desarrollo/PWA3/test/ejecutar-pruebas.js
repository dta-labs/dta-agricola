"use strict";

/**
 * REQ-035 / RNF-PRU-03 - Ejecuta test/unit/*.test.js igual en Node 20 y 22, en Windows y Linux.
 *
 * `node --test test/unit/` acepta un directorio en Node 20 pero no en Node 22, y PowerShell/cmd no
 * expanden comodines: por eso se listan los ficheros aqui.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

// REQ-038: incluye subcarpetas (test/unit/componentes/).
function listar(carpeta) {
    return fs.readdirSync(carpeta, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap(entrada => {
            const ruta = path.join(carpeta, entrada.name);
            if (entrada.isDirectory()) return listar(ruta);
            return entrada.name.endsWith(".test.js") ? [ruta] : [];
        });
}

const ficheros = listar(path.join(__dirname, "unit"));

const extra = process.argv.slice(2);
const resultado = spawnSync(process.execPath, ["--test", ...extra, ...ficheros], { stdio: "inherit" });
process.exit(resultado.status === null ? 1 : resultado.status);
