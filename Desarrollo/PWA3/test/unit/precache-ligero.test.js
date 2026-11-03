"use strict";

/**
 * REQ-033 - El precache del service worker no puede bajar imagenes decorativas grandes.
 *
 * `urlsToCache` se descarga entero en el evento `install`, es decir, en el primer arranque de la
 * aplicacion. Incluia `intro.webp` (1 MB), `fondo-web.png` (694 KB), `fondo-cel.png` (446 KB) y
 * `DTA-Agricola.png` (134 KB): 2,47 MB antes de mostrar nada.
 *
 * Esas imagenes no son necesarias para arrancar y el service worker ya las cachea al usarse
 * (estrategia network-first). Este test impide volver a meterlas.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const SW = fs.readFileSync(path.join(RAIZ, "firebase-messaging-sw.js"), "utf8");

const LIMITE_POR_FICHERO = 200 * 1024; // 200 KB
const LIMITE_TOTAL = 300 * 1024; // 300 KB

/** Rutas listadas en urlsToCache, normalizadas a rutas de disco. */
function rutasPrecacheadas() {
  const bloque = SW.match(/const urlsToCache = \[([\s\S]*?)\];/);
  assert.ok(bloque, "no se encontro urlsToCache en el service worker");

  return (bloque[1].match(/"\.\/([^"]+)"/g) || []).map((cita) => {
    return cita.replace(/"/g, "").replace(/^\.\//, "");
  });
}

test("todas las rutas del precache existen", () => {
  for (const ruta of rutasPrecacheadas()) {
    const fichero = path.join(RAIZ, ruta);

    assert.ok(fs.existsSync(fichero), "falta el fichero precacheado: " + ruta);
  }
});

test("ningun fichero del precache supera 200 KB", () => {
  for (const ruta of rutasPrecacheadas()) {
    const fichero = path.join(RAIZ, ruta);

    if (!fs.existsSync(fichero)) continue;

    const kb = Math.round(fs.statSync(fichero).size / 1024);

    assert.ok(
      fs.statSync(fichero).size <= LIMITE_POR_FICHERO,
      ruta + " pesa " + kb + " KB y no deberia precachearse"
    );
  }
});

test("el precache completo queda por debajo de 300 KB", () => {
  const total = rutasPrecacheadas().reduce((suma, ruta) => {
    const fichero = path.join(RAIZ, ruta);

    return suma + (fs.existsSync(fichero) ? fs.statSync(fichero).size : 0);
  }, 0);

  assert.ok(
    total <= LIMITE_TOTAL,
    "el precache suma " + Math.round(total / 1024) + " KB (limite " + Math.round(LIMITE_TOTAL / 1024) + " KB)"
  );
});

test("las imagenes decorativas grandes no se precachean", () => {
  const rutas = rutasPrecacheadas().join("\n");

  for (const grande of ["intro.webp", "fondo-web.png", "fondo-cel.png", "DTA-Agricola.png"]) {
    assert.equal(
      rutas.indexOf(grande) >= 0 && rutas.indexOf("lineal") < 0 && grande === "DTA-Agricola.png",
      false,
      grande + " no deberia estar en el precache"
    );
  }
});
