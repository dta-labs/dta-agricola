"use strict";

/**
 * REQ-045 - "Mi perfil" moderno: Bootstrap dentro del modal, fecha ISO sin errores de Angular,
 * errores en linea y confirmacion solo tras guardar.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const fechas = require("../../assets/js/logic/fechas.js");

const MODAL = HTML.slice(HTML.indexOf('<div id="modalMiPerfil"'), HTML.indexOf('<div id="modalPlanes"'));

test("REQ-045 el contenido del perfil es Bootstrap dentro de .bs, sin clases de Materialize", () => {
  assert.match(MODAL, /<div id="modalMiPerfil" class="modal perfil-modal">\s*<div class="bs perfil">/);
  assert.doesNotMatch(MODAL, /class="[^"]*\b(input-field|col s\d+|waves-effect|btn-flat)\b/);
  assert.doesNotMatch(MODAL, /\sstyle="/);
  assert.ok((MODAL.match(/class="form-control"/g) || []).length >= 6);
  assert.equal((MODAL.match(/class="browser-default form-select"/g) || []).length, 4);
});

test("REQ-045 cada campo tiene su etiqueta encima (label for = id)", () => {
  const ids = [...MODAL.matchAll(/<(input|select) id="(perfil[A-Za-z]+)"/g)].map(m => m[2]);
  assert.ok(ids.length >= 9);
  ids.forEach(id => assert.match(MODAL, new RegExp('<label for="' + id + '" class="form-label">'), id));
});

test("REQ-046 problemas como chips: botones con ng-click, sin checkbox oculto", () => {
  assert.doesNotMatch(MODAL, /btn-check|type="checkbox"/);
  assert.match(MODAL, /<button type="button" ng-repeat="opcion in opcionesProblemas"/);
  assert.match(MODAL, /ng-click="alternarProblema\(opcion\)"/);
  assert.match(MODAL, /ng-class="problemasSeleccionados\[opcion\] \? 'btn-success' : 'btn-outline-success'"/);
  assert.match(MODAL, /aria-pressed="\{\{ problemasSeleccionados\[opcion\] \? 'true' : 'false' \}\}"/);
});

test("REQ-046 alternarProblema marca y desmarca", () => {
  const ini = CORE.indexOf("$scope.alternarProblema = (opcion) => {");
  assert.ok(ini > 0);
  const cuerpo = CORE.slice(ini, CORE.indexOf("\n    };", ini) + 7).replace("$scope.alternarProblema = ", "return ");
  const $scope = {};
  const alternar = new Function("$scope", cuerpo)($scope);
  alternar("Riego");
  assert.equal($scope.problemasSeleccionados.Riego, true);
  alternar("Riego");
  assert.equal($scope.problemasSeleccionados.Riego, false);
});

test("REQ-046 queda espacio debajo del perfil", () => {
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "perfil.css"), "utf8");
  // style.css impone ".modal { max-height: 80% !important }": el perfil debe ganarle con !important.
  assert.match(css, /\.modal\.perfil-modal \{[^}]*max-height: 85vh !important;[^}]*top: 5vh !important;/);
  assert.match(css, /\.bs\.perfil \{[^}]*max-height: inherit;/);
  assert.match(css, /\.perfil-pie \{\s*flex-shrink: 0;/);
  const estilo = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  assert.match(estilo, /\.modal \{\s*max-height: 80% !important;/, "si cambia esta regla global, revisar perfil.css");
  assert.match(css, /padding-bottom: calc\(18px \+ env\(safe-area-inset-bottom\)\)/);
});

test("REQ-045 la fecha de nacimiento no usa ng-model (input[date] de Angular exige Date) sino dta-fecha-iso", () => {
  assert.match(MODAL, /<input id="perfilFechaNacimiento" type="date" class="form-control" dta-fecha-iso="perfil\.fechaNacimiento">/);
  assert.doesNotMatch(MODAL, /type="date"[^>]*ng-model=/);
  assert.equal(fechas.isoDesdeFechaGuardada("1990-05-20T06:00:00.000Z"), "1990-05-20");
  const directiva = fs.readFileSync(path.join(RAIZ, "assets", "js", "ui", "campos-fecha.directive.js"), "utf8");
  assert.match(directiva, /\.directive\("dtaFechaIso", crearDirectiva\("dtaFechaIso"/);
});

test("REQ-045 formulario con Enter, Guardar en el pie y estado 'Guardando'", () => {
  assert.match(MODAL, /<form class="perfil-cuerpo" name="formularioPerfil" ng-submit="guardarPerfil\(\)" novalidate id="formularioPerfil">/);
  assert.match(MODAL, /<button type="submit" form="formularioPerfil" class="btn btn-success" ng-disabled="perfilGuardando">/);
  assert.match(MODAL, /<div class="alert alert-danger py-2" ng-if="perfilError" role="alert">/);
});

test("REQ-045 / REQ-041 P-1: guardarPerfil confirma solo despues de que Firebase resuelve", () => {
  const ini = CORE.indexOf("$scope.guardarPerfil = () => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("$scope.abrirPlanes", ini));
  assert.doesNotMatch(cuerpo, /swal\(/, "sin ventanas: errores en linea y aviso breve");
  const posActualizar = cuerpo.indexOf("updateUserInfo(");
  const posThen = cuerpo.indexOf(".then(", posActualizar);
  assert.ok(posActualizar > 0 && posThen > posActualizar);
  assert.ok(cuerpo.indexOf("$scope.userProfile = perfil;") > posThen, "el estado local cambia tras guardar");
  assert.ok(cuerpo.indexOf('M.toast({ html: "Perfil guardado"') > posThen);
  assert.match(cuerpo, /\.catch\(error => \{[\s\S]*perfilError = "No se pudo guardar tu perfil/);
});

test("REQ-045 perfil.css se carga despues de Bootstrap", () => {
  assert.ok(HTML.indexOf("./assets/css/perfil.css?v=") > HTML.indexOf("./assets/vendor/bootstrap/bootstrap-dta.css?v="));
});
