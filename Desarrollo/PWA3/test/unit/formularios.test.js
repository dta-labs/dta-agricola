"use strict";

/**
 * REQ-043 (fase A) - Formularios: select nativos, etiquetas fijas y fecha/hora nativas que guardan
 * en el formato de siempre.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const fechas = require("../../assets/js/logic/fechas.js");
const { crearDirectiva } = require("../../assets/js/ui/campos-fecha.directive.js");

// ---------- conversiones ----------

test("REQ-043 fecha guardada <-> ISO", () => {
  assert.equal(fechas.isoDesdeFechaGuardada("Nov 06, 2026"), "2026-11-06");
  assert.equal(fechas.isoDesdeFechaGuardada("Jan 1, 2027"), "2027-01-01");
  assert.equal(fechas.isoDesdeFechaGuardada("2026-11-06"), "2026-11-06");
  for (const raro of ["", null, undefined, "06/11/2026", "Foo 06, 2026"]) assert.equal(fechas.isoDesdeFechaGuardada(raro), "", String(raro));
  assert.equal(fechas.fechaGuardadaDesdeIso("2026-11-06"), "Nov 06, 2026");
  assert.equal(fechas.fechaGuardadaDesdeIso("2027-01-01"), "Jan 01, 2027");
  for (const raro of ["", null, "2026-13-01", "6/11/2026"]) assert.equal(fechas.fechaGuardadaDesdeIso(raro), "", String(raro));
});

test("REQ-043 ida y vuelta de fecha: lo guardado se puede seguir leyendo con parseFechaHora", () => {
  const guardada = fechas.fechaGuardadaDesdeIso("2026-02-28");
  assert.equal(fechas.isoDesdeFechaGuardada(guardada), "2026-02-28");
  const d = fechas.parseFechaHora(guardada, "6:05 PM");
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2026, 1, 28, 18, 5]);
});

test("REQ-043 hora guardada <-> 24 h", () => {
  const casos = [["8:30 AM", "08:30"], ["12:05 am", "00:05"], ["12:00 PM", "12:00"], ["11:59 pm", "23:59"], ["18:05", "18:05"], ["7:00 p.m.", "19:00"]];
  for (const [guardada, h24] of casos) assert.equal(fechas.hora24DesdeHoraGuardada(guardada), h24, guardada);
  for (const raro of ["", null, "13:00 PM", "25:00", "8:61 AM", "ocho"]) assert.equal(fechas.hora24DesdeHoraGuardada(raro), "", String(raro));
  assert.equal(fechas.horaGuardadaDesde24("18:05"), "6:05 PM");
  assert.equal(fechas.horaGuardadaDesde24("00:30"), "12:30 AM");
  assert.equal(fechas.horaGuardadaDesde24("12:00"), "12:00 PM");
  assert.equal(fechas.horaGuardadaDesde24("09:07:00"), "9:07 AM");
  for (const raro of ["", "24:00", "9:7", null]) assert.equal(fechas.horaGuardadaDesde24(raro), "", String(raro));
});

// ---------- directiva con dobles ----------

function montar(nombre, aCampo, aGuardado, valorInicial) {
  const modelo = { valor: valorInicial };
  const $parse = expr => {
    assert.equal(expr, "programa.campo");
    const getter = scope => scope.modelo.valor;
    getter.assign = (scope, v) => { scope.modelo.valor = v; };
    return getter;
  };
  const vigilantes = [];
  const destructores = [];
  const scope = {
    modelo,
    $watch: (getter, fn) => { vigilantes.push(() => fn(getter(scope))); return () => {}; },
    $evalAsync: fn => fn(),
    $on: (evento, fn) => destructores.push(fn)
  };
  const manejadores = {};
  const campo = { value: "" };
  const elemento = [campo];
  elemento.on = (ev, fn) => { manejadores[ev] = fn; };
  elemento.off = ev => { delete manejadores[ev]; };
  const [, fabrica] = crearDirectiva(nombre, aCampo, aGuardado);
  fabrica($parse).link(scope, elemento, { [nombre]: "programa.campo" });
  const digest = () => vigilantes.forEach(v => v());
  return { modelo, campo, manejadores, digest, destruir: () => destructores.forEach(d => d()) };
}

test("REQ-043 dtaFechaGuardada muestra ISO y guarda 'Nov 06, 2026'", () => {
  const m = montar("dtaFechaGuardada", fechas.isoDesdeFechaGuardada, fechas.fechaGuardadaDesdeIso, "Nov 06, 2026");
  m.digest();
  assert.equal(m.campo.value, "2026-11-06");
  m.campo.value = "2026-12-24";
  m.manejadores.change();
  assert.equal(m.modelo.valor, "Dec 24, 2026");
  m.campo.value = "";
  m.manejadores.input();
  assert.equal(m.modelo.valor, "");
  m.destruir();
  assert.deepEqual(Object.keys(m.manejadores), []);
});

test("REQ-043 dtaHoraGuardada muestra 24 h y guarda '6:05 PM'", () => {
  const m = montar("dtaHoraGuardada", fechas.hora24DesdeHoraGuardada, fechas.horaGuardadaDesde24, "8:30 AM");
  m.digest();
  assert.equal(m.campo.value, "08:30");
  m.campo.value = "18:05";
  m.manejadores.change();
  assert.equal(m.modelo.valor, "6:05 PM");
});

// ---------- estructura ----------

test("REQ-043 A1: todos los <select> son nativos y no queda M.FormSelect.init activo", () => {
  // REQ-059: varios formularios salieron a componentes; sus select se comprueban tambien.
  const componentes = require("node:child_process").execSync("find assets/js/components -name '*.html'", { cwd: path.join(__dirname, "..", "..") })
    .toString().trim().split("\n").map(r => fs.readFileSync(path.join(__dirname, "..", "..", r), "utf8")).join("\n");
  const selects = (HTML + componentes).match(/<select\b[^>]*>/g) || [];
  assert.ok(selects.length >= 25);
  selects.forEach(s => assert.match(s, /browser-default/, s));
  const activas = CORE.split("\n").filter(l => /M\.FormSelect\.init/.test(l) && !/^\s*\/\//.test(l));
  assert.deepEqual(activas, []);
});

test("REQ-043 A2: formularios.css se carga despues de Materialize y de style.css", () => {
  const pos = archivo => HTML.indexOf(archivo);
  const posFormularios = pos("./assets/css/formularios.css?v=");
  assert.ok(posFormularios > pos("materialize.min.css"), "despues de Materialize");
  assert.ok(posFormularios > pos("./assets/css/style.css"), "despues de style.css");
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "formularios.css"), "utf8");
  assert.match(css, /\.input-field:not\(\.inline\):not\(\.login-campo\) > label \{[^}]*position: static !important;[^}]*order: -1;/);
});

test("REQ-043 A3: el programa de estacionario usa fecha y hora nativas sin ng-model", () => {
  assert.equal((HTML.match(/class="datepicker"|class="timepicker"/g) || []).length, 0);
  assert.match(HTML, /<input id="programa_estacionario_fecha_inicio" type="date" class="form-control" dta-fecha-guardada="programaEstacionario\.fecha_inicio"/);
  assert.match(HTML, /<input id="programa_estacionario_hora_inicio" type="time" class="form-control" dta-hora-guardada="programaEstacionario\.hora_inicio"/);
  assert.match(HTML, /<input id="programa_estacionario_fecha_fin" type="date" class="form-control" dta-fecha-guardada="programaEstacionario\.fecha_fin"/);
  assert.ok(HTML.indexOf("./assets/js/ui/campos-fecha.directive.js?v=") > HTML.indexOf("./assets/js/logic/fechas.js?v="));
});
