"use strict";

/**
 * REQ-088 - Marcador de equipo en el mapa: pin del color del estado, icono del tipo, nombre y borde blanco.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const panel = require("../../assets/js/logic/panel.js");

const RAIZ = path.join(__dirname, "..", "..");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const CSS = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");

// getSystemBackgroundColor de core.js (color de las tarjetas del listado), copiada tal cual.
function colorDelListado(system) {
  let color = "#d3d3d3e0";
  switch (system.type) {
    case "PC": case "PL":
      color = system.status == "OFF" ? "#d3d3d3e0" :
        system.log && (system.log.voltage == "false" || system.log.voltage == false) ? "#ff0000c0" :
        system.log && (system.log.safety == "false" || system.log.safety == false) ? "#db7093c0" :
        system.log && (system.log.commDelay != "-1") ? "#808080e0" :
        system.log && (system.log.status == "OFF") ? "yellow" : "#20b2aab0";
      break;
    case "Estacionario": case "Pump": color = system.status == "OFF" ? "#d3d3d3e0" : "#20b2aab0"; break;
    case "Sensor": color = "#20b2aab0"; break;
    case "Nevera": color = "#204eb2b0"; break;
  }
  return color;
}

const EQUIVALENCIA = { "#d3d3d3e0": "apagado", "#ff0000c0": "falla", "#db7093c0": "seguridad", "#808080e0": "sin-conexion", yellow: "pendiente", "#20b2aab0": "encendido", "#204eb2b0": "nevera" };

test("REQ-088 el estado del pin es el mismo que el color de la tarjeta del listado", () => {
  const ok = { voltage: "true", safety: "true", commDelay: "-1", status: "ON" };
  const casos = [
    { type: "PC", status: "ON", log: ok }, { type: "PL", status: "OFF", log: ok },
    { type: "PC", status: "ON", log: Object.assign({}, ok, { voltage: false }) },
    { type: "PC", status: "ON", log: Object.assign({}, ok, { safety: "false" }) },
    { type: "PC", status: "ON", log: Object.assign({}, ok, { commDelay: "12" }) },
    { type: "PC", status: "ON", log: { voltage: "true", safety: "true" } },
    { type: "PL", status: "ON", log: Object.assign({}, ok, { status: "OFF" }) },
    { type: "PC", status: "ON" },
    { type: "Estacionario", status: "OFF" }, { type: "Estacionario", status: "ON" }, { type: "Pump", status: "ON" },
    { type: "Sensor" }, { type: "Nevera" }
  ];
  casos.forEach(s => assert.equal(panel.estadoDeEquipo(s).estado, EQUIVALENCIA[colorDelListado(s)], JSON.stringify(s)));
});

test("REQ-088 red de sensores sin reportar en mas de 24 h: sin conexion", () => {
  const e = panel.estadoDeEquipo({ type: "Sensor" }, true);
  assert.deepEqual([e.estado, e.texto], ["sin-conexion", "Sin reportar en más de 24 h"]);
});

test("REQ-088 HTML del marcador: icono por tipo, color, nombre escapado y titulo con el estado", () => {
  const html = panel.htmlMarcadorEquipo({ type: "Pozo", name: "Pozo <2>" }, panel.estadoDeEquipo({ type: "Pozo", status: "ON" }));
  assert.match(html, /^<div class="marcador-equipo" style="--estado:#20b2aa" title="Pozo &lt;2&gt; · Funcionando">/);
  assert.match(html, /<i class="fa fa-tint" aria-hidden="true"><\/i>/);
  assert.match(html, /<span class="marcador-equipo-nombre">Pozo &lt;2&gt;<\/span>/);
  const iconos = { PC: "fa-dot-circle-o", PL: "fa-arrows-h", Sensor: "fa-wifi", Estacionario: "fa-th", Nevera: "fa-snowflake-o", Otro: "fa-map-marker" };
  Object.keys(iconos).forEach(t => assert.match(panel.htmlMarcadorEquipo({ type: t }, panel.estadoDeEquipo({ type: t })), new RegExp(iconos[t]), t));
  assert.match(panel.htmlMarcadorEquipo({ type: "PL", status: "ON", log: { status: "OFF", commDelay: "-1" } }, panel.estadoDeEquipo({ type: "PL", status: "ON", log: { status: "OFF", commDelay: "-1" } })),
    /class="marcador-equipo marcador-equipo-claro"/, "sobre amarillo, icono oscuro");
});

test("REQ-088 mapa: pin con borde blanco, nombre que se oculta con zoom lejano, y el color sigue al estado", () => {
  assert.doesNotMatch(CORE, /getMarkerIcon\(""\)/, "ya no se usa el logo de 50 px para los equipos");
  assert.match(CORE, /marker\[campo\.key\] = L\.marker\(coord, \{ icon: crearIconoDeEquipo\(html\) \}\);/);
  assert.match(CORE, /actualizarIconoDeEquipo\(system\);   \/\/ REQ-088/);
  assert.match(CORE, /if \(m\._dtaHtml === html\) return;/, "solo cambia el icono si cambia su aspecto");
  assert.match(CORE, /classList\.toggle\("mapa-sin-nombres", map\.getZoom\(\) < 14\)/);
  assert.match(CSS, /\.marcador-equipo-pin \{[^}]*border: 3px solid #ffffff;/);
  assert.match(CSS, /\.mapa-sin-nombres \.marcador-equipo-nombre \{\s*display: none;/);
});
