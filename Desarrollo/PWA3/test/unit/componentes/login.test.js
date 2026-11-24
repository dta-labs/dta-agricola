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
  vm.alta.clave = "riego2026";
  vm.alta.confirmacion = "riego2026";   // REQ-164: confirmada
  await vm.crearCuenta();
  assert.deepEqual(llamadas.alta, [["nuevo@dtaamerica.com", "riego2026"]]);
  assert.equal(llamadas.cerrar, 1);
  // REQ-167: no se entra hasta verificar el correo; el acceso queda en el paso de la contrasena con el correo
  assert.equal(vm.mensaje.tipo, "exito");
  assert.match(vm.mensaje.texto, /^Cuenta creada/);
  assert.deepEqual([vm.correo, vm.paso], ["nuevo@dtaamerica.com", "contrasena"]);
});

test("REQ-039 L-5: alta con correo invalido no llama a Firebase; error de Firebase no cierra el modal", async () => {
  const { vm, llamadas } = await iniciado({ errorAlta: { code: "auth/email-already-in-use" } });
  vm.alta = { correo: "mal", clave: "x" };
  await vm.crearCuenta();
  assert.equal(llamadas.alta.length, 0);
  assert.ok(vm.mensajeAlta);
  vm.alta = { correo: "ya@existe.com", clave: "riego2026", confirmacion: "riego2026" };
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

// ---------- REQ-164: alta con confirmacion de contrasena y recuperacion ----------

test("REQ-164 alta: contrasena de 6+ caracteres con letras y numeros, confirmada; no llama a Firebase si no", async () => {
  assert.equal(login.validarAlta("a@b.com", "", ""), "Escribe una contraseña.");
  assert.equal(login.validarAlta("a@b.com", "ab1", "ab1"), "La contraseña debe tener al menos 6 caracteres.");
  assert.equal(login.validarAlta("a@b.com", "abcdefg", "abcdefg"), "Usa letras y números en la contraseña.");
  assert.equal(login.validarAlta("a@b.com", " riego2026", " riego2026"), "La contraseña no puede empezar ni terminar con espacios.");
  assert.equal(login.validarAlta("a@b.com", "riego2026", "riego2025"), "Las contraseñas no coinciden.");
  assert.equal(login.validarAlta("a@b.com", "riego2026", "riego2026"), "");
  assert.deepEqual(["", "ab", "riego1", "Riego2026!x"].map(login.fuerzaDeClave), [0, 1, 1, 3]);
  const { vm, llamadas } = await iniciado();
  vm.alta = { correo: "nuevo@dtaamerica.com", clave: "riego2026", confirmacion: "otra2026" };
  await vm.crearCuenta();
  assert.equal(llamadas.alta.length, 0);
  assert.equal(vm.mensajeAlta, "Las contraseñas no coinciden.");
  const html = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "..", "..", "assets", "js", "components", "login", "login.html"), "utf8");
  assert.match(html, /id="loginAltaConfirmacion"/);
  // REQ-166: casilla "Mostrar contraseñas" debajo (antes un ojo dentro del campo)
  assert.match(html, /<input type="checkbox" class="filled-in" ng-model="vm\.verClave">\s*<span>Mostrar contraseñas<\/span>/);
  assert.doesNotMatch(html, /login-ver-clave/);
  const css = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "..", "..", "assets", "css", "style.css"), "utf8");
  assert.match(css, /-webkit-background-clip: text !important;/);   // autocompletado: sin el fondo celeste
  assert.match(css, /\.login-modal-alta input:-webkit-autofill,/);
});

