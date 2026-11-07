"use strict";

/**
 * REQ-042 - Selector de cultivos del pivote ("Nuevo plan" y "Editar plan").
 *
 * El <select> de Materialize se construye con las <option> que existen al inicializarse: con los
 * cultivos cargados despues (REQ-040 F-5) quedaba vacio o desfasado. Se usa el select nativo con
 * ng-options, como los selectores de cultivo de los sensores.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

function etiquetaSelect(id) {
  const m = HTML.match(new RegExp('<select id="' + id + '"[^>]*>'));
  return m ? m[0] : null;
}

// REQ-059: "Nuevo plan" y "Planificacion" son ahora un solo formulario (<dta-plan-pivote>).
test("REQ-042/059 el cultivo del plan del pivote es un select nativo con ng-options sobre los cultivos", () => {
  const plantilla = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "plan-pivote", "plan-pivote.html"), "utf8");
  assert.match(plantilla, /<select id="planPivoteCultivo" class="browser-default form-select" ng-model="vm\.plan\.cultivo"\s+ng-options="c\.culture as c\.culture for c in vm\.cultivos">/);
  assert.match(HTML, /<dta-plan-pivote [^>]*cultivos="listOfCultures"/);
  assert.equal(HTML.indexOf('id="planSetCulture"'), -1);
  assert.equal(HTML.indexOf('id="editPlanSetCulture"'), -1);
});

test("REQ-042/043 getCultures ya no construye select de Materialize (todos son nativos)", () => {
  const ini = CORE.indexOf("getCultures = () => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("}).catch(", ini));
  assert.ok(cuerpo.indexOf("$scope.$apply();") > 0);
  assert.equal(cuerpo.indexOf("M.FormSelect.init("), -1);
});
