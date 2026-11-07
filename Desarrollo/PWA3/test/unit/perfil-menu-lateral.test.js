"use strict";

/**
 * REQ-036 - Foto del usuario, menu de perfil en el menu lateral y plan actual destacado.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

function imagenesDeFoto() {
  return HTML.match(/<img[^>]*ng-src="\{\{ authUser\.photoURL \}\}"[^>]*>/g) || [];
}

test("REQ-036.1 la foto de Google se pide sin referrer (googleusercontent la rechaza con el)", () => {
  const imagenes = imagenesDeFoto();
  assert.ok(imagenes.length >= 2, "faltan las fotos de la barra y del menu lateral");
  imagenes.forEach(img => assert.match(img, /referrerpolicy="no-referrer"/));
});

test("REQ-036.2 si la foto falla se muestra la inicial", () => {
  imagenesDeFoto().forEach(img => {
    assert.match(img, /onerror="angular\.element\(this\)\.scope\(\)\.marcarFotoFallida\(this\)"/);
    assert.match(img, /!fotoUsuarioFallo/);
  });
  assert.ok(CORE.indexOf("$scope.marcarFotoFallida = (img) =>") >= 0);
  assert.ok(CORE.indexOf("$scope.inicialDelUsuario = () =>") >= 0);
});

test("REQ-036.6 fotoAlternativa: otra URL de la misma foto de Google", () => {
  const perfil = require("../../assets/js/logic/perfil.js");
  assert.equal(perfil.fotoAlternativa("https://lh3.googleusercontent.com/a/ABC=s96-c"), "https://lh3.googleusercontent.com/a/ABC=s128-c");
  assert.equal(perfil.fotoAlternativa("https://lh3.googleusercontent.com/a/ABC"), "https://lh3.googleusercontent.com/a/ABC=s128-c");
  assert.equal(perfil.fotoAlternativa("https://lh3.googleusercontent.com/a/ABC=w100-h100"), null);
  assert.equal(perfil.fotoAlternativa("https://otro.com/foto.png"), null);
  assert.equal(perfil.fotoAlternativa(null), null);
});

test("REQ-036.7 el service worker no intercepta peticiones de otros dominios", () => {
  const sw = fs.readFileSync(path.join(RAIZ, "firebase-messaging-sw.js"), "utf8");
  assert.equal(sw.indexOf("event.respondWith(fetch(event.request).catch"), -1);
});

test("REQ-036.3 la foto se vuelve a intentar al iniciar otra sesion", () => {
  assert.match(CORE, /\$scope\.fotoUsuarioFallo = false;\s*\$scope\.authUser = sesion\.usuario;/);
});

test("REQ-036.4 el menu lateral muestra el plan del usuario", () => {
  const ini = HTML.indexOf('<ul id="slide-out"');
  const lateral = HTML.slice(ini, HTML.indexOf("</ul>", ini));
  assert.match(lateral, /planDelUsuario\(\)\.nombre/);
});

test("REQ-036.5 el modal de planes destaca el plan actual", () => {
  assert.match(HTML, /Tu plan actual: <b>\{\{ planActual\.nombre \}\}<\/b>/);
  assert.match(HTML, /'plan-tarjeta-actual': planActual\.id === plan\.id/);
  assert.match(HTML, /class="plan-distintivo" ng-if="planActual\.id === plan\.id"/);
  assert.ok(CORE.indexOf('$scope.planActual = $scope.planDelUsuario();') >= 0);
});
