"use strict";

/**
 * REQ-097 - Ajustes del sistema: acceso a la configuracion WiFi del Gateway Universal.
 *
 * El modulo WiFi del gateway (ESP8266, firmware DTA_Gateway_WiFi_ESP8266) tiene un punto de acceso
 * siempre activo con su portal en http://192.168.4.1. Desde "Ajustes del sistema" de las redes de
 * sensores y las neveras (equipos con gateway LoRa) se abre ese portal sin escribir la direccion.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");

/** Contenido del modal "Ajustes del sistema". */
function modalAjustes() {
  const ini = HTML.indexOf('<div id="modalAdjust"');
  return HTML.slice(ini, HTML.indexOf('<div id="modalSuelo"', ini));
}

/** Fila de la configuracion WiFi del gateway. */
function filaWifi() {
  const modal = modalAjustes();
  const ini = modal.indexOf('id="ajusteWifiGateway"');
  if (ini < 0) return null;
  const tr = modal.lastIndexOf("<tr", ini);
  return modal.slice(tr, modal.indexOf("</tr>", ini) + 5);
}

test("REQ-097 los ajustes del sistema tienen la fila de la WiFi del gateway", () => {
  assert.ok(filaWifi(), "falta la fila id=ajusteWifiGateway dentro de #modalAdjust");
});

test("REQ-097 el boton abre el portal del gateway en otra pestana", () => {
  const fila = filaWifi() || "";
  assert.match(fila, /<a [^>]*href="http:\/\/192\.168\.4\.1\/"/);
  assert.match(fila, /<a [^>]*target="_blank"/);
  assert.match(fila, /<a [^>]*rel="noopener"/);
  assert.match(fila, />\s*Abrir configuración WiFi\s*</);
});

test("REQ-097 solo en equipos con gateway LoRa (red de sensores y nevera) y para quien puede editar", () => {
  const fila = filaWifi() || "";
  assert.match(fila, /ng-show="\(actualSystem\.type == 'Sensor' \|\| esTipoNevera\(actualSystem\.type\)\) && \(isSystemOfRole\('propietario'\) \|\| isSystemOfRole\('desarrollador'\) \|\| isSystemOfRole\('administrador'\)\)"/);
});

test("REQ-097 explica antes que hay que conectarse a la red del gateway", () => {
  const fila = filaWifi() || "";
  assert.match(fila, /DTA-Gateway-/);
  assert.match(fila, /dtaagricola/);
});
