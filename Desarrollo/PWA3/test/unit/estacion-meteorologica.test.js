"use strict";

/**
 * REQ-121 - Estacion meteorologica local por region y estacion (settings.station = { region, id }).
 * REQ-122 - El catalogo se lee de Firebase /stations (respaldo: assets/data/estaciones.json).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const est = require("../../assets/js/logic/estaciones.js");
const CATALOGO = JSON.parse(fs.readFileSync(path.join(RAIZ, "assets", "data", "estaciones.json"), "utf8"));
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

function filaEstacion() {
  const ini = HTML.indexOf('<div id="modalAdjust"');
  const modal = HTML.slice(ini, HTML.indexOf('<div id="modalSuelo"', ini));
  const pos = modal.indexOf('id="ajusteEstacion"');
  if (pos < 0) return null;
  return modal.slice(modal.lastIndexOf("<tr", pos), modal.indexOf("</tr>", pos) + 5);
}

test("REQ-121 catalogo: 29 estaciones { id, name, region } con id unico", () => {
  assert.equal(CATALOGO.length, 29);
  CATALOGO.forEach(e => {
    assert.deepEqual(Object.keys(e).sort(), ["id", "name", "region"]);
    assert.match(e.id, /^_[a-z0-9]{3}$/);
    assert.ok(e.name.trim() === e.name && e.name.length > 0, e.id);
  });
  assert.equal(new Set(CATALOGO.map(e => e.id)).size, 29);
});

test("REQ-121 regiones en el orden del catalogo y estaciones por region", () => {
  assert.deepEqual(est.regiones(CATALOGO), ["BACHINIVA", "CARICHI", "CUAUHTEMOC", "GUERRERO", "CUSIHUIRIACHI", "NAMIQUIPA"]);
  assert.deepEqual(est.deRegion(CATALOGO, "CUSIHUIRIACHI").map(e => e.id), ["_cho", "_lac", "_lmo"]);
  assert.equal(est.buscar(CATALOGO, "_osm").name, "Óscar Soto Maynez");
});

test("REQ-121 normalizar: objeto, texto de REQ-120 y vacio", () => {
  assert.deepEqual(est.normalizar({ region: "NAMIQUIPA", id: "_osm" }, CATALOGO), { region: "NAMIQUIPA", id: "_osm" });
  assert.deepEqual(est.normalizar("_fac", CATALOGO), { region: "NAMIQUIPA", id: "_fac" });
  assert.deepEqual(est.normalizar({ id: "_lju" }, CATALOGO), { region: "GUERRERO", id: "_lju" });
  assert.deepEqual(est.normalizar(undefined, CATALOGO), { region: "", id: "" });
});

test("REQ-121 paraGuardar: solo pares region/estacion del catalogo; si no, null (sin estacion)", () => {
  assert.deepEqual(est.paraGuardar({ region: "NAMIQUIPA", id: "_osm" }, CATALOGO), { region: "NAMIQUIPA", id: "_osm" });
  assert.equal(est.paraGuardar({ region: "GUERRERO", id: "_osm" }, CATALOGO), null);   // region equivocada
  assert.equal(est.paraGuardar({ region: "NAMIQUIPA", id: "" }, CATALOGO), null);
  assert.equal(est.paraGuardar({ region: "X", id: "_mmi" }, CATALOGO), null);         // fuera del catalogo
  assert.equal(est.etiqueta({ region: "NAMIQUIPA", id: "_fac" }, CATALOGO), "FACIATEC (NAMIQUIPA)");
});

test("REQ-121 ajustes: selectores de region y estacion en redes de sensores", () => {
  const fila = filaEstacion() || "";
  assert.ok(fila, "falta la fila id=ajusteEstacion dentro de #modalAdjust");
  assert.match(fila, /<tr ng-show="actualSystem\.type == 'Sensor'">/);
  assert.match(fila, /ng-model="actualSystem\.station\.region"/);
  assert.match(fila, /ng-model="actualSystem\.station\.id"/);
  assert.match(fila, /ng-change="actualSystem\.station\.id = ''"/);   // cambiar de region limpia la estacion
  assert.match(fila, /ng-repeat="r in regionesEstacion\(\)"/);
  assert.match(fila, /ng-repeat="e in estacionesDeRegion\(actualSystem\.station\.region\)"/);
});

test("REQ-121 core.js carga el catalogo y guarda { region, id } o null", () => {
  assert.match(CORE, /fetch\("\.\/assets\/data\/estaciones\.json\?v=/);
  assert.match(CORE, /__repo\(\)\.leerEstaciones\(\)/);
  assert.match(CORE, /settings\.station = __modulo\("estaciones"\)\.paraGuardar\(settings\.station, catalogoEstaciones\);/);
  assert.ok(HTML.indexOf("./assets/js/logic/estaciones.js?v=") > 0, "falta <script> de logic/estaciones.js");
});

const ESPERADO = [
  { id: "_fac", name: "FACIATEC", region: "NAMIQUIPA" },
  { id: "_osm", name: "Óscar Soto Maynez", region: "NAMIQUIPA" },
  { id: "_lju", name: "La Junta", region: "GUERRERO" }
];

test("REQ-122 /stations como lista u objeto de { id, name, region }", () => {
  assert.deepEqual(est.desdeFirebase(ESPERADO), ESPERADO);
  assert.deepEqual(est.desdeFirebase({
    _fac: { name: "FACIATEC", region: "NAMIQUIPA" },
    _osm: { estacion: "Óscar Soto Maynez", region: "NAMIQUIPA" },
    x1: { id: "_lju", nombre: "La Junta", region: "GUERRERO" }
  }), ESPERADO);
});

test("REQ-122 /stations agrupado por region", () => {
  assert.deepEqual(est.desdeFirebase({ NAMIQUIPA: { _fac: "FACIATEC", _osm: "Óscar Soto Maynez" }, GUERRERO: { _lju: "La Junta" } }), ESPERADO);
  assert.deepEqual(est.desdeFirebase({ NAMIQUIPA: { _fac: { estacion: "FACIATEC" }, _osm: { name: "Óscar Soto Maynez" } }, GUERRERO: [{ id: "_lju", name: "La Junta" }] }), ESPERADO);
});

test("REQ-122 /stations vacio o con basura no rompe el catalogo", () => {
  assert.deepEqual(est.desdeFirebase(null), []);
  assert.deepEqual(est.desdeFirebase({ _x: { name: "Sin region" }, otro: "texto" }), []);
  assert.deepEqual(est.desdeFirebase([{ id: "_fac", name: "A", region: "N" }, { id: "_fac", name: "B", region: "N" }]).length, 1);
});

test("REQ-122 el repositorio lee /stations y las reglas permiten leerlo con sesion", () => {
  const REPO = fs.readFileSync(path.join(RAIZ, "assets", "js", "services", "repositorio.js"), "utf8");
  assert.match(REPO, /leerEstaciones: function \(\) \{\s*return metodos\.leer\("stations"\);/);
  const REGLAS = JSON.parse(fs.readFileSync(path.join(RAIZ, "database.rules.json"), "utf8"));
  assert.deepEqual(REGLAS.rules.stations, { ".read": "auth != null", ".write": false });
});
