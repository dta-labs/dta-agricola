"use strict";

/**
 * REQ-101 - Bandeja de notificaciones: sin avisos al inicio, boton flotante, sin leer e historial, tipo y urgencia.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const n = require("../../assets/js/logic/notificaciones.js");
const buzon = require("../../assets/js/services/buzon-notificaciones.js");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const SW = fs.readFileSync(path.join(RAIZ, "firebase-messaging-sw.js"), "utf8");
const FCM = fs.readFileSync(path.join(RAIZ, "assets", "js", "firebaseMessaging.js"), "utf8");

const push = (alertType, extra = {}) => ({
  notification: { title: "DTA-Agricola", body: "Texto del aviso\nFecha: 13/11/2026 10:00" },
  data: Object.assign({ alertType, systemId: "R1", occurredAt: "2026-11-13T16:00:00Z" }, extra)
});

test("REQ-101 tipo y urgencia de cada notificacion del servidor", () => {
  const casos = [
    ["electricidad", {}, "electricidad", "critica"], ["seguridad", {}, "seguridad", "critica"],
    ["soil-moisture-threshold", {}, "riego", "media"], ["temperature-threshold", {}, "temperatura", "alta"],
    ["disease-risk", { probability: "80" }, "plagas", "alta"], ["disease-risk", { probability: "50" }, "plagas", "media"],
    ["disease-risk", { probability: "10" }, "plagas", "baja"], ["otra-cosa", {}, "general", "media"]
  ];
  for (const [alerta, extra, tipo, nivel] of casos) {
    const e = n.desdePush(push(alerta, extra));
    assert.deepEqual([e.tipo, e.nivel], [tipo, nivel], alerta);
    assert.ok(n.TIPOS[e.tipo].icono && n.NIVELES[e.nivel].icono, "icono de tipo y de urgencia");
  }
  const e = n.desdePush(push("electricidad"));
  assert.equal(e.mensaje, "Texto del aviso", "sin la linea 'Fecha:' (la fecha va aparte)");
  assert.equal(e.fecha, Date.parse("2026-11-13T16:00:00Z"));
  assert.equal(e.leida, false);
});

test("REQ-101 alarma de helada de la app como notificacion", () => {
  const e = n.desdeAlarmaDeHelada({ sensor: "S0", alias: "Nogal", tempC: -1, tempF: 30.2 }, { key: "R1", name: "Red" }, "20261120 0600am", 123);
  assert.deepEqual([e.tipo, e.nivel, e.fecha], ["helada", "alta", 123]);
  assert.match(e.titulo, /Riesgo de helada en Red/);
  assert.match(e.mensaje, /Nogal: -1 °C \/ 30\.2 °F/);
});

test("REQ-101 sin duplicados, mas reciente primero, maximo 200; separar y marcar leidas", () => {
  let lista = [];
  const a = n.desdePush(push("electricidad", { occurredAt: "2026-11-13T10:00:00Z" }));
  const b = n.desdePush(push("seguridad", { occurredAt: "2026-11-13T12:00:00Z" }));
  ({ lista } = n.agregar(lista, a));
  assert.equal(n.agregar(lista, a).nueva, false, "la misma notificacion no se repite (push en primer plano y del buzon)");
  ({ lista } = n.agregar(lista, b));
  assert.deepEqual(lista.map(e => e.tipo), ["seguridad", "electricidad"]);
  lista = n.marcarLeidas(lista);
  const c = n.desdePush(push("disease-risk", { occurredAt: "2026-11-13T13:00:00Z", probability: "90" }));
  ({ lista } = n.agregar(lista, c));
  const s = n.separar(lista);
  assert.deepEqual([s.sinLeer.length, s.historial.length], [1, 2]);
  let muchas = [];
  for (let i = 0; i < 250; i += 1) muchas = n.agregar(muchas, Object.assign({}, a, { id: "x" + i, fecha: i })).lista;
  assert.equal(muchas.length, n.MAXIMO);
});

test("REQ-101 fecha legible: hoy, ayer o fecha completa", () => {
  const ahora = new Date(2026, 10, 20, 15, 0).getTime();
  assert.equal(n.fechaLegible(new Date(2026, 10, 20, 8, 5).getTime(), ahora), "Hoy 08:05");
  assert.equal(n.fechaLegible(new Date(2026, 10, 19, 22, 30).getTime(), ahora), "Ayer 22:30");
  assert.equal(n.fechaLegible(new Date(2026, 10, 2, 9, 7).getTime(), ahora), "02/11/2026 09:07");
});

test("REQ-101 sin avisos emergentes al inicio: las alarmas van a la bandeja y solo suenan si son nuevas", () => {
  const ini = CORE.indexOf("processingAlerts = (locationKey) => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("processingSensors", ini));
  assert.doesNotMatch(cuerpo, /M\.toast/);
  assert.match(cuerpo, /agregarNotificacion\(\s*__modulo\("notificaciones"\)\.desdeAlarmaDeHelada\(/);
  assert.match(cuerpo, /if \(evaluacion\.sonar && nuevas\.length\) activarAlarma\(\);/);
});

test("REQ-101 boton flotante solo con notificaciones nuevas, encima del de acciones, abre la ventana", () => {
  assert.match(HTML, /<a class="btn-floating btn-large boton-notificaciones" ng-show="authUser && bandeja\.sinLeer\.length"\s+ng-click="abrirNotificaciones\(\)"/);
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.btn-floating\.boton-notificaciones \{[^}]*position: fixed;[^}]*bottom: 78px;/);
});

test("REQ-101 ventana: Sin leer e Historial con icono de tipo, fecha y urgencia; preferencias abajo", () => {
  const ini = HTML.indexOf('<div id="modalNotificaciones"');
  const m = HTML.slice(ini, HTML.indexOf("REQ-045", ini));
  const pos = ["> Sin leer", "> Historial", "> Preferencias"].map(x => m.indexOf(x));
  assert.ok(pos[0] > 0 && pos[0] < pos[1] && pos[1] < pos[2]);
  assert.match(m, /ng-repeat="n in bandejaVista\.sinLeer track by n\.id"/);
  assert.match(m, /ng-repeat="n in bandejaVista\.historial \| limitTo: 50 track by n\.id"/);
  assert.match(m, /tiposDeNotificacion\[n\.tipo\]\.icono/);
  assert.match(m, /nivelesDeNotificacion\[n\.nivel\]\.icono/);
  assert.match(m, /fechaDeNotificacion\(n\.fecha\)/);
});

test("REQ-101 se guardan tambien las push con la app abierta y con la app cerrada", () => {
  assert.match(FCM, /window\.dispatchEvent\(new CustomEvent\("dta-notificacion", \{ detail: payload \}\)\);/);
  assert.match(CORE, /window\.addEventListener\("dta-notificacion"/);
  assert.match(SW, /self\.addEventListener\("push", \(event\) => \{/);
  assert.match(SW, /buzonNotificaciones\.guardar\(entrada\)/);
  assert.match(CORE, /buzon\.tomar\(\)\.then\(entradas =>/);
  assert.equal(typeof buzon.guardar, "function");
  assert.equal(typeof buzon.tomar, "function");
});

test("REQ-101 buzon: guardar y tomar (una sola vez) con un IndexedDB simulado", async () => {
  const datos = new Map();
  const fabrica = { open() {
    const peticion = {};
    setTimeout(() => {
      const almacen = {
        put(e) { datos.set(e.id, e); },
        getAll() { const r = {}; setTimeout(() => { r.result = [...datos.values()]; r.onsuccess && r.onsuccess(); }); return r; },
        clear() { datos.clear(); }
      };
      const db = {
        objectStoreNames: { contains: () => true },
        transaction() { const tx = { objectStore: () => almacen }; setTimeout(() => setTimeout(() => tx.oncomplete && tx.oncomplete())); return tx; },
        close() {}
      };
      peticion.result = db;
      peticion.onsuccess && peticion.onsuccess();
    });
    return peticion;
  } };
  await buzon.guardar({ id: "a", fecha: 1 }, fabrica);
  await buzon.guardar({ id: "b", fecha: 2 }, fabrica);
  assert.deepEqual((await buzon.tomar(fabrica)).map(e => e.id), ["a", "b"]);
  assert.deepEqual(await buzon.tomar(fabrica), [], "se borran al tomarlas");
});
