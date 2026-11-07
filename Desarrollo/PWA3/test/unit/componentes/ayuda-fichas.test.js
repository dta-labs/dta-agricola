"use strict";

/**
 * REQ-040 - Controladores de <dta-ayuda> y <dta-fichas-tecnicas>, con dobles.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const ayuda = require("../../../assets/js/components/ayuda/ayuda.component.js");
const fichas = require("../../../assets/js/components/fichas-tecnicas/fichas-tecnicas.component.js");
const repoFactory = require("../../../assets/js/app/repo.factory.js");
const uiFactory = require("../../../assets/js/ui/ui.factory.js");
const cultivos = require("../../../assets/js/logic/cultivos.js");

const $q = { when: valor => Promise.resolve(valor) };

// ---------- Ayuda ----------

function crearAyuda() {
  const llamadas = { abrir: 0, cerrar: 0, destruir: 0, avisado: 0, abiertas: [] };
  const modal = { nombre: "ayuda" };
  let alCerrarModal = null;
  const $element = [{ querySelector: sel => (sel === ".ayuda-modal" ? modal : null) }];
  const dtaUi = {
    abrirModal: (m, op) => { assert.equal(m, modal); llamadas.abrir += 1; alCerrarModal = op && op.alCerrar; },
    cerrarModal: m => { assert.equal(m, modal); llamadas.cerrar += 1; if (alCerrarModal) alCerrarModal(); },
    destruirModal: m => { assert.equal(m, modal); llamadas.destruir += 1; }
  };
  const $window = { open: (url, destino, opciones) => llamadas.abiertas.push([url, destino, opciones]) };
  const vm = new ayuda.Controlador($window, fn => fn(), $element, dtaUi);
  vm.alCerrar = () => { llamadas.avisado += 1; };
  return { vm, llamadas };
}

test("REQ-050 ayuda: abre el modal al montarse y avisa al cerrarse", () => {
  const { vm, llamadas } = crearAyuda();
  vm.$onInit();
  assert.equal(vm.mostrarQR, false);
  vm.$postLink();
  assert.equal(llamadas.abrir, 1);
  vm.cerrar();
  assert.equal(llamadas.avisado, 1);
  vm.$onDestroy();
  assert.equal(llamadas.destruir, 1);
});

test("REQ-040 ayuda: compartir abre WhatsApp con la URL de la app", () => {
  const { vm, llamadas } = crearAyuda();
  const abiertas = llamadas.abiertas;
  vm.compartir();
  assert.equal(abiertas.length, 1);
  assert.match(abiertas[0][0], /^https:\/\/wa\.me\/\?text=DTA%20-%20Monitoring%20%26%20Control%3A%20https%3A%2F%2Fdta-agricola\.web\.app$/);
  assert.equal(abiertas[0][1], "_blank");
  assert.equal(abiertas[0][2], "noopener");
});

test("REQ-050 ayuda: definicion con salida al-cerrar", () => {
  assert.deepEqual(ayuda.definicion.bindings, { alCerrar: "&" });
  assert.deepEqual(ayuda.Controlador.$inject, ["$window", "$timeout", "$element", "dtaUi"]);
});

// ---------- Fichas tecnicas (REQ-048: en un modal) ----------

function crearFichas(opciones = {}) {
  const llamadas = { leer: 0, abrir: 0, cerrar: 0, destruir: 0, cerradoAvisado: 0 };
  const modal = { nombre: "fichas" };
  let alCerrarModal = null;
  const $element = [{ querySelector: sel => (sel === ".fichas-modal" ? modal : null) }];
  const datos = opciones.datos !== undefined ? opciones.datos : {
    a: { culture: "Nogal", detail: "", price: "0.00", plan: [{ day: "10~15", action: "Riego" }] },
    b: { culture: "Chile", detail: "Jalapeño", price: "15.00", plan: [] },
    c: { culture: "Oculto", type: "n" }
  };
  const dtaRepo = {
    leerCultivos: () => {
      llamadas.leer += 1;
      if (opciones.error) return Promise.reject(opciones.error);
      return Promise.resolve({ val: () => datos });
    }
  };
  const dtaUi = {
    abrirModal: (m, op) => { assert.equal(m, modal); llamadas.abrir += 1; alCerrarModal = op && op.alCerrar; },
    cerrarModal: m => { assert.equal(m, modal); llamadas.cerrar += 1; if (alCerrarModal) alCerrarModal(); },
    destruirModal: m => { assert.equal(m, modal); llamadas.destruir += 1; }
  };
  const $timeout = fn => fn();
  const vm = new fichas.Controlador($q, $timeout, $element, dtaRepo, { cultivos }, dtaUi);
  vm.alCerrar = () => { llamadas.cerradoAvisado += 1; };
  return { vm, llamadas };
}

test("REQ-048 fichas: al montarse abre el modal; al cerrarse avisa con al-cerrar", async () => {
  const { vm, llamadas } = crearFichas();
  await vm.$onInit();
  vm.$postLink();
  assert.equal(llamadas.abrir, 1);
  vm.cerrar();
  assert.equal(llamadas.cerrar, 1);
  assert.equal(llamadas.cerradoAvisado, 1);
  vm.$onDestroy();
  assert.equal(llamadas.destruir, 1);
});

test("REQ-040 F-3 fichas: al abrir lee los cultivos una vez y oculta los de tipo n", async () => {
  const { vm, llamadas } = crearFichas();
  const promesa = vm.$onInit();
  assert.equal(vm.estado, "cargando");
  await promesa;
  assert.equal(llamadas.leer, 1);
  assert.equal(vm.estado, "lista");
  assert.equal(vm.filtro, "");
  assert.deepEqual(vm.cultivos.map(c => c.culture), ["Nogal", "Chile"]);
});

test("REQ-040 F-d fichas: sin permiso o sin datos, estado 'vacia'", async () => {
  const conError = crearFichas({ error: new Error("PERMISSION_DENIED") });
  const consola = console.warn;
  console.warn = () => {};
  try { await conError.vm.$onInit(); } finally { console.warn = consola; }
  assert.equal(conError.vm.estado, "vacia");
  const sinDatos = crearFichas({ datos: null });
  await sinDatos.vm.$onInit();
  assert.equal(sinDatos.vm.estado, "vacia");
});

test("REQ-048 fichas: un cultivo gratuito muestra su ficha dentro del mismo modal; volver regresa a la lista", async () => {
  const { vm, llamadas } = crearFichas();
  await vm.$onInit();
  const nogal = vm.cultivos[0];
  assert.equal(vm.abrir(nogal), true);
  const primera = vm.ficha;
  assert.equal(primera.etapas[0].dia, 10);
  vm.volverALista();
  assert.equal(vm.ficha, null);
  vm.abrir(nogal);
  assert.deepEqual(vm.ficha, primera, "F-1: abrir dos veces da lo mismo");
  assert.equal(nogal.plan[0].day, "10~15");
  assert.equal(llamadas.abrir, 0, "no abre un segundo modal");
});

test("REQ-040 F-c fichas: de pago muestra el aviso y no abre la ficha", async () => {
  const { vm } = crearFichas();
  await vm.$onInit();
  assert.equal(vm.abrir(vm.cultivos[1]), false);
  assert.equal(vm.aviso, "La ficha técnica de Chile (Jalapeño) es un recurso de pago.");
  assert.equal(vm.ficha, null);
  vm.abrir(vm.cultivos[0]);
  assert.equal(vm.aviso, null);
});

test("REQ-048 fichas: definicion con salida al-cerrar", () => {
  assert.deepEqual(fichas.definicion.bindings, { alCerrar: "&" });
  assert.deepEqual(fichas.Controlador.$inject, ["$q", "$timeout", "$element", "dtaRepo", "dtaReglas", "dtaUi"]);
});

test("REQ-040 dtaRepo exige el repositorio", () => {
  assert.throws(() => repoFactory.crear(null), /no inicializado/);
  const repo = { leerCultivos() {} };
  assert.equal(repoFactory.crear(repo), repo);
});

// ---------- dtaUi con Bootstrap (REQ-043) ----------

function documentoFalso() {
  const cuerpo = { hijos: [], classList: new Set(), style: { removeProperty() {} } };
  cuerpo.classList.remove = cuerpo.classList.delete;
  cuerpo.appendChild = n => { cuerpo.hijos.push(n); n.parentNode = cuerpo; };
  cuerpo.querySelector = () => cuerpo.hijos.find(n => n.className === "bs dta-portal") || null;
  const doc = {
    body: cuerpo,
    createElement: () => {
      const nodo = { hijos: [], className: "", classList: { contains: c => nodo.className.split(" ").includes(c) } };
      nodo.appendChild = n => { if (n.parentNode && n.parentNode.hijos) n.parentNode.hijos = n.parentNode.hijos.filter(x => x !== n); nodo.hijos.push(n); n.parentNode = nodo; };
      nodo.removeChild = n => { nodo.hijos = nodo.hijos.filter(x => x !== n); n.parentNode = null; };
      return nodo;
    },
    querySelectorAll: () => []
  };
  return doc;
}

function modalFalso() {
  const clases = new Set(["modal"]);
  const componente = { hijos: [] };
  const modal = {
    parentNode: componente,
    classList: { add: c => clases.add(c), contains: c => clases.has(c) },
    closest: sel => (sel === ".bs" ? componente : null)
  };
  componente.hijos.push(modal);
  return modal;
}

test("REQ-043 dtaUi: el modal de Bootstrap se abre en el portal .bs del <body> y se retira al destruir", () => {
  const eventos = [];
  const instancias = new Map();
  const bootstrap = {
    Modal: {
      getOrCreateInstance: el => { if (!instancias.has(el)) instancias.set(el, { show: () => eventos.push("show"), hide: () => eventos.push("hide"), dispose: () => { eventos.push("dispose"); instancias.delete(el); } }); return instancias.get(el); },
      getInstance: el => instancias.get(el) || null
    }
  };
  const doc = documentoFalso();
  const ui = uiFactory.crear(() => null, () => null, console, () => bootstrap, () => doc);
  const modal = modalFalso();
  assert.equal(ui.abrirModal(modal), true);
  const portal = doc.body.hijos[0];
  assert.equal(portal.className, "bs dta-portal");
  assert.equal(modal.parentNode, portal);
  ui.abrirModal(modal);
  assert.equal(doc.body.hijos.length, 1, "un solo portal");
  ui.cerrarModal(modal);
  ui.destruirModal(modal);
  assert.equal(modal.parentNode, null);
  assert.deepEqual(eventos, ["show", "show", "hide", "dispose"]);
});

test("REQ-048 dtaUi: alCerrar se registra una vez en hidden.bs.modal", () => {
  const registros = [];
  const bootstrap = { Modal: { getOrCreateInstance: () => ({ show() {} }), getInstance: () => null } };
  const ui = uiFactory.crear(() => null, () => null, console, () => bootstrap, () => documentoFalso());
  const modal = modalFalso();
  modal.addEventListener = (evento, fn, opciones) => registros.push([evento, typeof fn, opciones]);
  const alCerrar = () => {};
  ui.abrirModal(modal, { alCerrar });
  assert.deepEqual(registros, [["hidden.bs.modal", "function", { once: true }]]);
});

test("REQ-043 dtaUi: sin Bootstrap o fuera de .bs usa Materialize", () => {
  const eventos = [];
  const M = { Modal: { getInstance: () => null, init: () => ({ open: () => eventos.push("open-M") }) } };
  const ui = uiFactory.crear(() => null, () => M, console, () => null, () => null);
  assert.equal(ui.abrirModal({ closest: () => null }), true);
  assert.deepEqual(eventos, ["open-M"]);
});
