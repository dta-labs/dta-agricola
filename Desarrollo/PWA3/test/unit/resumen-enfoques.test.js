"use strict";

/**
 * REQ-155 - Resumen por enfoques: alertas Críticas / Por revisar, 4 indicadores por rol, "Qué atender primero" por
 * impacto (confirmaciones agrupadas, maximo 5 visibles), "Lo que toca hoy", sugerencias ligadas a datos y cultivos
 * por prioridad y superficie (en reposo, el suelo seco no es urgente).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const t = require("../../assets/js/logic/tablero.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const deps = {
  resumen: require("../../assets/js/logic/resumen.js"), panel: require("../../assets/js/logic/panel.js"),
  humedad: require("../../assets/js/logic/humedad.js"), medidor: require("../../assets/js/logic/medidor.js"),
  geo: require("../../assets/js/logic/geo.js"), frio: require("../../assets/js/logic/frio.js")
};
const ok = { voltage: "true", safety: "true", commDelay: "-1", status: "ON", position: "237", speed: "45", update: "20261120 09:48" };
// resumen falso por equipo: { estado, mensaje, linea }
const con = (mapa) => (s) => Object.assign({ linea: "" }, mapa[s.key]);

test("REQ-155 solo lo critico es rojo; confirmaciones y comunicacion agrupadas y neutras", () => {
  const sistemas = {
    a: { key: "a", name: "Abraham 8", type: "PC" }, b: { key: "b", name: "Belisario", type: "Estacionario" },
    c: { key: "c", name: "Cerrito", type: "Estacionario" }, d: { key: "d", name: "Dolores", type: "PC" },
    e: { key: "e", name: "Encino", type: "PC" }
  };
  const resumenDe = con({
    a: { estado: "emergencia", mensaje: "Falla eléctrica" }, b: { estado: "atencion", mensaje: "Esperando confirmación" },
    c: { estado: "atencion", mensaje: "Esperando confirmación" }, d: { estado: "atencion", mensaje: "Sin comunicación" },
    e: { estado: "ok", mensaje: "Sin alertas", linea: "Operando (3°) · Velocidad 40 %" }
  });
  const ahora = new Date(2026, 5, 15, 18).getTime();
  const r = t.tablero(sistemas, deps, { resumenDe, pronostico: { min: 2, instante: ahora + 9 * 3600000 }, umbralHelada: 2, ahora });
  assert.deepEqual(r.atiende.map(a => [a.categoria, a.nivel, a.titulo]), [
    ["critico", "emergencia", "Abraham 8 · Falla eléctrica"],
    ["critico", "emergencia", "Helada esta noche · 2 °C"],
    ["comunicacion", "revision", "Dolores · Sin comunicación"],
    ["confirmacion", "revision", "2 equipos esperando confirmación"]
  ]);
  assert.equal(r.atiende[3].detalle, "Belisario, Cerrito");
  assert.deepEqual(r.alertas, { criticas: 2, agronomia: 0, revision: 3 });
  assert.equal(r.semaforo.nivel, "emergencia");
  assert.equal(r.semaforo.titulo, "2 alertas críticas");
  assert.deepEqual([r.kpis.regando, r.kpis.fallasCriticas, r.kpis.riesgoHelada, r.kpis.nocheMin], [1, 1, true, 2]);
  assert.deepEqual(r.tocaHoy.map(i => i.texto), [
    "Revisar falla eléctrica en Abraham 8",
    "Verificar la mínima nocturna (2 °C hacia las 03:00)",
    "Revisar la conexión de Dolores",
    "Confirmar el riego en 2 equipos"
  ]);
  assert.equal(r.kpis.pendientes, 4);
  // sin criticas: el banner no es rojo
  const soloPendientes = t.tablero({ b: sistemas.b }, deps, { resumenDe, ahora });
  assert.deepEqual([soloPendientes.semaforo.nivel, soloPendientes.semaforo.titulo, soloPendientes.semaforo.detalle],
    ["revision", "Sin fallas críticas", "1 equipo pendiente de revisión"]);
  assert.equal(soloPendientes.tocaHoy[0].texto, "Confirmar el riego en Belisario");
});

test("REQ-155 en reposo invernal el suelo seco no es urgente (ni aviso ni sugerencia) y el cultivo lo dice", () => {
  const ahora = new Date(2026, 10, 22, 12).getTime();   // manzano en reposo
  const red = { key: "r", name: "Huerta", type: "Sensor", latitude: "28.6", sensors: { sensorNumber: 1, S0: { id: "1", culture: "Manzana", type: "SHT4", h: { minValue: "25", maxValue: "60" } } } };
  const resumenDe = con({ r: { estado: "atencion", mensaje: "Suelo seco en 1" } });
  const lecturaSeca = Object.assign({}, deps, { humedad: Object.assign({}, deps.humedad, {
    datosCrudos: () => [], valoresDeSensor: () => ({ ms: 10, t: 10 }) }) });
  const r = t.tablero({ r: red }, lecturaSeca, { resumenDe, ahora });
  assert.deepEqual(r.atiende, []);
  assert.equal(r.semaforo.nivel, "ok");
  assert.ok(!r.sugerencias.some(s => /riego/i.test(s.titulo)));
  assert.deepEqual([r.cultivos[0].estado, r.cultivos[0].texto], ["reposo", "En reposo · suelo algo seco, sin urgencia"]);
  assert.deepEqual([r.kpis.sectoresActivos, r.kpis.sectoresEnReposo, r.kpis.humedadOptima], [0, 1, null]);
  // en junio (fuera del reposo) si es un aviso de suelo
  const junio = t.tablero({ r: red }, lecturaSeca, { resumenDe, ahora: new Date(2026, 5, 15).getTime() });
  assert.equal(junio.atiende[0].categoria, "agronomia");
  assert.equal(junio.tocaHoy[0].texto, "Programar riego en Huerta");
  assert.equal(junio.cultivos[0].estado, "seco");
});

test("REQ-155 cultivos por prioridad y luego por superficie", () => {
  const s = {
    p: { key: "p", name: "Pivote", type: "PC", status: "OFF", length: "300", log: ok,
      plans: { a: { culture: "Agave", starAngle: "0", endAngle: "10" }, b: { culture: "Maíz", starAngle: "10", endAngle: "360" } } }
  };
  const r = t.tablero(s, deps, { ahora: new Date(2026, 5, 15).getTime() });
  assert.deepEqual(r.cultivos.map(c => c.nombre), ["Maíz", "Agave"]);   // mismo estado: el de mas superficie primero
});

test("REQ-155 vista: enfoques, alertas con cuentas, 4 indicadores, max 5 avisos, lista de hoy y actividad plegada", () => {
  const vista = leer("assets", "js", "components", "tablero", "tablero.html");
  const comp = require("../../assets/js/components/tablero/tablero.component.js");
  assert.deepEqual(comp.ENFOQUES.map(e => e.nombre), ["Todo", "Riego", "Agronomía", "Campo", "Administración"]);
  for (const txt of ["Regando ahora", "Humedad óptima", "Pendientes hoy", "Mínima esta noche", "Qué atender primero", "Lo que toca hoy", "Actividad de hoy"]) assert.ok(vista.includes(txt), txt);
  assert.match(vista, /ng-click="vm\.elegirEnfoque\(e\.clave\)"/);
  assert.match(vista, /<input type="checkbox" ng-checked="vm\.hecho\(i\)" ng-click="vm\.marcar\(i\)"/);
  // controlador: enfoque filtra avisos (misma lista entre digests) y las marcas cuentan los pendientes
  const vm = new comp.Controlador();
  vm.datos = { atiende: [{ categoria: "critico" }, { categoria: "confirmacion" }, { categoria: "agronomia" }], tocaHoy: [{ id: "x" }, { id: "y" }] };
  assert.equal(vm.avisos().length, 3);
  assert.equal(vm.avisos(), vm.avisos());
  vm.elegirEnfoque("admin");
  assert.deepEqual(vm.avisos().map(a => a.categoria), ["critico"]);
  assert.equal(vm.muestra("toca"), false);
  vm.elegirEnfoque("todo");
  assert.equal(vm.limite(), 5);
  assert.equal(vm.pendientes(), 2);
  vm.marcar({ id: "x" });
  assert.equal(vm.pendientes(), 1);
  // la campana flotante no compite con el resumen
  assert.match(leer("index.html"), /selectedWindow == 'listado' && vistaPrincipal != 'resumen'"/);
});
