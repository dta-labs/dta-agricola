"use strict";

/**
 * REQ-037 - La CSP debe permitir los dos transportes de Realtime Database.
 *
 * Si el navegador recuerda un fallo de WebSocket, Firebase usa long polling (BrowserPollConnection),
 * que carga <script src="https://<db>.firebaseio.com/.lp?..."> . Sin ese dominio en script-src la
 * conexion nunca se establece y no aparece ningun equipo.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const HTML = fs.readFileSync(path.join(__dirname, "..", "..", "index.html"), "utf8");
const CSP = (HTML.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/) || [])[1] || "";

function directiva(nombre) {
  const parte = CSP.split(";").map(p => p.trim()).find(p => p.indexOf(nombre + " ") === 0);
  return parte ? parte.split(/\s+/).slice(1) : [];
}

test("REQ-037.1 script-src permite el long polling de Realtime Database", () => {
  assert.ok(directiva("script-src").includes("https://*.firebaseio.com"));
  assert.ok(directiva("script-src").includes("https://*.firebasedatabase.app"));
});

test("REQ-037.2 connect-src permite WebSocket y HTTPS de Realtime Database", () => {
  const conexion = directiva("connect-src");
  ["https://*.firebaseio.com", "wss://*.firebaseio.com", "https://*.firebasedatabase.app", "wss://*.firebasedatabase.app"]
    .forEach(origen => assert.ok(conexion.includes(origen), origen));
});
