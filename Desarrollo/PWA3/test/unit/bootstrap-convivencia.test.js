"use strict";

/**
 * REQ-049 - Los modales de Bootstrap no heredan las reglas globales de .modal de Materialize/style.css.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
const CSS = fs.readFileSync(path.join(RAIZ, "assets", "css", "bootstrap-convivencia.css"), "utf8");

function cuerpoDe(selector) {
  const m = CSS.replace(/\/\*[\s\S]*?\*\//g, "").match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  return m ? m[1] : null;
}

test("REQ-049 se carga despues de Bootstrap, Materialize y style.css, y antes del CSS de los componentes", () => {
  const pos = archivo => HTML.indexOf(archivo);
  const conv = pos("./assets/css/bootstrap-convivencia.css?v=");
  assert.ok(conv > pos("./assets/vendor/bootstrap/bootstrap-dta.css"));
  assert.ok(conv > pos("materialize.min.css"));
  assert.ok(conv > pos("./assets/css/style.css"));
  assert.ok(conv < pos("./assets/js/components/fichas-tecnicas/fichas-tecnicas.css"));
});

test("REQ-049 la capa .modal de Bootstrap vuelve a ser transparente, a pantalla completa y sin limite de alto", () => {
  const capa = cuerpoDe(".bs .modal");
  assert.ok(capa);
  assert.match(capa, /max-height: none !important;/, "style.css impone max-height: 80% !important");
  assert.match(capa, /background-color: transparent !important;/);
  assert.match(capa, /width: 100% !important;/);
  assert.match(capa, /height: 100% !important;/);
  assert.match(capa, /transform: none !important;/);
});

test("REQ-049 contenido en columna y sin el padding/alto/fondo de Materialize", () => {
  assert.match(cuerpoDe(".bs .modal-content"), /flex-direction: column;[\s\S]*padding: 0;/);
  assert.match(cuerpoDe(".bs .modal-header"), /background-color: transparent;/);
  // style.css: .modal-header { position: fixed } sacaba la cabecera del flujo.
  assert.match(cuerpoDe(".bs .modal-header"), /position: static;/);
  assert.match(cuerpoDe(".bs .modal-footer"), /height: auto;/);
});

test("REQ-049 todas las reglas estan limitadas a .bs", () => {
  const selectores = [...CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{/g)].flatMap(m => m[1].split(",").map(s => s.trim()));
  selectores.forEach(sel => assert.match(sel, /^\.bs /, sel));
});

test("REQ-049 cada propiedad de posicion/tamano de .modal-* en style.css esta neutralizada dentro de .bs", () => {
  const estilo = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8").replace(/\r\n/g, "\n");
  const reglas = [...estilo.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)];
  for (const [, selectores, cuerpo] of reglas) {
    for (const sel of selectores.split(",").map(s => s.trim())) {
      const m = sel.match(/^\.(modal-header|modal-footer|modal-content|modal-body|modal-dialog)$/);
      if (!m) continue;
      for (const prop of ["position", "width", "height", "float", "top"]) {
        if (new RegExp("(^|;|\\s)" + prop + "\\s*:").test(cuerpo)) {
          assert.match(cuerpoDe(".bs ." + m[1]) || "", new RegExp(prop + ":"), "style.css ." + m[1] + " { " + prop + " } sin neutralizar");
        }
      }
    }
  }
});
