"use strict";

/**
 * REQ-047 - Tema comun para lo que sigue en Materialize (botones, modales, campos, ventanas).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
const CSS = fs.readFileSync(path.join(RAIZ, "assets", "css", "tema.css"), "utf8");

function reglas() {
  const sinComentarios = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...sinComentarios.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m => ({ selectores: m[1].trim(), cuerpo: m[2] }));
}

test("REQ-047 tema.css se carga el ultimo de los estilos globales (despues de Bootstrap y perfil)", () => {
  const pos = archivo => HTML.indexOf(archivo);
  const tema = pos("./assets/css/tema.css?v=");
  assert.ok(tema > pos("materialize.min.css"));
  assert.ok(tema > pos("./assets/css/style.css"));
  assert.ok(tema > pos("./assets/vendor/bootstrap/bootstrap-dta.css"));
  assert.ok(tema > pos("./assets/css/perfil.css"));
});

test("REQ-047 ningun estilo de boton, modal o campo alcanza a Bootstrap (.bs) ni al login", () => {
  for (const { selectores } of reglas()) {
    for (const sel of selectores.split(",").map(s => s.trim())) {
      if (/\.(btn|btn-small|btn-flat|btn-floating)\b/.test(sel) && !/^\.modal/.test(sel)) {
        assert.match(sel, /:not\(\.bs \*\)/, "boton sin excluir .bs: " + sel);
        assert.match(sel, /:not\(dta-login \*\)/, "boton sin excluir el login: " + sel);
      }
      if (/^\.modal(?!-overlay)/.test(sel)) {
        assert.match(sel, /:not\(\.perfil-modal\)/, sel);
        assert.match(sel, /:not\(\.bs \*\)/, "un modal de Bootstrap quedaria tapado: " + sel);
        assert.match(sel, /:not\(dta-login \*\)/, sel);
      }
      if (/^\.input-field/.test(sel)) {
        assert.match(sel, /:not\(\.login-campo\)/, sel);
        assert.match(sel, /:not\(\.bs \*\)/, sel);
      }
    }
  }
});

test("REQ-047 tres tipos de boton: principal verde, secundario gris, peligro rojo", () => {
  const cuerpoDe = fragmento => reglas().find(r => r.selectores.indexOf(fragmento) >= 0 && !/:hover|:focus/.test(r.selectores)).cuerpo;
  assert.match(cuerpoDe(".btn-flat.teal"), /background-color: var\(--dta-verde\) !important/);
  assert.match(cuerpoDe(".btn.grey:not(.btn-floating)"), /border-color: var\(--dta-gris-borde\) !important/);
  assert.match(cuerpoDe(".btn.red:not(.btn-floating)"), /color: var\(--dta-rojo\) !important/);
  assert.match(CSS, /text-transform: none;/);
});

test("REQ-047 pie de modal fijo y cabecera de modal como la del perfil", () => {
  const pie = reglas().find(r => /> \.modal-footer$/.test(r.selectores)).cuerpo;
  assert.match(pie, /position: sticky;/);
  assert.match(pie, /bottom: 0;/);
  assert.ok(reglas().some(r => /> \.modal-content > \.swal-title:first-child/.test(r.selectores) && /linear-gradient/.test(r.cuerpo)));
});

test("REQ-047 los campos no anulan el margen izquierdo de los iconos (.prefix)", () => {
  const campo = reglas().find(r => /> textarea\.materialize-textarea$/.test(r.selectores) && /min-height/.test(r.cuerpo)).cuerpo;
  assert.doesNotMatch(campo, /\bmargin:/);
  assert.match(campo, /margin-top: 0;/);
});
