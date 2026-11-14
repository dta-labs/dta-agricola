"use strict";

/**
 * REQ-093 - Graficas del historial de sensores: clima, datos al tocar, zoom e ir a fecha, CSV y PNG.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const g = require("../../assets/js/logic/grafica.js");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

test("REQ-093 fecha del registro del equipo (hora local, am/pm) para pantalla y CSV", () => {
  assert.deepEqual(g.fechaDeRegistro("20261107 0800pm"), { clave: "20261107", iso: "2026-11-07 20:00", texto: "07/11/2026 20:00" });
  assert.equal(g.fechaDeRegistro("20261107 1205am").iso, "2026-11-07 00:05");
  assert.equal(g.fechaDeRegistro("20261107 1230pm").iso, "2026-11-07 12:30");
  assert.equal(g.fechaDeRegistro("20261107").iso, "2026-11-07");
  assert.equal(g.fechaDeRegistro("").clave, "");
});

test("REQ-093 CSV: encabezado con las series, valores redondeados, vacios y campos con comas entre comillas", () => {
  const csv = g.csvDeGrafica(["2026-11-07 20:00", "2026-11-07 21:00"], [
    { nombre: "Temperatura (°C)", valores: [8.456, null] }, { nombre: "Hr, %", valores: [48, NaN] }]);
  assert.equal(csv, 'Fecha,Temperatura (°C),"Hr, %"\r\n2026-11-07 20:00,8.46,48\r\n2026-11-07 21:00,,\r\n');
  assert.equal(g.csvDeGrafica([], []), "Fecha\r\n");
});

test("REQ-093 nombre de archivo sin acentos ni simbolos, con la fecha", () => {
  assert.equal(g.nombreDeArchivo(["Red Ñandú norte", "Sensor 1", "temperatura"], "csv", new Date(2026, 10, 13)), "red-nandu-norte-sensor-1-temperatura-20261113.csv");
  assert.equal(g.nombreDeArchivo([null, ""], "png", new Date(2026, 0, 2)), "grafica-20260102.png");
});

test("REQ-093 ir a fecha: primer punto de ese dia y ventana centrada dentro del periodo", () => {
  const claves = ["20261101", "20261101", "20261103", "20261104"];
  assert.equal(g.indiceDeFecha(claves, "20261102"), 2);
  assert.equal(g.indiceDeFecha(claves, "20261001"), 0);
  assert.equal(g.indiceDeFecha(claves, "20261201"), 3, "posterior a todo: el ultimo");
  assert.equal(g.indiceDeFecha([], "20261101"), -1);
  assert.deepEqual(g.ventanaAlrededor(2, 10, 40), { min: 0, max: 9 });
  assert.deepEqual(g.ventanaAlrededor(20, 10, 40), { min: 15, max: 24 });
  assert.deepEqual(g.ventanaAlrededor(39, 10, 40), { min: 30, max: 39 });
  assert.deepEqual(g.ventanaAlrededor(5, 100, 40), { min: 0, max: 39 });
});

test("REQ-093 el clima historico ya no esta bloqueado por la politica de seguridad", () => {
  const connect = HTML.match(/connect-src([^;]*);/)[1];
  assert.match(connect, /https:\/\/archive-api\.open-meteo\.com/);
  assert.match(CORE, /url: `https:\/\/archive-api\.open-meteo\.com\/v1\/archive\?/);
});

test("REQ-093 graficas: datos al tocar en cualquier punto, zoom con limites y barra de herramientas", () => {
  assert.match(CORE, /interaction: \{ mode: "index", intersect: false \}/);
  assert.match(CORE, /title: items => items\.length \? fechaDelPunto\(items\[0\]\.chart, items\[0\]\.dataIndex\) : ""/);
  assert.match(CORE, /limits: \{ x: \{ min: "original", max: "original", minRange: 3 \} \}/);
  assert.match(CORE, /registrosDeGrafica\.set\(charts\[i\], \{ logs: logs \|\| \[\], tipo: chartType, sensorIndex: i, tipoGrafica: type, opciones: options \}\);/);
  assert.match(CORE, /prepararHerramientasDeGrafica\(canvas\);/);
  ["acercar", "alejar", "restablecer", "datos", "imagen"].forEach(a => assert.match(CORE, new RegExp('data-accion="' + a + '"'), a));
  assert.match(CORE, /<input type="date" data-accion="fecha"/);
  assert.match(CORE, /grafica\.zoomScale\("x", ventana, "default"\);/);
  assert.match(CORE, /new Blob\(\["\\ufeff" \+ g\.csvDeGrafica\(fechas, series\)\]/, "CSV con BOM para Excel");
  assert.match(CORE, /ctx\.fillStyle = "#ffffff";/, "PNG con fondo blanco");
  assert.match(CORE, /La imagen se guardó sin los iconos del clima\./, "alternativa si los iconos impiden exportar");
});

test("REQ-094 sin barra de controles en la ficha de la parcela del mapa (solo zoom manual y clima)", () => {
  const ini = CORE.indexOf("const prepararHerramientasDeGrafica = (canvas) => {");
  const cuerpo = CORE.slice(ini, ini + 900);
  assert.match(cuerpo, /if \(canvas\.closest\("\.leaflet-popup"\)\) \{[\s\S]*?return;\s*\}/);
  assert.match(CORE, /pinch: \{\s*enabled: true\s*\}/, "el zoom manual sigue en todas las graficas");
});

test("REQ-095 la imagen se exporta desde una copia limpia (la grafica en pantalla queda bloqueada por los iconos de otro dominio)", () => {
  const ini = CORE.indexOf("const guardarImagenDeGrafica = (grafica) => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("const irAFechaDeGrafica", ini));
  assert.match(cuerpo, /copia = new Chart\(lienzo, \{ type: datos\.tipoGrafica, data: grafica\.data, options: opciones,/);
  assert.match(cuerpo, /chartWeather: \{ icons: conIconos \? iconos : \[\], cors: true \}/);
  assert.match(cuerpo, /x: Object\.assign\(\{\}, \(datos\.opciones\.scales \|\| \{\}\)\.x, \{ min: grafica\.scales\.x\.min, max: grafica\.scales\.x\.max \}\)/, "misma vista y zoom");
  assert.match(cuerpo, /if \(copia\) copia\.destroy\(\);/);
  assert.doesNotMatch(cuerpo, /grafica\.canvas\.toDataURL|drawImage\(grafica\.canvas/, "nunca desde el lienzo en pantalla");
  assert.match(CORE, /imagen\.crossOrigin = "anonymous";/);
  assert.match(CORE, /if \(options\.cors\) \{/);
});
