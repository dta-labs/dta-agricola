"use strict";

/**
 * REQ-124..128 - Historial de los sensores: boton Dia, controles solo en PC, colores, agua disponible y U.Frio.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const HTML = leer("index.html");
const CORE = leer("assets", "js", "core.js");

test("REQ-124 historial: boton Dia tambien en las redes de sensores, con la hora legible en el eje", () => {
  const ini = HTML.indexOf('<div id="modalHistorial"');
  const historial = HTML.slice(ini, HTML.indexOf("</ul>", HTML.indexOf("REQ-124", ini)));
  assert.match(historial, /<button class="btn-small" ng-class="selectedTimeOption == 'DIA' \? 'teal' : 'grey lighten-2'" ng-click="\$event\.stopPropagation\(\); reloadSystemLog\(actualSystem\.key, 'DIA', idx\);"/);
  assert.doesNotMatch(historial, /ng-if="actualSystem\.type == 'Nevera'" ng-class="selectedTimeOption == 'DIA'/);
  assert.equal((CORE.match(/labels\.push\(\$scope\.selectedTimeOption == 'DIA' \? \$scope\.horaDeRegistro\(element\.date\) : date\);/g) || []).length, 4);
  assert.doesNotMatch(CORE, /element\.date\.substr\(9, 14\)\)\);/);
});

test("REQ-125 controles de la grafica solo en la vista de PC (ocultos en celular, tableta y pantallas tactiles)", () => {
  const CSS = leer("assets", "css", "style.css");
  assert.match(CSS, /@media \(max-width: 992px\), \(hover: none\) and \(pointer: coarse\) \{\n    \.grafica-herramientas \{\n        display: none !important;/);
});

const h = require("../../assets/js/logic/historial.js");
const { azul, verde, amarillo, rojo, gris } = h.COLORES;

test("REQ-126 colores: tension (cb) < 10 azul, < 30 verde, < 60 amarillo, 60+ rojo; 0, 240 y sin dato gris", () => {
  const wm = { type: "WM" };
  assert.deepEqual([5, 10, 29.9, 30, 59, 60, 150, 0, 240, "NaN", -99].map(v => h.color(wm, "humedad", v)),
    [azul, verde, verde, amarillo, amarillo, rojo, rojo, gris, gris, gris, gris]);
});

test("REQ-126 colores: humedad (%) por capacidad de campo (umbral No regar) y umbral de riego", () => {
  const s = { type: "SHT4", h: { minValue: "30", maxValue: "70" } };
  assert.deepEqual([75, 70, 50, 30, 29, "NaN"].map(v => h.color(s, "humedad", v)), [azul, azul, verde, verde, rojo, gris]);
  assert.deepEqual(h.limitesDeHumedad({ h: { minValue: "", maxValue: "" } }), { riego: 25, cc: 60 });   // por defecto
  assert.deepEqual(h.limitesDeHumedad({ h: { minValue: "80", maxValue: "20" } }), { riego: 25, cc: 60 }); // incoherentes
});

test("REQ-126 colores: temperatura con los umbrales del sensor o, sin umbrales, 2 y 20 °C", () => {
  assert.deepEqual([1.9, 2, 19.9, 20, 35].map(v => h.color({}, "temperatura", v)), [azul, verde, verde, rojo, rojo]);
  const s = { t: { minValue: "-1", maxValue: "30" } };
  assert.deepEqual([-2, 0, 29, 30].map(v => h.color(s, "temperatura", v)), [azul, verde, verde, rojo]);
});

test("REQ-126 tabla y bandas de la grafica usan los mismos criterios", () => {
  assert.equal((HTML.match(/style="color: \{\{ colorHistorial\(sensor, 'humedad', data\[idx \* 8\]\) \}\};"/g) || []).length, 2);
  assert.match(HTML, /style="color: \{\{ colorHistorial\(sensor, 'temperatura', data\[idx \* 8 \+ 4\]\) \}\};"/);
  assert.match(HTML, /<script src="\.\/assets\/js\/logic\/historial\.js\?v=/);
  assert.match(CORE, /\$scope\.colorHistorial = \(sensor, medida, valor\) => __modulo\("historial"\)\.color\(sensor, medida, valor\);/);
  assert.match(CORE, /drawBand\(ctx, chartArea, yScale, 0, 40, 'rgba\(211, 47, 47, 0\.15\)', 'Seco \(60\+ cb\) - Regar'/);
  assert.match(CORE, /const hum = __modulo\("historial"\)\.limitesDeHumedad/);
  assert.match(CORE, /const tem = __modulo\("historial"\)\.limitesDeTemperatura/);
});

test("REQ-127 agua disponible: la pestaña redibuja la grafica (ng-click entero) y aparece tambien en sensores Ms", () => {
  assert.match(HTML, /<div class="col" ng-click="setChartType\('moisture'\); setChart\(idx, 'myChartH' \+ idx\);" ng-show="sensor\.type == 'SHT4' \|\| sensor\.type == 'WM' \|\| sensor\.type == 'Ms'"/);
  assert.doesNotMatch(HTML, /ng-click="setChartType\('moisture'\)" ng-show=/);
});

test("REQ-127 agua disponible: lecturas invalidas sin dato, eje en cb exacto y tension en la informacion", () => {
  assert.deepEqual([0, 240, 300, -99, "NaN", 45].map(h.cbValido), [null, null, null, null, null, 45]);
  const f = require("../../assets/js/logic/formulas.js");
  [5, 16, 45, 100].forEach(cb => assert.ok(Math.abs(h.cbDeAguaDisponible(f.cbToPercent(cb)) - cb) < 1.5, String(cb)));
  assert.deepEqual([100, 80, 60, 40, 0].map(p => Math.round(h.cbDeAguaDisponible(p))), [0, 10, 30, 60, 240]);
  assert.match(CORE, /let cbValue = __modulo\("historial"\)\.cbValido\(data\[i \* 8\]\);/);
  assert.match(CORE, /callback: value => String\(Math\.round\(__modulo\("historial"\)\.cbDeAguaDisponible\(value\)\)\)/);
  assert.match(CORE, /datosDeGrafica\.datasets\[0\]\.label = 'Agua disponible';/);
  assert.match(CORE, /return `\$\{item\.dataset\.label\}: \$\{Math\.round\(valor\)\} % \(≈ \$\{Math\.round\(cb\)\} cb\)`;/);
});

test("REQ-127 humedad Ms: 8 valores por sensor y valor ya en %", () => {
  assert.match(CORE, /const dataValue = datos\[i \* 8\] != "NaN" && datos\[i \* 8\] !== undefined \? parseFloat\(datos\[i \* 8\]\) : null;/);
  assert.doesNotMatch(CORE, /let dataValue = JSON\.parse\(element\.dataRaw\)\[i\];/);
});

test("REQ-128/129 U.Frio: acumulado solo en la temporada del cultivo, desde su primer dia (con los dias previos de /logs)", () => {
  const f = require("../../assets/js/logic/frio.js");
  const r = (d, uf) => ({ date: d + " 0000am", dataRaw: JSON.stringify([0, 0, 0, 0, 0, 0, uf, 0, 0, 0, 0, 0, 0, 0, uf === "NaN" ? "NaN" : uf * 2, 0]) });
  const nogal = f.temporadaDeCultivo("Nogal", 28.6);   // 1 nov - 28/29 feb
  const regs = [r("20261103", 3), r("20261030", 5), r("20261101", 2), r("20261102", "NaN"), r("20261031", 1)];   // cualquier orden
  assert.deepEqual(f.acumuladoPorRegistro(regs, 0, nogal),
    { "20261101 0000am": 2, "20261102 0000am": 2, "20261103 0000am": 5 });          // 30 y 31 oct: fuera (sin valor)
  // la semana mostrada empieza el 20 nov: se suman los dias previos de la temporada
  const previos = [r("20261101", 10), r("20261110", 5), r("20261031", 99)];
  assert.deepEqual(f.acumuladoPorRegistro([r("20261121", 2), r("20261120", 1)], 0, nogal, previos),
    { "20261101 0000am": 10, "20261110 0000am": 15, "20261120 0000am": 16, "20261121 0000am": 18 });
  // fin de temporada: el 1 de marzo ya no cuenta (nogal); el manzano sigue hasta el 15 de marzo
  assert.deepEqual(f.acumuladoPorRegistro([r("20270228", 4), r("20270301", 4)], 0, nogal), { "20270228 0000am": 4 });
  const manzano = f.temporadaDeCultivo("Manzana", 28.6);
  assert.deepEqual(f.acumuladoPorRegistro([r("20270315", 4), r("20270316", 4)], 0, manzano), { "20270315 0000am": 4 });
  assert.deepEqual(f.acumuladoPorRegistro([r("20261201", "NaN")], 0, nogal), { "20261201 0000am": null });
  assert.match(HTML, /<br> U\.Frío<\/th>/);
  assert.doesNotMatch(HTML, /H\.Frío|U\.Frío acum\./);
  assert.match(HTML, /<th ng-if="mostrarUF\(sensor, idx\)"/);
  assert.match(HTML, /<td ng-if="mostrarUF\(sensor, idx\)"[^>]*><b>\{\{ ufAcumuladaDe\(reg, idx, sensor\) \}\}<\/b><\/td>/);
  assert.match(CORE, /__repo\(\)\.leerLogsPorRango\(\$scope\.actualSystem\.key, "logs", rango\.inicio, primero\)/);
});

test("REQ-129 temporada de frio segun el cultivo (hemisferio norte y sur) y cultivos sin frio", () => {
  const f = require("../../assets/js/logic/frio.js");
  assert.equal(f.temporadaDeCultivo("Maíz", 28), null);
  assert.equal(f.temporadaDeCultivo("Tomate", 28), null);
  assert.equal(f.temporadaDeCultivo("", 28), null);
  assert.equal(f.temporadaDeCultivo("Esperanza", 28), null);                     // "pera" solo como palabra
  assert.deepEqual(["Manzana Golden", "pera", "Cerezo", "Nuez de Castilla"].map(c => f.temporadaDeCultivo(c, 28).texto),
    ["1 nov – 15 mar", "1 nov – 15 mar", "1 nov – 15 mar", "1 nov – 15 mar"]);
  assert.deepEqual(["Nogal", "Nogal pecanero", "Durazno", "Uva", "Arándano", "Higo"].map(c => f.temporadaDeCultivo(c, 28).texto),
    ["1 nov – 28 feb", "1 nov – 28 feb", "1 nov – 28 feb", "1 nov – 28 feb", "1 nov – 28 feb", "1 nov – 28 feb"]);
  assert.equal(f.temporadaDeCultivo("Uva", -33).texto, "1 may – 31 ago");      // hemisferio sur
  const nogal = f.temporadaDeCultivo("Nogal", 28);
  assert.deepEqual(f.rangoDeTemporada("20261122", nogal), { inicio: "20261101", fin: "20270228" });
  assert.deepEqual(f.rangoDeTemporada("20280229", nogal), { inicio: "20271101", fin: "20280229" });   // bisiesto
  assert.equal(f.rangoDeTemporada("20270301", nogal), null);
  assert.equal(f.rangoDeTemporada("20260715", nogal), null);
  // ficha del sensor: fuera de temporada no hay acumulado; dentro, desde el inicio de la temporada del cultivo
  assert.equal(f.acumulado([], [], 0, "20260715", nogal), null);
  assert.match(CORE, /if \(!frio\.rangoDeTemporada\(hoy, temporada\)\) \{ pintar\("Fuera de temporada"\); return; \}/);
  assert.match(CORE, /const uf = frio\.acumulado\(valores\(logs\), valores\(dia\), idx, hoy, temporada\);/);
});

test("REQ-130 clima en el historial: columna junto a la fecha (Semana, Mes, Ciclo) y ultimos dias desde el pronostico", () => {
  const ini = HTML.indexOf('<div id="modalHistorial"');
  const hist = HTML.slice(ini);
  assert.equal((hist.match(/<br> Fecha<\/th>\n\s*<!-- REQ-130[^\n]*\n\s*<th ng-if="selectedTimeOption != 'DIA'"><i class="material-icons" aria-hidden="true" style="font-size: 1\.3em;">wb_sunny<\/i><br> Clima<\/th>/g) || []).length, 2);
  assert.equal((hist.match(/\{\{ reg\.date\.substring\(2, 4\) \}\}<\/td>\n\s*<td ng-if="selectedTimeOption != 'DIA'" class="historial-clima"><img ng-if="climaDe\(reg\)" ng-src="\{\{ climaDe\(reg\)\.iconUrl \}\}"/g) || []).length, 2);
  assert.match(CORE, /\$scope\.climaDe = reg =>/);
  assert.match(CORE, /guardarClimaDelHistorial\(system\.key, weatherByDate\)/);
  assert.match(CORE, /https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=\$\{system\.latitude\}&longitude=\$\{system\.longitude\}&daily=weather_code&past_days=7&forecast_days=1&timezone=auto/);
  assert.doesNotMatch(CORE, /description: `Código meteorológico \$\{resultCodes\[index\]\}`/);
  assert.deepEqual(h.separarDiasRecientes(["20261101", "20261114", "20261115", "20261121"], "20261122", 7),
    { recientes: ["20261121"], antiguos: ["20261101", "20261114", "20261115"] });
  assert.deepEqual([0, 2, 3, 45, 63, 81, 95].map(h.descripcionWmo),
    ["Despejado", "Parcialmente nublado", "Nublado", "Niebla", "Lluvia", "Chubascos", "Tormenta"]);
});

test("REQ-131 tablas del historial con desplazamiento propio y la fecha fija a la izquierda", () => {
  const ini = HTML.indexOf('<div id="modalHistorial"');
  const hist = HTML.slice(ini, HTML.indexOf('<div id="modal', ini + 10));
  assert.equal((hist.match(/<div class="tabla-desplazable">\n\s*<table ng-if="sensor\.type == /g) || []).length, 2);
  assert.equal((hist.match(/<\/table>\n\s*<\/div>/g) || []).length, 2);
  assert.equal((hist.match(/class="historial-fecha"/g) || []).length, 6);
  const CSS = leer("assets", "css", "style.css");
  assert.match(CSS, /\.tabla-desplazable \{\n    width: 100%;\n    max-width: 100%;\n    overflow-x: auto;/);
  assert.match(CSS, /\.tabla-desplazable \.historial-fecha \{\n    position: sticky;\n    left: 0;/);
});
