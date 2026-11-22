"use strict";

/**
 * REQ-142 - Sensores de neveras e invernaderos sin datos: log.lo (ciclos que el gateway lleva sin recibir de cada
 * sensor, negativo = sin datos). Icono en la tarjeta y notificacion "no se actualiza desde ...".
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const nevera = require("../../assets/js/logic/nevera.js");
const notificaciones = require("../../assets/js/logic/notificaciones.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");

const sistema = {
  key: "865674034538310", name: "Cámaras", type: "Nevera", operationMode: "5",
  sensors: { sensorNumber: 3, S0: { id: "0x1A", alias: "Cámara 1" }, S1: { id: "0x2B" }, S2: { id: "0x3C" }, S3: {} }
};
const log = { date: "20261122 1150am", lo: "[-17,0,-1,0,0,0,0,0,0,0]" };
const instante = new Date(2026, 10, 22, 11, 50).getTime();

test("REQ-142 ciclos sin recibir por sensor (texto o arreglo; 0 si recibe o no hay lo)", () => {
  assert.equal(nevera.ciclosSinRecepcion(log, 0), 17);
  assert.equal(nevera.ciclosSinRecepcion(log, 1), 0);
  assert.equal(nevera.ciclosSinRecepcion({ lo: [-4, 0] }, 0), 4);
  assert.equal(nevera.ciclosSinRecepcion({}, 0), 0);
  assert.equal(nevera.ciclosSinRecepcion({ lo: "no-json" }, 0), 0);
  assert.equal(nevera.ciclosSinRecepcion(log, null), 0);
});

test("REQ-142 sensores sin datos y desde cuando (registro - ciclos x frecuencia)", () => {
  const lista = nevera.sensoresSinRecepcion(sistema, log, instante);
  assert.deepEqual(lista.map(s => [s.clave, s.nombre, s.ciclos]), [["S0", "Cámara 1", 17], ["S2", "0x3C", 1]]);
  assert.equal(lista[0].desde, instante - 17 * 5 * 60000);                 // 17 ciclos de 5 min = 85 min antes
  assert.equal(nevera.sensoresSinRecepcion({ ...sistema, operationMode: "" }, log, instante)[0].desde, null);
});

test("REQ-142 notificacion: tipo Sin datos, desde cuando y misma entrada mientras siga sin datos", () => {
  const [s0] = nevera.sensoresSinRecepcion(sistema, log, instante);
  const e = notificaciones.desdeSensorSinRecepcion(s0, sistema, instante);
  assert.equal(e.tipo, "sinDatos");
  assert.equal(e.nivel, "alta");
  assert.equal(e.titulo, "Sensor sin datos en Cámaras");
  assert.match(e.mensaje, /^Cámara 1: no se actualiza desde Hoy 10:25 \(17 ciclos sin recibir\)$/);
  assert.ok(notificaciones.TIPOS.sinDatos);
  // 5 minutos despues, un ciclo mas: el mismo "desde" -> el mismo id (no se repite en la bandeja)
  const despues = nevera.sensoresSinRecepcion(sistema, { lo: "[-18]" }, instante + 5 * 60000)[0];
  assert.equal(notificaciones.desdeSensorSinRecepcion(despues, sistema, instante).id, e.id);
  // sin frecuencia: se dice cuantos ciclos
  const sinFrecuencia = { clave: "S0", nombre: "X", ciclos: 1, desde: null, frecuencia: null };
  assert.match(notificaciones.desdeSensorSinRecepcion(sinFrecuencia, sistema, instante).mensaje, /hace 1 ciclos \(1 ciclo sin recibir\)/);
});

test("REQ-142 la tarjeta muestra el icono de notificacion cuando lo del sensor es negativo", () => {
  const html = leer("assets", "js", "components", "sistema", "panel-nevera", "panel-nevera.html");
  assert.match(html, /<i class="material-icons nevera-sin-datos" ng-if="vm\.ciclosSinRecepcion\(coldRoomKey\) > 0"/);
  assert.match(html, />notification_important<\/i>/);
  const { Controlador } = require("../../assets/js/components/sistema/panel-nevera/panel-nevera.component.js");
  const vm = new Controlador({ panel: {} });
  vm.sistema = { log };
  assert.equal(vm.ciclosSinRecepcion("S0"), 17);
  assert.equal(vm.ciclosSinRecepcion("S1"), 0);
  assert.match(leer("assets", "js", "components", "sistema", "paneles.css"), /\.nevera-sin-datos \{/);
});

test("REQ-142 core.js manda a la bandeja los sensores sin datos de neveras e invernaderos", () => {
  const core = leer("assets", "js", "core.js");
  assert.match(core, /esTipoNevera\(sistema\.type\) && sistema\.log\.lo/);
  assert.match(core, /__modulo\("nevera"\)\.sensoresSinRecepcion\(sistema, sistema\.log, instanteLog\)/);
  assert.match(core, /__modulo\("notificaciones"\)\.desdeSensorSinRecepcion\(item, sistema\)/);
});
