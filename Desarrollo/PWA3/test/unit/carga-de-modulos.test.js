"use strict";

/**
 * REQ-052 - Lo que core.js y las plantillas usan debe estar cargado en index.html.
 *
 * Incidencia 2026-11-06: core.js empezo a usar __modulo("humedad") antes de que index.html cargara
 * logic/humedad.js; __modulo lanza un error al iniciar el mapa y la app no arrancaba. Esta prueba lo
 * detecta sin navegador.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8");
const posCore = HTML.indexOf("./assets/js/core.js?v=");

test("cada __modulo(\"x\") de core.js tiene su logic/x.js cargado antes de core.js", () => {
  const usados = [...new Set([...CORE.matchAll(/__modulo\("([a-zA-Z]+)"\)/g)].map(m => m[1]))];
  assert.ok(usados.length > 0);
  usados.forEach(nombre => {
    const pos = HTML.indexOf("./assets/js/logic/" + nombre + ".js?v=");
    assert.ok(pos > 0, "falta <script> de logic/" + nombre + ".js");
    assert.ok(pos < posCore, "logic/" + nombre + ".js debe cargarse antes de core.js");
    assert.ok(fs.existsSync(path.join(RAIZ, "assets", "js", "logic", nombre + ".js")), "no existe logic/" + nombre + ".js");
  });
});

test("cada etiqueta <dta-...> de index.html tiene su componente registrado y cargado", () => {
  const sinComentarios = HTML.replace(/<!--[\s\S]*?-->/g, "");
  const etiquetas = [...new Set([...sinComentarios.matchAll(/<(dta-[a-z-]+)[\s>]/g)].map(m => m[1]))];
  assert.ok(etiquetas.length >= 5);
  const scripts = [...HTML.matchAll(/<script src="(\.\/assets\/js\/components\/[^"?]+)\?v=/g)].map(m => m[1]);
  const registrados = scripts.map(ruta => {
    const codigo = fs.readFileSync(path.join(RAIZ, ruta), "utf8");
    const m = codigo.match(/\.component\("([a-zA-Z]+)"/);
    return m ? m[1] : null;
  });
  etiquetas.forEach(etiqueta => {
    const nombre = etiqueta.replace(/-([a-z])/g, (_, l) => l.toUpperCase());
    assert.ok(registrados.includes(nombre), etiqueta + " no tiene componente cargado (" + nombre + ")");
  });
});

test("cada factory dta* inyectada en un componente esta cargada", () => {
  const scripts = [...HTML.matchAll(/<script src="(\.\/assets\/js\/[^"?]+)\?v=/g)].map(m => m[1]);
  const factories = new Set();
  scripts.forEach(ruta => {
    const codigo = fs.readFileSync(path.join(RAIZ, ruta), "utf8");
    for (const m of codigo.matchAll(/\.(?:factory|constant)\("(dta[A-Za-z]+)"/g)) factories.add(m[1]);
  });
  scripts.filter(r => r.includes("/components/")).forEach(ruta => {
    const codigo = fs.readFileSync(path.join(RAIZ, ruta), "utf8");
    const m = codigo.match(/\.\$inject = \[([^\]]*)\]/);
    if (!m) return;
    m[1].split(",").map(x => x.trim().replace(/"/g, "")).filter(x => x.startsWith("dta")).forEach(dep => {
      assert.ok(factories.has(dep), ruta + " inyecta " + dep + " y no esta cargada");
    });
  });
});
