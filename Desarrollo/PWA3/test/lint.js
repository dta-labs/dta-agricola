/**
 * Verificacion estatica SIN dependencias (no hace falta npm install).
 *
 * Se ejecuta sobre los ficheros VERSIONADOS (git ls-files), asi que:
 *  - detecta si alguien vuelve a versionar una credencial
 *  - no da falsos positivos con firebaseConfig.js (que esta en .gitignore)
 *
 * Uso:  node test/lint.js [--estricto]
 *   --estricto : los avisos de deuda tambien fallan (para logic/ y services/)
 */
"use strict";

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const RAIZ = join(__dirname, "..");
const ESTRICTO = process.argv.includes("--estricto");

const errores = [];
const avisos = [];
const ok = [];

function error(mensaje) { errores.push(mensaje); }
function aviso(mensaje) { avisos.push(mensaje); }

// ---------- ficheros versionados ----------
let versionados = [];
try {
    const salida = execFileSync("git", ["ls-files"], { cwd: RAIZ, encoding: "utf8" });
    versionados = salida.split(/\r?\n/).filter(Boolean);
} catch (e) {
    error("no se pudo listar git ls-files: " + (e && e.message));
}
const jsVersionados = versionados.filter((f) => f.endsWith(".js"));

// ---------- 1. sintaxis ----------
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const TMP = mkdtempSync(join(tmpdir(), "lint-"));
let conSintaxisOk = 0;

for (const fichero of jsVersionados) {
    const ruta = join(RAIZ, fichero);
    let contenido = "";
    try {
        contenido = readFileSync(ruta, "utf8");
    } catch (e) {
        error("no se pudo leer: " + fichero);
        continue;
    }

    // Un .js que empieza por HTML es una descarga corrupta, no un script.
    if (/^\s*<!DOCTYPE|^\s*<html/i.test(contenido)) {
        error("no es JavaScript (parece HTML): " + fichero);
        continue;
    }

    // ESM: node --check no acepta import/export en un .js suelto; se valida como .mjs.
    const esModulo = /^\s*(import\s|export\s)/m.test(contenido);
    const objetivo = esModulo ? join(TMP, fichero.replace(/[\\/]/g, "_") + ".mjs") : ruta;
    if (esModulo) writeFileSync(objetivo, contenido, "utf8");

    try {
        execFileSync(process.execPath, ["--check", objetivo], { stdio: "pipe" });
        conSintaxisOk += 1;
    } catch (e) {
        const detalle = String((e.stderr || e.stdout || e.message || "")).split(/\r?\n/).slice(0, 3).join(" ");
        error("sintaxis: " + fichero + (esModulo ? " (ESM)" : "") + " -> " + detalle);
    }
}
try { rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* temporal */ }
ok.push("sintaxis: " + conSintaxisOk + "/" + jsVersionados.length + " ficheros JS versionados");

// ---------- 2. secretos (BLOQUEANTE) ----------
const SECRETOS = [
    { nombre: "clave privada PEM", patron: /BEGIN [A-Z ]*PRIVATE KEY/ },
    { nombre: "private_key de cuenta de servicio", patron: /"private_key"\s*:/ },
    { nombre: "API key de Google", patron: /AIza[0-9A-Za-z_\-]{30,}/ },
    { nombre: "token de OpenAI", patron: /sk-[A-Za-z0-9]{20,}/ },
    { nombre: "token de GitHub", patron: /gh[pousr]_[A-Za-z0-9]{30,}/ },
];
let secretos = 0;
for (const fichero of versionados) {
    if (!/\.(js|json|html|htm|txt|md|xml|yml|yaml|env|properties)$/i.test(fichero)) continue;
    let contenido;
    try {
        contenido = readFileSync(join(RAIZ, fichero), "utf8");
    } catch (e) {
        continue;
    }
    for (const regla of SECRETOS) {
        if (regla.patron.test(contenido)) {
            error("secreto versionado (" + regla.nombre + "): " + fichero);
            secretos += 1;
        }
    }
}
if (secretos === 0) ok.push("secretos: ninguno en " + versionados.length + " ficheros versionados");

// ---------- 3. deuda conocida en core.js (aviso) ----------
const RUTA_CORE = "assets/js/core.js";
let core = "";
try {
    core = readFileSync(join(RAIZ, RUTA_CORE), "utf8");
} catch (e) {
    error("no se pudo leer " + RUTA_CORE);
}
if (core) {
    const globales = (core.match(/^ {4}[a-zA-Z_]\w*\s*=\s*(\(|function)/gm) || []).length;
    const parses = (core.match(/JSON\.parse/g) || []).length;
    const mojibake = (core.match(/Ã/g) || []).length;
    aviso("core.js: " + globales + " funciones globales implicitas, " + parses + " JSON.parse, " + mojibake + " caracteres con mojibake");
}

// ---------- 4. deuda en modulos nuevos (BLOQUEANTE con --estricto) ----------
const NUEVOS = ["assets/js/logic", "assets/js/services", "assets/js/app", "assets/js/ui", "assets/js/components"];
let nuevoMal = 0;
for (const fichero of jsVersionados) {
    if (!NUEVOS.some((prefijo) => fichero.startsWith(prefijo))) continue;
    const contenido = readFileSync(join(RAIZ, fichero), "utf8");
    if (/console\.log\(/.test(contenido)) {
        aviso("console.log en modulo nuevo: " + fichero);
        nuevoMal += 1;
    }
    if (/Ã/.test(contenido)) {
        aviso("mojibake en modulo nuevo: " + fichero);
        nuevoMal += 1;
    }
}
if (nuevoMal === 0) ok.push("modulos nuevos: sin console.log y sin mojibake");
else if (ESTRICTO) error("modulos nuevos con " + nuevoMal + " avisos (modo estricto)");

// ---------- resumen ----------
console.log("");
for (const linea of ok) console.log("  OK    " + linea);
for (const linea of avisos) console.log("  AVISO " + linea);
for (const linea of errores) console.log("  ERROR " + linea);
console.log("");
if (errores.length) {
    console.log("  LINT FAIL: " + errores.length + " errores, " + avisos.length + " avisos");
    process.exit(1);
}
console.log("  LINT OK: 0 errores, " + avisos.length + " avisos de deuda conocida");
