"use strict";

/**
 * REQ-157 - Vista satelital (progreso, todas las areas del usuario, copia local que solo se renueva si hay una
 * imagen mas reciente), barra inferior anclada abajo (iPhone) y "Compartir la app" en el pie del menu lateral.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sat = require("../../assets/js/logic/satelite.js");
const geo = require("../../assets/js/logic/geo.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

test("REQ-157 todas las areas del usuario: pivotes (circulo) y parcelas de redes y estacionarios", () => {
  const poligono = "28.60,-106.00,28.61,-106.00,28.61,-106.01";
  const sistemas = {
    p: { type: "PC", latitude: "28.6", longitude: "-106", length: "400" },
    q: { type: "PC", latitude: "0", longitude: "0" },                           // sin ubicacion
    e: { type: "Estacionario", plots: { p0: { poligon: poligono } } },
    r: { type: "Sensor", sensors: { S0: { poligon: poligono } } },
    n: { type: "Nevera" }
  };
  const areas = sat.areasDelUsuario(sistemas, geo.normalizarPoligono, geo.esPoligonoValido, geo.esCoordenadaValida);
  assert.deepEqual(areas.map(a => [a.clave, a.circulo ? "circulo" : "poligono"]), [["p", "circulo"], ["ep0", "poligono"], ["rS0", "poligono"]]);
  assert.deepEqual(areas[0].circulo, { lat: 28.6, lng: -106, radio: 400 });
});

test("REQ-157/159 copia local: descargar sin copia; consultar si hay una mas reciente solo cuando el usuario la pide", () => {
  const ahora = Date.UTC(2026, 10, 22, 12);
  assert.equal(sat.decision(null, true), "descargar");
  assert.equal(sat.decision({ guardada: ahora - 86400000 }, true), "revisar");     // activar Satelite / Reintentar
  assert.equal(sat.decision({ guardada: ahora - 86400000 }, false), "usar");       // al mover el mapa
  assert.equal(sat.hayMasReciente({ guardada: ahora - 86400000 }, ahora - 3600000), true);     // imagen tomada despues
  assert.equal(sat.hayMasReciente({ guardada: ahora - 3600000 }, ahora - 86400000), false);
  assert.equal(sat.fechaDeRespuesta({ features: [{ attributes: { acquisitiondate: 1794000000000 } }] }), 1794000000000);
  assert.equal(sat.fechaDeRespuesta({ error: {} }), null);
  const url = sat.urlFechaReciente(sat.cajaDePuntos([[28.6, -106], [28.61, -106.01]]));
  assert.match(url, /^https:\/\/sentinel\.arcgis\.com\/arcgis\/rest\/services\/Sentinel2\/ImageServer\/query\?/);
  assert.match(url, /outFields=acquisitiondate&orderByFields=acquisitiondate%20DESC&resultRecordCount=1&returnGeometry=false&f=json$/);
});

test("REQ-157 servicio de copia: guarda la descarga y despues la sirve sin volver a pedirla", async () => {
  const almacen = new Map();
  const pedidas = [];
  const meta = {};
  globalThis.DTALogic = { satelite: sat };
  globalThis.localStorage = { getItem: k => meta[k] || null, setItem: (k, v) => { meta[k] = v; } };
  globalThis.caches = { open: async () => ({
    match: async u => almacen.get(u) || null, put: async (u, r) => { almacen.set(u, r); }, delete: async u => almacen.delete(u)
  }) };
  const respuesta = () => ({ ok: true, headers: { get: () => "image/png" }, clone() { return respuesta(); }, blob: async () => "BLOB" });
  globalThis.fetch = async (u) => { pedidas.push(u); return /q\//.test(u) ? { json: async () => ({ features: [] }) } : respuesta(); };
  globalThis.URL.createObjectURL = (b) => "blob:" + b;
  delete require.cache[require.resolve("../../assets/js/services/cache-satelite.js")];
  const cache = require("../../assets/js/services/cache-satelite.js");
  assert.equal(await cache.obtener("https://img/1", "https://q/1"), "blob:BLOB");
  assert.equal(await cache.obtener("https://img/1", "https://q/1"), "blob:BLOB");
  assert.deepEqual(pedidas, ["https://img/1"]);                 // la segunda vez, de la copia y sin consultar (no pedida)
  await cache.obtener("https://img/1", "https://q/1", null, true);   // pedida por el usuario: consulta el catalogo
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(pedidas, ["https://img/1", "https://q/1"]);
  // sin Cache Storage: la URL directa
  delete globalThis.caches;
  assert.equal(await cache.obtener("https://img/2", null), "https://img/2");
});

test("REQ-157 vista satelital: progreso de carga, reintento y CSP para el catalogo", () => {
  const core = leer("assets", "js", "core.js");
  assert.match(core, /Cargando imágenes satelitales ' \+\n\s+hechas \+ ' de ' \+ p\.total/);
  assert.match(core, /class="ndvi-reintentar">Reintentar<\/button>/);
  assert.match(core, /if \(cache\) cache\.obtener\(url, urlFecha, fuente, pedida\)\.then\(fuente, \(\) => fuente\(url\)\);/);
  assert.match(core, /cargarVisibles\(true\);\n\s+alMoverMapaNdvi = \(\) => cargarVisibles\(false\);/);   // REQ-159
  assert.match(core, /imagen\.addEventListener\("load", \(\) => terminar\(true\)\);/);
  const html = leer("index.html");
  assert.match(html.match(/connect-src[^;]*/)[0], /https:\/\/sentinel\.arcgis\.com/);
  assert.match(html, /services\/cache-satelite\.js\?v=/);
  assert.match(leer("assets", "css", "style.css"), /\.mapa-progreso-ndvi \.ndvi-spinner \{/);
});