test("REQ-164 dtaAuth: correos en espanol, recuperar con regreso a la app (y sin el si no esta autorizado), verificacion al crear", async () => {
  const usado = [];
  let rechazarRegreso = false;
  const usuario = { sendEmailVerification: (a) => { usado.push(["verificar", a && a.url]); return Promise.resolve(); } };
  const auth = {
    createUserWithEmailAndPassword: (c, k) => { usado.push(["alta", c, k]); return Promise.resolve({ user: usuario }); },
    signOut: () => { usado.push(["salir"]); return Promise.resolve(); },
    sendPasswordResetEmail: (c, a) => {
      usado.push(["recuperar", c, a && a.url]);
      if (rechazarRegreso && a) return Promise.reject({ code: "auth/unauthorized-continue-uri" });
      return Promise.resolve();
    }
  };
  function Proveedor() {}
  Proveedor.prototype.setCustomParameters = function () {};
  const sdk = { auth: Object.assign(() => auth, { GoogleAuthProvider: Proveedor }), app: () => ({ options: {} }) };
  const silencio = { info() {}, error() {} };
  const dta = authFactory.crear(sdk, login, { host: "dta-agricola.web.app", origin: "https://dta-agricola.web.app" }, silencio);
  assert.equal(auth.languageCode, "es");
  await dta.recuperarContrasena("a@b.co");
  assert.deepEqual(usado.pop(), ["recuperar", "a@b.co", "https://dta-agricola.web.app/index.html"]);
  rechazarRegreso = true;
  await dta.recuperarContrasena("a@b.co");
  assert.deepEqual(usado.slice(-2), [["recuperar", "a@b.co", "https://dta-agricola.web.app/index.html"], ["recuperar", "a@b.co", undefined]]);
  const r = await dta.crearCuenta("n@b.co", "riego2026");
  assert.equal(r.verificacion, true);
  assert.deepEqual(usado.slice(-3), [["alta", "n@b.co", "riego2026"], ["verificar", "https://dta-agricola.web.app/index.html"], ["salir"]]);   // REQ-167: sale
});

// ---------- REQ-167: no se entra sin verificar el correo ----------

test("REQ-167 cuentas de correo nuevas sin verificar no entran; las anteriores, las verificadas y las de Google si", () => {
  const nueva = { email: "a@b.co", emailVerified: false, providerData: [{ providerId: "password" }], metadata: { creationTime: "Tue, 24 Nov 2026 23:50:00 GMT" } };
  assert.equal(login.requiereVerificacion(nueva), true);
  assert.equal(login.requiereVerificacion({ ...nueva, emailVerified: true }), false);
  assert.equal(login.requiereVerificacion({ ...nueva, metadata: { creationTime: "Mon, 10 Mar 2025 10:00:00 GMT" } }), false);   // antiguas
  assert.equal(login.requiereVerificacion({ ...nueva, providerData: [{ providerId: "google.com" }] }), false);
  assert.equal(login.requiereVerificacion(null), false);
  assert.match(login.mensajeDeError({ code: "dta/correo-sin-verificar" }), /^Tu correo aún no está verificado/);
});

test("REQ-167 dtaAuth: entrar sin verificar cierra la sesion y rechaza; reenviar envia el enlace y sale", async () => {
  const usado = [];
  const usuario = { email: "a@b.co", emailVerified: false, providerData: [{ providerId: "password" }], metadata: { creationTime: "Tue, 24 Nov 2026 23:50:00 GMT" },
    sendEmailVerification: () => { usado.push("verificar"); return Promise.resolve(); } };
  const auth = {
    signInWithEmailAndPassword: () => { usado.push("entrar"); return Promise.resolve({ user: usuario }); },
    signOut: () => { usado.push("salir"); return Promise.resolve(); }
  };
  function Proveedor() {}
  Proveedor.prototype.setCustomParameters = function () {};
  const sdk = { auth: Object.assign(() => auth, { GoogleAuthProvider: Proveedor }), app: () => ({ options: {} }) };
  const dta = authFactory.crear(sdk, login, { host: "x.web.app", origin: "https://x.web.app" }, { info() {}, error() {} });
  await assert.rejects(dta.entrarConCorreo("a@b.co", "riego2026"), { code: "dta/correo-sin-verificar" });
  assert.deepEqual(usado, ["entrar", "salir"]);
  await dta.reenviarVerificacion("a@b.co", "riego2026");
  assert.deepEqual(usado.slice(2), ["entrar", "verificar", "salir"]);
  const core = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "..", "..", "assets", "js", "core.js"), "utf8");
  assert.match(core, /reglasLogin\(\)\.requiereVerificacion\(sesion\.usuario\)\) \{[\s\S]{0,250}__auth\(\)\.cerrarSesion\(\)/);
});
