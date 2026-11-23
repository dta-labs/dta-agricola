"use strict";

/**
 * REQ-156 - Resumen: 6 indicadores por importancia y certeza; nuevos "Consumo de agua" (m³/h en curso: caudal de los
 * equipos que riegan + caudalimetros) y "Riesgo de plagas" (avisos de las ultimas 48 h y sensores que vigilan).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const t = require("../../assets/js/logic/tablero.js");
const notificaciones = require("../../assets/js/logic/notificaciones.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const deps = {
  resumen: require("../../assets/js/logic/resumen.js"), panel: require("../../assets/js/logic/panel.js"),
  humedad: require("../../assets/js/logic/humedad.js"), medidor: require("../../assets/js/logic/medidor.js"),
  geo: require("../../assets/js/logic/geo.js"), frio: require("../../assets/js/logic/frio.js")
};
const ahora = new Date(2026, 5, 15, 12).getTime();
const operando = { estado: "ok", mensaje: "Sin alertas", linea: "Operando (3°) · Velocidad 40 %" };
const con = (mapa) => (s) => Object.assign({ linea: "" }, mapa[s.key]);

test("REQ-156 caudal: < 1 se toma como m³/s y el resto como L/s", () => {
  assert.equal(t.caudalM3h("50"), 180);       // 50 L/s
  assert.equal(t.caudalM3h(0.05), 180);       // 0.05 m³/s
  assert.equal(t.caudalM3h("0"), null);
  assert.equal(t.caudalM3h(""), null);
});

test("REQ-156 consumo de agua en curso: equipos que riegan con caudal, sin caudal y caudalimetros", () => {
  const sistemas = {
    a: { key: "a", name: "Pivote A", type: "PC", caudal: "50" },
    b: { key: "b", name: "Pivote B", type: "PC", caudal: "" },
    c: { key: "c", name: "Pivote C", type: "PC", caudal: "80" },                   // detenido: no cuenta
    n: { key: "n", name: "Invernadero", type: "Invernadero", sensors: { sensorNumber: 1, S0: { id: "f", type: "Fl" } },
      log: { dataRaw: JSON.stringify([100, 0, 3.9]) } }                             // 100 L/min = 6 m³/h
  };
  const resumenDe = con({ a: operando, b: operando, c: { estado: "inactivo", mensaje: "Sin alertas", linea: "Detenido" }, n: { estado: "ok", mensaje: "Sin alertas" } });
  const agua = t.tablero(sistemas, deps, { resumenDe, ahora }).kpis.agua;
  assert.deepEqual(agua, { m3h: 186, activos: 2, sinCaudal: 1, medidos: 1 });
  // nadie riega
  assert.deepEqual(t.tablero({ c: sistemas.c }, deps, { resumenDe, ahora }).kpis.agua, { m3h: 0, activos: 0, sinCaudal: 0, medidos: 0 });
  // riega sin caudal configurado: no se inventa un numero
  assert.equal(t.tablero({ b: sistemas.b }, deps, { resumenDe, ahora }).kpis.agua.m3h, null);
});

test("REQ-156 riesgo de plagas: el peor aviso de 48 h, sensores que vigilan o sin vigilancia", () => {
  const red = { key: "r", name: "Huerta", type: "Sensor", sensors: { sensorNumber: 1, S0: { id: "1", alerts: { "Tizón tardío": true } } } };
  const resumenDe = con({ r: { estado: "ok", mensaje: "Sin alertas" } });
  const aviso = (horas, nivel, enfermedad, probabilidad) => ({ tipo: "plagas", nivel, fecha: ahora - horas * 3600000, enfermedad, probabilidad });
  let p = t.tablero({ r: red }, deps, { resumenDe, ahora, notificaciones: [aviso(2, "media", "Roya", 55), aviso(5, "alta", "Tizón tardío", 78), aviso(60, "alta", "Viejo", 90)] }).kpis.plagas;
  assert.deepEqual([p.nivel, p.texto, p.nota, p.avisos], ["alto", "Alto", "Tizón tardío · 78 %", 2]);
  p = t.tablero({ r: red }, deps, { resumenDe, ahora, notificaciones: [] }).kpis.plagas;
  assert.deepEqual([p.nivel, p.texto, p.nota], ["sin-riesgo", "Sin riesgo", "1 sensor vigila"]);
  const sinAlertas = { key: "r", name: "Huerta", type: "Sensor", sensors: { sensorNumber: 1, S0: { id: "1" } } };
  p = t.tablero({ r: sinAlertas }, deps, { resumenDe, ahora }).kpis.plagas;
  assert.deepEqual([p.nivel, p.texto, p.nota], ["sin-vigilancia", "—", "Activa las alertas de plagas en tus sensores"]);
  // la notificacion push guarda la enfermedad y la probabilidad
  const e = notificaciones.desdePush({ notification: { title: "Plagas", body: "x" }, data: { alertType: "disease-risk", disease: "Roya", probability: "55.4" } });
  assert.deepEqual([e.tipo, e.nivel, e.enfermedad, e.probabilidad], ["plagas", "media", "Roya", 55]);
});

test("REQ-156 vista: 6 indicadores en orden de importancia y certeza, con su etiqueta de certeza", () => {
  const vista = leer("assets", "js", "components", "tablero", "tablero.html");
  const orden = ["Regando ahora", "Mínima esta noche", "Humedad óptima", "Consumo de agua", "Riesgo de plagas", "Pendientes hoy"].map(x => vista.indexOf("</i> " + x));
  assert.ok(orden.every(i => i > 0));
  assert.deepEqual(orden.slice().sort((a, b) => a - b), orden);
  for (const c of ["Reportado", "Pronóstico", "Medido", "Modelo", "Tu lista"]) assert.ok(vista.includes('tablero-kpi-certeza">' + c), c);
  const comp = require("../../assets/js/components/tablero/tablero.component.js");
  const vm = new comp.Controlador();
  assert.equal(vm.miles(14500), "14,500");
  vm.datos = { kpis: { agua: { m3h: 186, activos: 2, sinCaudal: 1, medidos: 1 } } };
  assert.equal(vm.notaAgua(), "2 equipos activos · 1 sin caudal configurado · 1 caudalímetro");
  vm.datos.kpis.agua = { m3h: 0, activos: 0, sinCaudal: 0, medidos: 0 };
  assert.equal(vm.notaAgua(), "Sin riego en curso");
  assert.match(leer("assets", "js", "components", "tablero", "tablero.css"), /\.tablero-kpis \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
  assert.match(leer("assets", "js", "core.js"), /notificaciones: bandejaLista \}\);   \/\/ REQ-156/);
});
