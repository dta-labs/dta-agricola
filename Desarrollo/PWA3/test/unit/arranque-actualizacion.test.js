"use strict";

/**
 * REQ-153 - Arranque y actualizaciones de la PWA:
 *   - index.html desde la red con tiempo maximo (si tarda, la copia guardada): la pantalla de inicio del celular
 *     ya no espera varios segundos a la red; los archivos con ?v= salen de la copia guardada.
 *   - Una sola recarga por actualizacion (antes una por cada aviso: la app se reiniciaba varias veces).
 *   - Neveras/invernaderos sin el hueco de la barra quitada en REQ-152.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

/** Carga el service worker con un entorno falso y devuelve su manejador de fetch. */
function cargarSW({ red, guardadas }) {
  const oyentes = {};
  const guardado = new Map(Object.entries(guardadas || {}));
  const cache = { put: async (req, res) => guardado.set(typeof req === "string" ? req : req.url, res), addAll: async () => {} };
  const contexto = {
    console, URL, setTimeout, clearTimeout, Promise,
    importScripts: () => {},
    firebase: { initializeApp() {}, messaging: () => ({ setBackgroundMessageHandler() {} }) },
    config: {},
    caches: {
      open: async () => cache,
      keys: async () => [],
      match: async (req, opciones) => {
        const url = typeof req === "string" ? req : req.url;
        const clave = opciones && opciones.ignoreSearch ? url.split("?")[0] : url;
        return guardado.get(clave) || null;
      }
    },
    fetch: (req) => red(typeof req === "string" ? req : req.url),
    clients: { matchAll: async () => [], openWindow: async () => null, claim: async () => {} }
  };
  contexto.self = { addEventListener: (tipo, f) => { oyentes[tipo] = f; }, location: { origin: "https://app" }, registration: { scope: "https://app/" }, skipWaiting() {} };
  vm.createContext(contexto);
  vm.runInContext(leer("firebase-messaging-sw.js"), contexto);
  return (url, modo) => new Promise((resolve) => {
    oyentes.fetch({ request: { method: "GET", url, mode: modo || "cors" }, respondWith: resolve });
  });
}

const respuesta = (texto) => ({ ok: true, type: "basic", texto, clone() { return this; } });
const lenta = (ms, r) => new Promise((resolve) => setTimeout(() => resolve(r), ms));

test("REQ-153 abrir la app: si la red tarda, se muestra la copia guardada de index.html", async () => {
  const fetchDe = cargarSW({ red: () => lenta(4000, respuesta("nueva")), guardadas: { "https://app/index.html": respuesta("guardada") } });
  const inicio = Date.now();
  const r = await fetchDe("https://app/index.html?appVersion=1", "navigate");
  assert.equal(r.texto, "guardada");
  assert.ok(Date.now() - inicio < 3500);
});

test("REQ-153 abrir la app: con buena red llega la version publicada", async () => {
  const fetchDe = cargarSW({ red: () => lenta(10, respuesta("nueva")), guardadas: { "https://app/index.html": respuesta("guardada") } });
  assert.equal((await fetchDe("https://app/index.html", "navigate")).texto, "nueva");
});

test("REQ-153 archivos con ?v= desde la copia; sin version, de la red", async () => {
  let pedidas = [];
  const fetchDe = cargarSW({
    red: (url) => { pedidas.push(url); return Promise.resolve(respuesta("red")); },
    guardadas: { "https://app/assets/js/core.js?v=1": respuesta("copia") }
  });
  assert.equal((await fetchDe("https://app/assets/js/core.js?v=1")).texto, "copia");
  assert.deepEqual(pedidas, []);
  assert.equal((await fetchDe("https://app/assets/js/core.js?v=2")).texto, "red");
  assert.equal((await fetchDe("https://app/assets/js/core.js")).texto, "red");   // revision de version: siempre red
  assert.equal((await fetchDe("https://app/index.html")).texto, "red");
});

test("REQ-153 una sola recarga por actualizacion", () => {
  const core = leer("assets", "js", "core.js");
  assert.match(core, /const RECARGA_UNICA_MS = 60 \* 1000;/);
  assert.match(core, /navigator\.serviceWorker\.addEventListener\('controllerchange', \(\) => \{\n  recargarParaActualizar\("service worker", false\);/);
  assert.match(core, /recargarParaActualizar\("archivos", true\);/);
  assert.match(core, /recargarParaActualizar\(event\.data\.version, true\);/);
  assert.match(core, /if \(preguntar && !arrancando\) showAppUpdatePopup\(motivo, recargar\);\n    else recargar\(\);/);
  // fuera del coordinador no queda ninguna recarga por actualizacion
  assert.equal((core.match(/url\.searchParams\.set\('appVersion'/g) || []).length, 1);
});

test("REQ-153 neveras sin el hueco de la barra quitada", () => {
  const css = leer("assets", "js", "components", "sistema", "paneles.css");
  assert.match(css, /\.panel-s-e44 \{ margin-top: 10px !important; \}/);
  assert.match(css, /\.panel-s-e45 \{[^}]*height: calc\(100vh - 82px\) !important;/);
});
