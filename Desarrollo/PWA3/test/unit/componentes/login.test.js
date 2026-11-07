"use strict";

/**
 * REQ-039 - Controlador de <dta-login> y factory dtaAuth, con dobles (sin navegador ni Firebase).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { Controlador, definicion } = require("../../../assets/js/components/login/login.component.js");
const authFactory = require("../../../assets/js/app/auth.factory.js");
const uiFactory = require("../../../assets/js/ui/ui.factory.js");
const login = require("../../../assets/js/logic/login.js");

// $q minimo sobre promesas nativas (when + finally es lo que usa el componente).
const $q = { when: valor => Promise.resolve(valor) };

function crearDobles(opciones = {}) {
  const llamadas = { avisos: [], abrir: 0, cerrar: 0, destruir: 0, entrar: [], alta: [], recuperar: [], google: 0 };
  const modal = { nombre: "modal-alta" };
  const $element = [{ querySelector: selector => (selector === ".login-modal-alta" ? modal : null) }];
  const dtaAuth = {
    recogerRedireccion: () => (opciones.errorRedireccion ? Promise.reject(opciones.errorRedireccion) : Promise.resolve(null)),
    accederConGoogle: () => { llamadas.google += 1; return opciones.errorGoogle ? Promise.reject(opciones.errorGoogle) : Promise.resolve(); },
    entrarConCorreo: (c, k) => { llamadas.entrar.push([c, k]); return opciones.errorEntrar ? Promise.reject(opciones.errorEntrar) : Promise.resolve(); },
    crearCuenta: (c, k) => { llamadas.alta.push([c, k]); return opciones.errorAlta ? Promise.reject(opciones.errorAlta) : Promise.resolve(); },
    recuperarContrasena: c => { llamadas.recuperar.push(c); return Promise.resolve(); },
    debeAvisar: error => login.debeAvisarError(error),
    mensajeDeError: error => login.mensajeDeError(error)
  };
  const dtaUi = {
    avisar: (texto, tipo) => llamadas.avisos.push({ texto, tipo: tipo || "warning" }),
    abrirModal: m => { assert.equal(m, modal); llamadas.abrir += 1; },
    cerrarModal: m => { assert.equal(m, modal); llamadas.cerrar += 1; },
    destruirModal: m => { assert.equal(m, modal); llamadas.destruir += 1; }
  };
  const vm = new Controlador($q, $element, dtaAuth, { login }, dtaUi);
  return { vm, llamadas };
}

async function iniciado(opciones) {
  const dobles = crearDobles(opciones);
  await dobles.vm.$onInit();
  return dobles;
}

test("REQ-039 definicion: plantilla versionada, controllerAs vm, sin bindings '='", () => {
  assert.match(definicion.templateUrl, /^\.\/assets\/js\/components\/login\/login\.html\?v=\d/);
  assert.equal(definicion.controllerAs, "vm");
  Object.values(definicion.bindings).forEach(tipo => assert.notEqual(tipo, "="));
  assert.deepEqual(Controlador.$inject, ["$q", "$element", "dtaAuth", "dtaReglas", "dtaUi"]);
});

test("REQ-039 $onInit: estado inicial y sin mensaje si no hay redireccion", async () => {
  const { vm } = await iniciado();
  assert.equal(vm.paso, "correo");
  assert.equal(vm.ocupado, false);
  assert.equal(vm.mensaje, null);
});

test("REQ-039 $onInit: el error al volver de Google se muestra (REQ-035 C-2)", async () => {
  const { vm } = await iniciado({ errorRedireccion: { code: "auth/network-request-failed" } });
  assert.deepEqual(vm.mensaje, { texto: login.mensajeDeError({ code: "auth/network-request-failed" }), tipo: "error" });
});

test("REQ-039 $onInit: cerrar la ventana de Google no muestra nada", async () => {
  const { vm } = await iniciado({ errorRedireccion: { code: "auth/popup-closed-by-user" } });
  assert.equal(vm.mensaje, null);
});

test("REQ-039 los mensajes van en la vista, no en ventanas aparte", async () => {
  const { vm, llamadas } = await iniciado({ errorEntrar: { code: "auth/wrong-password" }, errorGoogle: { code: "auth/unauthorized-domain" } });
  vm.correo = "mal";
  vm.siguiente();
  vm.correo = "qa@dtaamerica.com";
  vm.siguiente();
  vm.clave = "x";
  await vm.entrar();
  await vm.google();
  await vm.recuperar();
  assert.equal(llamadas.avisos.length, 0);
});

test("REQ-039 escribir de nuevo borra el mensaje", async () => {
  const { vm } = await iniciado();
  vm.correo = "mal";
  vm.siguiente();
  assert.ok(vm.mensaje);
  vm.limpiarMensaje();
  assert.equal(vm.mensaje, null);
});

test("REQ-039 L-2: correo invalido no avanza y avisa; valido pasa a la contrasena", async () => {
  const { vm, llamadas } = await iniciado();
  vm.correo = "no-es-correo";
  assert.equal(vm.siguiente(), false);
  assert.equal(vm.paso, "correo");
  assert.equal(vm.mensaje.tipo, "error");
  vm.correo = "qa@dtaamerica.com";
  assert.equal(vm.siguiente(), true);
  assert.equal(vm.paso, "contrasena");
  assert.equal(vm.mensaje, null);
  assert.equal(llamadas.avisos.length, 0);
});

test("REQ-039 Enter: en el paso 1 avanza, en el paso 2 entra", async () => {
  const { vm, llamadas } = await iniciado();
  vm.correo = " qa@dtaamerica.com ";
  await vm.enviar();
  assert.equal(vm.paso, "contrasena");
  assert.equal(llamadas.entrar.length, 0);
  vm.clave = "secreta";
  await vm.enviar();
  assert.deepEqual(llamadas.entrar, [["qa@dtaamerica.com", "secreta"]]);
});

test("REQ-039 L-3: error al entrar muestra el mensaje de logic/login.js y libera el boton", async () => {
  const { vm, llamadas } = await iniciado({ errorEntrar: { code: "auth/wrong-password" } });
  vm.correo = "qa@dtaamerica.com";
  vm.paso = "contrasena";
  vm.clave = "mala";
  await vm.entrar();
  assert.deepEqual(vm.mensaje, { texto: login.mensajeDeError({ code: "auth/wrong-password" }), tipo: "error" });
  assert.equal(vm.ocupado, false);
});

test("REQ-039 L-3: sin contrasena no llama a Firebase", async () => {
  const { vm, llamadas } = await iniciado();
  vm.correo = "qa@dtaamerica.com";
  vm.paso = "contrasena";
  await vm.entrar();
  assert.equal(llamadas.entrar.length, 0);
  assert.equal(vm.mensaje.tipo, "error");
});

test("REQ-039 doble envio: mientras hay una peticion en curso no se lanza otra", async () => {
  const { vm, llamadas } = await iniciado();
  vm.correo = "qa@dtaamerica.com";
  vm.clave = "x";
  const primera = vm.entrar();
  const segunda = vm.entrar();
  await Promise.all([primera, segunda]);
  assert.equal(llamadas.entrar.length, 1);
});

test("REQ-039 atras vuelve al correo y borra la contrasena", async () => {
  const { vm } = await iniciado();
  vm.paso = "contrasena";
  vm.clave = "x";
  vm.atras();
  assert.equal(vm.paso, "correo");
  assert.equal(vm.clave, "");
});

test("REQ-039 L-1: Google llama a dtaAuth y avisa sus errores", async () => {
  const { vm, llamadas } = await iniciado({ errorGoogle: { code: "auth/unauthorized-domain" } });
  await vm.google();
  assert.equal(llamadas.google, 1);
  assert.equal(vm.mensaje.tipo, "error");
});

test("REQ-039 L-4: recuperar sin correo avisa y no llama a Firebase; con correo, aviso de exito", async () => {
  const { vm, llamadas } = await iniciado();
  await vm.recuperar();
  assert.equal(llamadas.recuperar.length, 0);
  vm.correo = " qa@dtaamerica.com ";
  await vm.recuperar();
  assert.deepEqual(llamadas.recuperar, ["qa@dtaamerica.com"]);
  assert.equal(vm.mensaje.tipo, "exito");
});

test("REQ-039 L-5: alta abre el modal con el correo ya escrito, crea la cuenta y cierra", async () => {
  const { vm, llamadas } = await iniciado();
  vm.correo = "nuevo@dtaamerica.com";
  vm.abrirAlta();
  assert.equal(llamadas.abrir, 1);
  assert.equal(vm.alta.correo, "nuevo@dtaamerica.com");
  vm.alta.clave = "123456";
  await vm.crearCuenta();
  assert.deepEqual(llamadas.alta, [["nuevo@dtaamerica.com", "123456"]]);
  assert.equal(llamadas.cerrar, 1);
  assert.deepEqual(vm.mensaje, { texto: "Cuenta creada correctamente.", tipo: "exito" });
});

test("REQ-039 L-5: alta con correo invalido no llama a Firebase; error de Firebase no cierra el modal", async () => {
  const { vm, llamadas } = await iniciado({ errorAlta: { code: "auth/email-already-in-use" } });
  vm.alta = { correo: "mal", clave: "x" };
  await vm.crearCuenta();
  assert.equal(llamadas.alta.length, 0);
  assert.ok(vm.mensajeAlta);
  vm.alta = { correo: "ya@existe.com", clave: "123456" };
  await vm.crearCuenta();
  assert.equal(llamadas.alta.length, 1);
  assert.equal(llamadas.cerrar, 0);
  assert.equal(vm.mensajeAlta, login.mensajeDeError({ code: "auth/email-already-in-use" }));
});

test("REQ-039 $onDestroy retira el modal de alta", async () => {
  const { vm, llamadas } = await iniciado();
  vm.$onDestroy();
  assert.equal(llamadas.destruir, 1);
});

// ---------- dtaAuth con un doble de firebase ----------

function firebaseFalso() {
  const usado = [];
  function Proveedor() { this.parametros = null; }
  Proveedor.prototype.setCustomParameters = function (p) { this.parametros = p; };
  const auth = {
    signInWithPopup: () => { usado.push("popup"); return Promise.resolve(); },
    signInWithRedirect: () => { usado.push("redirect"); return Promise.resolve(); },
    getRedirectResult: () => Promise.resolve({ user: { email: "qa@dtaamerica.com" } }),
    signInWithEmailAndPassword: (c, k) => { usado.push(["correo", c, k]); return Promise.resolve(); },
    createUserWithEmailAndPassword: (c, k) => { usado.push(["alta", c, k]); return Promise.resolve(); },
    sendPasswordResetEmail: c => { usado.push(["recuperar", c]); return Promise.resolve(); }
  };
  const sdk = { auth: () => auth, app: () => ({ options: { authDomain: "dta-agricola.web.app" } }) };
  sdk.auth.GoogleAuthProvider = Proveedor;
  return { sdk, usado };
}

const consolaMuda = { info() {}, error() {}, warn() {} };

test("REQ-039 dtaAuth: popup en local y redireccion en hosting", async () => {
  const local = firebaseFalso();
  await authFactory.crear(local.sdk, login, { host: "localhost:8090" }, consolaMuda).accederConGoogle();
  assert.deepEqual(local.usado, ["popup"]);
  const hosting = firebaseFalso();
  await authFactory.crear(hosting.sdk, login, { host: "dta-agricola.web.app" }, consolaMuda).accederConGoogle();
  assert.deepEqual(hosting.usado, ["redirect"]);
});

test("REQ-039 dtaAuth: correo, alta y recuperar pasan los datos tal cual", async () => {
  const { sdk, usado } = firebaseFalso();
  const auth = authFactory.crear(sdk, login, { host: "localhost" }, consolaMuda);
  await auth.entrarConCorreo("a@b.co", "1");
  await auth.crearCuenta("c@d.co", "2");
  await auth.recuperarContrasena("e@f.co");
  assert.deepEqual(usado, [["correo", "a@b.co", "1"], ["alta", "c@d.co", "2"], ["recuperar", "e@f.co"]]);
  assert.equal((await auth.recogerRedireccion()).user.email, "qa@dtaamerica.com");
});

test("REQ-039 dtaAuth: exige firebase y reglas", () => {
  assert.throws(() => authFactory.crear(null, login), /firebase/);
  assert.throws(() => authFactory.crear(firebaseFalso().sdk, null), /reglas/);
});

// ---------- dtaUi con dobles de swal y M ----------

test("REQ-038 dtaUi: avisar usa swal; sin swal no falla", () => {
  const vistos = [];
  const ui = uiFactory.crear(() => opciones => vistos.push(opciones), () => null, consolaMuda);
  ui.avisar("Hola", "success");
  ui.avisar("");
  assert.deepEqual(vistos, [{ title: "Hola", icon: "success" }]);
  uiFactory.crear(() => undefined, () => null, consolaMuda).avisar("sin swal");
});

test("REQ-038 dtaUi: inicializa el modal al abrirlo y lo destruye", () => {
  const eventos = [];
  const instancias = new Map();
  const M = {
    Modal: {
      getInstance: el => instancias.get(el),
      init: el => {
        const inst = { open: () => eventos.push("open"), close: () => eventos.push("close"), destroy: () => { eventos.push("destroy"); instancias.delete(el); } };
        instancias.set(el, inst);
        eventos.push("init");
        return inst;
      }
    }
  };
  const ui = uiFactory.crear(() => null, () => M, consolaMuda);
  const el = {};
  assert.equal(ui.abrirModal(el), true);
  ui.abrirModal(el);
  ui.cerrarModal(el);
  ui.destruirModal(el);
  ui.destruirModal(el);
  assert.deepEqual(eventos, ["init", "open", "open", "close", "destroy"]);
  assert.equal(ui.abrirModal(null), false);
});
