"use strict";

/**
 * REQ-160 - Resumen "fisiologia + seguridad": la helada medida en varios equipos es UN aviso por impacto (equipos,
 * sensores, hectareas) con su accion de contencion; la actividad del dia agrupa la helada; la configuracion
 * (cultivos, parcelas, caudal, alertas de plagas) sale de las sugerencias a su propia seccion.
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
const con = (mapa) => (s) => Object.assign({ linea: "" }, mapa[s.key]);
const ahora = new Date(2026, 5, 15, 21, 50).getTime();   // junio: fuera del reposo

test("REQ-160 helada medida en varios equipos: un solo aviso critico con equipos y sensores, y su accion", () => {
  const sistemas = {
    l: { key: "l", name: "Luly Camacho", type: "Sensor" }, i: { key: "i", name: "Ignacio Delgado", type: "Sensor" },
    m: { key: "m", name: "Manuel Rivera", type: "Sensor" }, a: { key: "a", name: "Abraham 8", type: "PC" }
  };
  const resumenDe = con({
    l: { estado: "emergencia", mensaje: "Helada en Valvula 1" }, i: { estado: "emergencia", mensaje: "Helada en Sensor 1" },
    m: { estado: "emergencia", mensaje: "Helada en 3 sensores" }, a: { estado: "emergencia", mensaje: "Falla eléctrica" }
  });
  const r = t.tablero(sistemas, deps, { resumenDe, ahora });
  assert.deepEqual(r.atiende.map(a => a.titulo), ["Abraham 8 · Falla eléctrica", "Helada en 3 equipos · 5 sensores bajo el mínimo"]);
  assert.equal(r.atiende[1].detalle, "Luly Camacho, Ignacio Delgado, Manuel Rivera");
  assert.deepEqual(r.alertas, { criticas: 2, agronomia: 0, revision: 0 });
  assert.equal(r.tocaHoy[1].texto, "Activar la protección contra helada en 3 equipos (5 sensores bajo el mínimo)");
  assert.equal(r.tocaHoy[1].icono, "ac_unit");
  // un solo equipo: su aviso de siempre y la accion con su nombre
  const uno = t.tablero({ l: sistemas.l }, deps, { resumenDe, ahora });
  assert.equal(uno.atiende[0].titulo, "Luly Camacho · Helada en Valvula 1");
  assert.equal(uno.tocaHoy[0].texto, "Activar la protección contra helada en Luly Camacho");
});

test("REQ-160 actividad de hoy: la helada se agrupa en una linea (y la de equipos en reposo se omite)", () => {
  const ev = (k, nombre, min, texto) => ({ id: k + "|" + (ahora - min * 60000), instante: ahora - min * 60000, texto: nombre + ": " + texto, nivel: "emergencia" });
  const eventos = [
    ev("l", "Luly Camacho", 33, "Helada en Valvula 1"), ev("i", "Ignacio Delgado", 20, "Helada en Sensor 1"),
    ev("j", "Javier Hernández", 10, "Helada en Medio"), ev("m", "Manuel Rivera", 5, "Helada en 3 sensores"),
    ev("r", "Reposo", 4, "Helada en Sensor 9"), ev("a", "Abraham 8", 2, "Falla eléctrica")
  ];
  const notif = [{ fecha: ahora - 60000, titulo: "Riesgo de helada en Luly Camacho", tipo: "helada", sistema: "l", nivel: "alta" }];
  const hoy = t.lineaDeHoy(eventos, notif, null, ahora, 2, { heladaRelevante: true, sistemas: ["r"] });
  assert.deepEqual(hoy.map(h => h.texto), ["Helada en 4 equipos (7 avisos) · 21:17–21:49", "Abraham 8: Falla eléctrica"]);
  assert.equal(hoy[0].nivel, "emergencia");
  const evento = t.eventoDeCambio({ key: "z", name: "Z" }, { estado: "ok", linea: "" }, { estado: "emergencia", mensaje: "Helada en S1", linea: "" }, 5);
  assert.equal(evento.sistema, "z");
});

test("REQ-160 configuracion aparte de las sugerencias del dia", () => {
  const red = { key: "r", name: "Huerta", type: "Sensor", sensors: { sensorNumber: 2, S0: { id: "1" }, S1: { id: "2", culture: "Maíz" } } };
  const pivote = { key: "p", name: "Pivote", type: "PC", caudal: "" };
  const resumenDe = con({ r: { estado: "ok", mensaje: "Sin alertas" }, p: { estado: "ok", mensaje: "Sin alertas", linea: "Operando (3°) · Velocidad 40 %" } });
  const r = t.tablero({ r: red, p: pivote }, deps, { resumenDe, ahora });
  assert.ok(!r.sugerencias.some(s => /cultivo|parcela/i.test(s.titulo)));
  assert.deepEqual(r.configuracion.map(c => c.titulo), ["Asigna el cultivo a tus sensores", "Dibuja tus parcelas", "Configura el caudal de tus equipos", "Activa las alertas de plagas"]);
  assert.deepEqual(r.configuracion[2].accion, { tipo: "equipos" });
  const comp = require("../../assets/js/components/tablero/tablero.component.js");
  assert.ok(comp.ENFOQUES.find(e => e.clave === "todo").secciones.includes("config"));
  assert.equal(comp.ENFOQUES.find(e => e.clave === "admin").secciones[0], "config");
  const vm = new comp.Controlador();
  assert.equal(vm.configAbierta(), false);
  vm.elegirEnfoque("admin");
  assert.equal(vm.configAbierta(), true);
  const vista = leer("assets", "js", "components", "tablero", "tablero.html");
  assert.match(vista, /ng-if="vm\.muestra\('config'\) && vm\.datos\.configuracion\.length" aria-label="Configuración pendiente"/);
});
