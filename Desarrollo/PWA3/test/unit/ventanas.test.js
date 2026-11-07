"use strict";

/**
 * REQ-050 - Notificaciones, Ayuda, Invitar a alguien y Programa de riego con el estilo comun.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const riego = require("../../assets/js/logic/riego.js");
const fechas = require("../../assets/js/logic/fechas.js");

function modal(id) {
  const ini = HTML.indexOf('<div id="' + id + '"');
  assert.ok(ini > 0, "falta " + id);
  let prof = 0;
  const re = /<!--[\s\S]*?-->|<div\b|<\/div>/g;
  re.lastIndex = ini;
  let m;
  while ((m = re.exec(HTML))) {
    if (m[0].startsWith("<!--")) continue;
    prof += m[0] === "</div>" ? -1 : 1;
    if (prof === 0) return HTML.slice(ini, re.lastIndex);
  }
  throw new Error("sin cierre " + id);
}

for (const id of ["modalNotificaciones", "modalAddUser", "modalStationaryProgram"]) {
  test("REQ-050 " + id + ": estilo comun (cabecera, cuerpo, pie) sin clases de Materialize", () => {
    const m = modal(id);
    assert.match(m, new RegExp('<div id="' + id + '" class="modal ventana-modal[^"]*"[^>]*>\\s*<div class="bs ventana">'));
    assert.match(m, /class="ventana-cabecera"/);
    assert.match(m, /class="ventana-cuerpo"/);
    assert.match(m, /class="ventana-pie"/);
    assert.doesNotMatch(m, /class="[^"]*\b(input-field|col s\d+|waves-effect|btn-flat|swal-title)\b/);
    assert.doesNotMatch(m, /\sstyle="/);
  });
}

test("REQ-050 Notificaciones: modal con interruptores (sin checkbox) y ya no es una pantalla", () => {
  const m = modal("modalNotificaciones");
  assert.match(m, /ng-click="toggleNotifications\(\)"\s+role="switch"/);
  assert.match(m, /ng-click="toggleNotificationSound\(\)"\s+role="switch"/);
  assert.doesNotMatch(m, /type="checkbox"/);
  assert.equal(HTML.indexOf("selectedWindow == 'notificaciones'"), -1);
  assert.match(HTML, /ng-click="abrirNotificaciones\(\)"/);
  assert.match(CORE, /\$scope\.abrirNotificaciones = \(\) => abrirModal\("modalNotificaciones"\);/);
});

test("REQ-050 Invitar: formulario con validacion; ya no oculta el modal a mano", () => {
  const m = modal("modalAddUser");
  assert.match(m, /ng-submit="invitarUsuario\(\)"/);
  assert.match(m, /<label for="newUserEmail" class="form-label">/);
  assert.match(m, /<select id="newUserRole" class="browser-default form-select" ng-model="newUserRole">/);
  assert.equal(CORE.indexOf('document.getElementById("modalAddUser").style.display = "none"'), -1);
  assert.match(CORE, /if \(!__modulo\("login"\)\.esCorreoValido\(correo\)\)/);
});

test("REQ-050 Programa: ids unicos por parcela, periodo con ng-options y validacion antes de cerrar", () => {
  const m = modal("modalStationaryProgram");
  for (let n = 1; n <= 7; n += 1) assert.match(m, new RegExp('id="programaParcela' + n + '"[^>]*ng-model="programaEstacionario\\.t\\[' + (n - 1) + '\\]"'));
  assert.equal((m.match(/id="programa_estacionario_parcela"/g) || []).length, 0);
  assert.match(m, /ng-options="periodo\.valor as periodo\.nombre for periodo in periodosPrograma"/);
  assert.match(m, /ng-submit="iniciarProgramaDesdeFormulario\(\)"/);
  assert.doesNotMatch(m, /type="submit"[^>]*modal-close/, "Iniciar no debe cerrar antes de validar");
  assert.match(m, /ng-click="confirmarBorradoPrograma = true"/, "eliminar pide confirmacion");
  assert.match(m, /<span class="ventana-pie-izquierda" ng-if="programaEstacionario\.id">/, "un programa nuevo no se puede eliminar");
});

test("REQ-050 erroresDelPrograma: por campo, fechas en orden y al menos una parcela", () => {
  assert.deepEqual(Object.keys(riego.erroresDelPrograma({}, fechas)).sort(), ["cada", "fecha_fin", "fecha_inicio", "hora_inicio", "nombre", "t"]);
  const valido = { nombre: "Manana", fecha_inicio: "Nov 06, 2026", hora_inicio: "6:00 AM", fecha_fin: "Nov 30, 2026", cada: 1, periodo: "1", t: [0, 15, 0] };
  assert.deepEqual(riego.erroresDelPrograma(valido, fechas), {});
  assert.ok(riego.erroresDelPrograma(Object.assign({}, valido, { fecha_fin: "Nov 01, 2026" }), fechas).fecha_fin);
  assert.ok(riego.erroresDelPrograma(Object.assign({}, valido, { t: [0, "0", null] }), fechas).t);
  assert.ok(riego.erroresDelPrograma(Object.assign({}, valido, { nombre: "   " }), fechas).nombre);
  assert.ok(riego.erroresDelPrograma(Object.assign({}, valido, { cada: 0 }), fechas).cada);
});

test("REQ-050 normalizarPrograma y minutosPorCiclo", () => {
  const p = riego.normalizarPrograma({ periodo: 2, t: [5, "10"] });
  assert.equal(p.periodo, "2");
  assert.equal(p.t.length, 7);
  assert.equal(p.cada, 1);
  assert.equal(riego.minutosPorCiclo(p), 15);
  assert.equal(riego.normalizarPrograma({}).periodo, "0");
  assert.deepEqual(riego.PERIODOS.map(x => x.valor), ["0", "1", "2", "3"]);
});

test("REQ-050 ventana.css se carga despues de Bootstrap/convivencia y tema.css no alcanza a .ventana-modal", () => {
  const pos = a => HTML.indexOf(a);
  assert.ok(pos("./assets/css/ventana.css?v=") > pos("./assets/css/bootstrap-convivencia.css?v="));
  const tema = fs.readFileSync(path.join(RAIZ, "assets", "css", "tema.css"), "utf8");
  assert.equal((tema.match(/\.modal:not\(\.perfil-modal\)(?!:not\(\.ventana-modal\))/g) || []).length, 0);
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "ventana.css"), "utf8");
  assert.match(css, /\.modal\.ventana-modal \{[^}]*max-height: 85vh !important;/);
});
