#!/usr/bin/env node
/**
 * REQ-102 - Publicar PWA3 en Firebase Hosting con comprobaciones (sustituye al antiguo deploy.bat).
 *
 *   npm run publicar:vista-previa   -> canal "pwa3" (URL temporal, 7 dias). Produccion no cambia.
 *   npm run publicar:produccion     -> sitio en vivo (pide escribir PUBLICAR).
 *
 * Antes de desplegar se detiene si:
 *   1. firebase.json no excluye secretos, functions/ o public_old/ (el .bat los publicaba);
 *   2. hay cambios sin guardar en git dentro de PWA3 (lo publicado debe poder identificarse por su commit);
 *   3. `npm run verificar` (lint + pruebas + arranque local) falla.
 */
"use strict";

const { spawnSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const RAIZ = path.join(__dirname, "..");
const EXCLUSIONES_OBLIGATORIAS = ["**/*adminsdk*.json", "server.key", "functions/**", "public_old/**", "_archivo/**"];
const ES_WINDOWS = process.platform === "win32";

/** Exclusiones obligatorias que faltan en la lista `ignore` de firebase.json. */
function exclusionesQueFaltan(firebaseJson) {
    const ignore = (firebaseJson && firebaseJson.hosting && firebaseJson.hosting.ignore) || [];
    return EXCLUSIONES_OBLIGATORIAS.filter((patron) => !ignore.includes(patron));
}

/** Separa `git status --porcelain` en cambios (bloquean) y archivos nuevos sin registrar (solo aviso). */
function clasificarEstadoGit(salida) {
    const lineas = String(salida || "").split(/\r?\n/).filter(Boolean);
    return {
        cambios: lineas.filter((l) => !l.startsWith("??")).map((l) => l.slice(3)),
        nuevos: lineas.filter((l) => l.startsWith("??")).map((l) => l.slice(3))
    };
}

/** Argumentos de firebase para cada modo. */
function argumentosFirebase(modo) {
    if (modo === "vista-previa") return ["hosting:channel:deploy", "pwa3", "--expires", "7d"];
    if (modo === "produccion") return ["deploy", "--only", "hosting"];
    throw new Error("Modo desconocido: " + modo + " (usa vista-previa o produccion)");
}

function leerVersion() {
    const texto = fs.readFileSync(path.join(RAIZ, "assets", "js", "app", "version.js"), "utf8");
    const app = (texto.match(/app:\s*"([^"]+)"/) || [])[1] || "?";
    const compilacion = (texto.match(/compilacion:\s*"([^"]+)"/) || [])[1] || "?";
    return { app, compilacion };
}

function ejecutar(comando, argumentos, opciones) {
    return spawnSync(comando, argumentos, Object.assign({ cwd: RAIZ, encoding: "utf8", shell: ES_WINDOWS }, opciones));
}

function detener(mensaje) {
    console.error("\n✖ " + mensaje + "\n  No se publico nada.\n");
    process.exit(1);
}

function preguntar(texto) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolver) => rl.question(texto, (respuesta) => { rl.close(); resolver(respuesta); }));
}

async function principal() {
    const modo = process.argv[2];
    const argumentos = argumentosFirebase(modo);
    const destino = modo === "produccion" ? "PRODUCCION (sitio en vivo)" : "vista previa (canal pwa3, 7 dias)";
    console.log("\n▶ Publicar PWA3 en " + destino + "\n");

    // 1. Exclusiones de firebase.json
    const faltan = exclusionesQueFaltan(JSON.parse(fs.readFileSync(path.join(RAIZ, "firebase.json"), "utf8")));
    if (faltan.length) detener("firebase.json no excluye: " + faltan.join(", ") + ". Se publicarian secretos o archivos internos.");
    console.log("✔ firebase.json excluye secretos y carpetas internas");

    // 2. Git
    const git = ejecutar("git", ["status", "--porcelain=v1", "-uall", "--", "."]);
    if (git.status !== 0) detener("No se pudo consultar git: " + (git.stderr || "").trim());
    const estado = clasificarEstadoGit(git.stdout);
    if (estado.cambios.length) {
        detener("Hay cambios sin guardar en git (haz commit antes de publicar):\n    " + estado.cambios.join("\n    "));
    }
    if (estado.nuevos.length) {
        console.log("⚠ Archivos nuevos sin registrar en git (se publicaran si no estan excluidos):\n    " + estado.nuevos.join("\n    "));
    }
    const commit = ejecutar("git", ["log", "-1", "--format=%h %s"]).stdout.trim();
    console.log("✔ Sin cambios pendientes. Se publica: " + commit);

    // 3. Verificacion completa
    console.log("\n▶ npm run verificar ...\n");
    const verificar = ejecutar("npm", ["run", "verificar"], { stdio: "inherit" });
    if (verificar.status !== 0) detener("La verificacion fallo (lint, pruebas o arranque local).");
    console.log("\n✔ Verificacion en verde");

    // 4. Confirmacion (solo produccion)
    if (modo === "produccion") {
        const version = leerVersion();
        console.log("\n  Version " + version.app + " · compilacion " + version.compilacion + "\n  Commit  " + commit);
        if (/-dev$/.test(version.app)) {
            console.log("\n⚠ Es una version de DESARROLLO (" + version.app + "). Para una publicacion formal, sigue PROMOTE.md");
            console.log("  (quitar -dev, cerrar el CHANGELOG, etiquetar el commit).");
        }
        const respuesta = await preguntar("\nEsto reemplaza el sitio en vivo. Escribe PUBLICAR para continuar: ");
        if (respuesta.trim() !== "PUBLICAR") detener("Cancelado.");
    }

    // 5. Firebase
    console.log("\n▶ firebase " + argumentos.join(" ") + "\n");
    const firebase = spawn("firebase", argumentos, { cwd: RAIZ, stdio: "inherit", shell: ES_WINDOWS });
    firebase.on("error", (error) => detener("No se pudo ejecutar firebase (¿esta instalado? npm i -g firebase-tools): " + error.message));
    firebase.on("exit", (codigo) => {
        if (codigo !== 0) detener("firebase termino con error (" + codigo + ").");
        console.log("\n✔ Publicado en " + destino + ".\n");
    });
}

if (require.main === module) {
    principal().catch((error) => detener(error.message));
}

module.exports = { exclusionesQueFaltan, clasificarEstadoGit, argumentosFirebase, EXCLUSIONES_OBLIGATORIAS };