test("REQ-157 barra inferior de pivote y estacionario anclada abajo (no 100vh: en iPhone quedaba cortada)", () => {
  const css = leer("assets", "js", "components", "sistema", "paneles.css");
  assert.doesNotMatch(css, /100vh - 65px/);
  assert.match(css, /\.panel-pc-estado \{[^}]*top: auto;\n    bottom: 0;/);
  assert.match(css, /\.panel-s-e33 \{[^}]*top: auto !important; bottom: 0 !important;/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test("REQ-157 compartir la app en el pie del menu: solo iconos, QR grande y de alto contraste", () => {
  const c = require("../../assets/js/components/comunes/compartir-app/compartir-app.component.js");
  const e = c.enlaces("https://dta-agricola.web.app");
  assert.equal(e.whatsapp, "https://wa.me/?text=DTA%20-%20Monitoring%20%26%20Control%3A%20https%3A%2F%2Fdta-agricola.web.app");
  assert.match(e.telegram, /^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Fdta-agricola\.web\.app&text=/);
  assert.match(e.correo, /^mailto:\?subject=DTA%20-%20Monitoring%20%26%20Control&body=/);
  assert.match(e.sms, /^sms:\?&body=/);
  const abiertas = [];
  const $window = { open: (...a) => abiertas.push(a), navigator: {}, location: {}, document: null };
  const vm = new c.Controlador($window, fn => fn(), null);
  vm.abrir("whatsapp");
  assert.deepEqual(abiertas[0], [e.whatsapp, "_blank", "noopener"]);
  vm.abrir("correo");
  assert.equal($window.location.href, e.correo);
  assert.equal(vm.puedeCompartir, false);
  vm.abrirQR();
  assert.equal(vm.qrAbierto, true);
  vm.teclaQR({ key: "Escape" });
  assert.equal(vm.qrAbierto, false);
  const plantilla = leer("assets", "js", "components", "comunes", "compartir-app", "compartir-app.html");
  for (const icono of ["fa-whatsapp", "fa-telegram", "fa-envelope", "fa-commenting", "fa-link", "fa-qrcode", "fa-share-alt"]) assert.ok(plantilla.includes(icono), icono);
  assert.match(leer("assets", "js", "components", "comunes", "compartir-app", "compartir-app.css"), /image-rendering: pixelated;/);
  const html = leer("index.html");
  assert.ok(html.indexOf('<li class="menu-compartir"><dta-compartir-app>') < html.indexOf('<li class="menu-version">'));
  assert.ok(!leer("assets", "js", "components", "ayuda", "ayuda.html").includes("Compartir la aplicación"));
});

// ---------- REQ-158: solo las areas que se ven en el mapa ----------

test("REQ-158 solo se piden las imagenes de las areas que se ven (y se agregan al mover el mapa)", () => {
  const cerca = "28.60,-106.00,28.61,-106.00,28.61,-106.01";
  const lejos = "30.60,-108.00,30.61,-108.00,30.61,-108.01";
  const sistemas = {
    p: { type: "PC", latitude: "28.605", longitude: "-106.005", length: "300" },
    a: { type: "Estacionario", plots: { p0: { poligon: cerca }, p1: { poligon: lejos } } },
    b: { type: "Sensor", sensors: { S0: { poligon: lejos } } }
  };
  const areas = sat.areasDelUsuario(sistemas, geo.normalizarPoligono, geo.esPoligonoValido, geo.esCoordenadaValida);
  assert.equal(areas.length, 4);
  const vista = { sur: 28.59, oeste: -106.02, norte: 28.62, este: -105.99 };
  assert.deepEqual(sat.areasEnVista(areas, vista).map(a => a.clave), ["p", "ap0"]);
  assert.deepEqual(sat.areasEnVista(areas, { sur: 30.5, oeste: -108.1, norte: 30.7, este: -107.9 }).map(a => a.clave), ["ap1", "bS0"]);
  assert.equal(sat.MAXIMO_POR_VISTA, 25);
  const core = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
  assert.match(core, /const nuevas = satelite\.areasEnVista\(areas, vista\)\.filter\(a => !pedidas\.has\(a\.clave\)\);/);
  assert.match(core, /map\.on\("moveend", alMoverMapaNdvi\);/);
  assert.match(core, /if \(alMoverMapaNdvi && map\) map\.off\("moveend", alMoverMapaNdvi\);/);
  assert.match(core, /if \(nuevas\.length > satelite\.MAXIMO_POR_VISTA\) \{/);
});
