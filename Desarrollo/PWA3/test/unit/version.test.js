"use strict";

/**
 * Version de la app: una sola fuente (app/version.js) igual a package.json, visible en el menu.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const VERSION = require("../../assets/js/app/version.js");
const PAQUETE = JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8"));
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
const CHANGELOG = fs.readFileSync(path.join(RAIZ, "CHANGELOG.md"), "utf8");

test("la version de la app coincide con package.json", () => {
  assert.equal(VERSION.app, PAQUETE.version);
});

test("la version es semantica (X.Y.Z con sufijo opcional) y tiene fecha", () => {
  assert.match(VERSION.app, /^\d+\.\d+\.\d+(-[0-9a-z.]+)?$/);
  assert.match(VERSION.fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Object.isFrozen(VERSION));
});

test("una version publicada (sin sufijo) tiene su entrada en CHANGELOG.md", () => {
  if (VERSION.app.indexOf("-") >= 0) return;
  assert.ok(CHANGELOG.indexOf("## [" + VERSION.app + "]") >= 0, "falta ## [" + VERSION.app + "] en CHANGELOG.md");
});

test("la version se carga en index.html y se muestra en el menu lateral", () => {
  assert.match(HTML, /\.\/assets\/js\/app\/version\.js\?v=/);
  const ini = HTML.indexOf('<ul id="slide-out"');
  const lateral = HTML.slice(ini, HTML.indexOf("</ul>", ini));
  assert.match(lateral, /<dta-version-app><\/dta-version-app>/);
});

test("la compilacion visible es el sello ?v= mas reciente de index.html (cada entrega cambia el numero)", () => {
  const sellos = [...HTML.matchAll(/\?v=(\d{2}\.\d{2}\.\d{2}\.\d{3})/g)].map(m => m[1]).sort();
  assert.ok(sellos.length > 10);
  assert.equal(VERSION.compilacion, sellos[sellos.length - 1],
    "subiste un ?v= en index.html: pon ese mismo numero en assets/js/app/version.js -> compilacion");
  const [aa, mm, dd] = VERSION.compilacion.split(".");
  assert.equal(VERSION.fecha, "20" + aa + "-" + mm + "-" + dd, "la fecha debe ser la de la compilacion");
});

test("la compilacion se muestra en el menu y en la consola", () => {
  const plantilla = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "comunes", "version-app", "version-app.html"), "utf8");
  assert.match(plantilla, /\{\{ vm\.compilacion \}\}/);
  const fuente = fs.readFileSync(path.join(RAIZ, "assets", "js", "app", "version.js"), "utf8");
  assert.match(fuente, /compilación " \+ VERSION\.compilacion/);
});

test("REQ-058 la version va al fondo del menu lateral, en dos lineas seguidas", () => {
  assert.match(HTML, /<li class="menu-version"><dta-version-app><\/dta-version-app><\/li>/);
  const estilo = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  assert.match(estilo, /#slide-out\.sidenav \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*height: calc\(100% - 50px\) !important;/);
  assert.match(estilo, /#slide-out\.sidenav > li\.menu-version \{[^}]*margin-top: auto;[^}]*line-height: normal;/);
  const plantilla = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "comunes", "version-app", "version-app.html"), "utf8");
  assert.doesNotMatch(plantilla, /<br>/);
});
