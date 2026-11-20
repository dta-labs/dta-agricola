"use strict";

/**
 * REQ-100 - Menu del equipo (ficha emergente del marcador): cabecera con el pin, 4 opciones alineadas y "Como llegar".
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const CSS = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");

const cuerpo = (() => {
  const ini = CORE.indexOf("const getMarkerText = (campo) => {");
  return CORE.slice(ini, CORE.indexOf("const setSensorList", ini));
})();

test("REQ-100 cabecera: pin del equipo (estado e icono del tipo), nombre y 'tipo · estado'", () => {
  assert.match(cuerpo, /<span class="ficha-equipo-pin/);
  assert.match(cuerpo, /panel\.estadoDeEquipo\(campo,/);
  assert.match(cuerpo, /<div class="ficha-equipo-titulos"><b>\$\{escaparHtml\(campo\.name \|\| "Equipo"\)\}<\/b><small>\$\{escaparHtml\(tipo\)\} · \$\{escaparHtml\(estado\.texto\)\}<\/small><\/div>/);
  assert.doesNotMatch(cuerpo, /golf_course/);
});

test("REQ-100 cuatro opciones del mismo ancho: Historial, Sensores/Planes, Usuarios y Ajustes (en lugar de Ir)", () => {
  const orden = ['opcion("modalHistorial", "equalizer", "Historial")', 'opcion("modalConfig", "format_list_bulleted"', 'opcion("modalUsuarios", "group", "Usuarios")', 'opcion("modalAdjust", "settings", "Ajustes")']
    .map(x => cuerpo.indexOf(x));
  orden.forEach((p, i) => { assert.ok(p > 0, "opcion " + i); if (i) assert.ok(orden[i - 1] < p, "orden " + i); });
  assert.match(cuerpo, /class="ficha-equipo-opcion modal-trigger" href="#\$\{modal\}"/);
  assert.doesNotMatch(cuerpo, /<b>Ir<\/b>/);
  assert.match(CSS, /\.ficha-equipo-opciones \{[^}]*grid-template-columns: repeat\(4, 1fr\);/);
  assert.match(CSS, /\.ficha-equipo-opcion \.material-icons \{\s*font-size: 24px;/, "iconos del mismo tamaño");
});

test("REQ-100 'Como llegar' a todo el ancho al pie (Google Maps), solo si hay coordenadas", () => {
  assert.match(cuerpo, /<a class="ficha-equipo-ir" href="\$\{rutaUrl\}" target="_blank" rel="noopener">/);
  assert.match(cuerpo, /https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
  assert.match(cuerpo, /Number\.isFinite\(lat\) && Number\.isFinite\(lng\)/);
  assert.match(CSS, /\.ficha-equipo-ir \{[^}]*background: #00897b;/);
});
