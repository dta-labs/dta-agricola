"use strict";

/**
 * REQ-029 - El boton "Salir" del menu de usuario debe hacer lo mismo que el del menu lateral.
 *
 * REQ-035: los dos usan ahora `salir()`, que cierra la sesion de Firebase.
 *
 * Antes: el menu lateral usaba `ng-click="showLogin()"`; el menu del avatar usaba `salirDesdeMenu()`,
 * que internamente llamaba a `logout()`. Dos caminos distintos para la misma accion.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
// Normaliza el salto de linea para que el test no dependa del sistema de ficheros.
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

/** ng-click del boton Salir del menu lateral. */
function clickDelMenuLateral() {
  const coincidencia = HTML.match(/id="signoutBtn2"[^>]*ng-click="([^"]*)"/);

  return coincidencia ? coincidencia[1] : null;
}

// REQ-035: "Salir" debe CERRAR la sesion de Firebase (antes showLogin() solo cambiaba la vista).
test("el boton Salir del menu lateral usa salir()", () => {
  assert.equal(clickDelMenuLateral(), "salir()");
});

// REQ-036: el menu de usuario se movio al menu lateral; ya no hay desplegable en el avatar.
// REQ-044: la cabecera (foto, nombre, correo, plan) abre el perfil; "Plan" vive dentro del perfil;
// sin "Cambiar de usuario".
test("REQ-044 la cabecera del menu lateral abre el perfil y no hay opciones Perfil/Plan/Cambiar de usuario", () => {
  const ini = HTML.indexOf('<ul id="slide-out"');
  const lateral = HTML.slice(ini, HTML.indexOf("</ul>", ini));
  assert.match(lateral, /<li class="usuario-cabecera sidenav-close" ng-if="authUser" ng-click="abrirPerfil\(\)"/);
  assert.match(lateral, /role="button" tabindex="0" aria-label="Abrir mi perfil"/);
  assert.equal((lateral.match(/abrirPerfil\(\)/g) || []).length, 2, "clic y teclado en la cabecera, nada mas");
  assert.doesNotMatch(lateral, /abrirPlanes\(\)/);
  assert.doesNotMatch(lateral, /cambiarDeUsuario|switch_account/);
  assert.match(lateral, /ng-click="salir\(\)"/);
});

test("REQ-044 el boton Plan esta al final del modal de perfil", () => {
  const ini = HTML.indexOf('<div id="modalMiPerfil"');
  const modal = HTML.slice(ini, HTML.indexOf('<div id="modalPlanes"', ini));
  const contenido = modal.slice(0, modal.indexOf('<div class="modal-footer">'));
  const posPlan = contenido.indexOf('ng-click="abrirPlanes()"');
  assert.ok(posPlan > 0, "falta el boton Plan en el perfil");
  assert.ok(posPlan > contenido.lastIndexOf('ng-model="perfil.'), "debe ir despues de todos los campos");
  assert.match(contenido, /Tu plan actual: <b>\{\{ planDelUsuario\(\)\.nombre \}\}<\/b>/);
});

test("REQ-044 core.js ya no tiene cambiarDeUsuario ni esCuentaGoogle, ni inyecta dtaAuth", () => {
  assert.equal(CORE.indexOf("cambiarDeUsuario"), -1);
  assert.equal(CORE.indexOf("esCuentaGoogle"), -1);
  assert.doesNotMatch(CORE, /app\.controller\("ControladorPrincipal", function \([^)]*dtaAuth/);
});

test("la barra superior ya no tiene un desplegable de usuario propio", () => {
  assert.equal(HTML.indexOf("menuUsuario"), -1);
  assert.equal(CORE.indexOf("abrirMenuUsuario"), -1);
  assert.match(HTML, /data-target="slide-out" class="sidenav-trigger avatar-usuario"/);
});

test("hay un unico boton Salir con salir() en el menu lateral", () => {
  const ini = HTML.indexOf('<ul id="slide-out"');
  const lateral = HTML.slice(ini, HTML.indexOf("</ul>", ini));
  assert.equal(lateral.split('ng-click="salir()"').length - 1, 1);
});

test("ningun boton de index.html llama a showLogin() ni a logout() para salir", () => {
  assert.doesNotMatch(HTML, /ng-click="[^"]*showLogin\(\)/);
  assert.doesNotMatch(HTML, /ng-click="[^"]*logout\(\)/);
});

test("core.js ya no define una segunda ruta de salida", () => {
  assert.equal(CORE.indexOf("$scope.salirDesdeMenu"), -1);
});

test("salir() cierra la sesion de Firebase y marca el cierre como pedido", () => {
  const ini = CORE.indexOf("$scope.salir = () => {");
  assert.ok(ini >= 0, "falta $scope.salir");
  const cuerpo = CORE.slice(ini, CORE.indexOf("$scope.logout", ini));
  assert.ok(cuerpo.indexOf("cierreDeSesionPedido = true") >= 0);
  assert.ok(cuerpo.indexOf("__auth().cerrarSesion()") >= 0);
  assert.ok(cuerpo.indexOf("removeFirebaseListeners()") >= 0);
  assert.ok(cuerpo.indexOf("limpiarSesionLocal()") >= 0);
});

test("el observador decide el nulo con la regla pura (respeta la salida pedida)", () => {
  assert.ok(CORE.indexOf("debeIgnorarSesionNula({ huboSesion: huboSesionEnEstaCarga, cierrePedido: cierreDeSesionPedido })") >= 0);
});

test("FirebaseUI ya no se carga", () => {
  assert.doesNotMatch(HTML, /firebaseui|firebase-ui/i);
});
