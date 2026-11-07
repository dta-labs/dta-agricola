"use strict";

/**
 * REQ-052 - Lector de QR, codigos de barras y NFC (factory y componente) con dobles.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const lectorFactory = require("../../../assets/js/ui/lector.factory.js");
const { Controlador, definicion } = require("../../../assets/js/components/comunes/lector-codigo/lector-codigo.component.js");

// ---------- factory ----------

function libreriaFalsa(registro, opciones = {}) {
  function Html5Qrcode(id, config) { registro.id = id; registro.config = config; }
  Html5Qrcode.prototype.start = function (camara, ajustes, alLeer) {
    registro.ajustes = ajustes;
    registro.alLeer = alLeer;
    return opciones.fallo ? Promise.reject(opciones.fallo) : Promise.resolve();
  };
  Html5Qrcode.prototype.stop = function () { registro.detenido = (registro.detenido || 0) + 1; return Promise.resolve(); };
  Html5Qrcode.prototype.clear = function () { registro.limpiado = true; };
  const formatos = {};
  lectorFactory.FORMATOS.forEach((f, i) => { formatos[f] = i; });
  return { Html5Qrcode, Html5QrcodeSupportedFormats: formatos };
}

const ventanaConCamara = { navigator: { mediaDevices: { getUserMedia() {} } } };

test("REQ-052 camara: QR y codigos de barras, con lector nativo si existe, y recuadro ancho", async () => {
  const registro = {};
  const lector = lectorFactory.crear(() => libreriaFalsa(registro), () => ventanaConCamara);
  const leidos = [];
  const detener = await lector.iniciarCamara("visor1", t => leidos.push(t));
  assert.equal(registro.id, "visor1");
  assert.equal(registro.config.formatsToSupport.length, lectorFactory.FORMATOS.length);
  ["QR_CODE", "CODE_128", "EAN_13", "UPC_A", "DATA_MATRIX"].forEach(f => assert.ok(lectorFactory.FORMATOS.includes(f), f));
  assert.equal(registro.config.experimentalFeatures.useBarCodeDetectorIfSupported, true);
  const caja = registro.ajustes.qrbox(400, 300);
  assert.ok(caja.width > caja.height, "recuadro ancho para codigos de barras");
  registro.alLeer("  ABC-123 ");
  assert.deepEqual(leidos, ["ABC-123"]);
  await detener();
  await detener();
  assert.equal(registro.detenido, 1, "detener dos veces no falla");
  registro.alLeer("despues");
  assert.equal(leidos.length, 1, "tras detener no entrega mas lecturas");
});

test("REQ-052 camara: mensajes claros (permiso, sin HTTPS, sin libreria)", async () => {
  const sinPermiso = lectorFactory.crear(() => libreriaFalsa({}, { fallo: { name: "NotAllowedError" } }), () => ventanaConCamara);
  await assert.rejects(sinPermiso.iniciarCamara("v", () => {}), /Permite el acceso a la cámara/);
  const sinHttps = lectorFactory.crear(() => libreriaFalsa({}), () => ({ navigator: {} }));
  await assert.rejects(sinHttps.iniciarCamara("v", () => {}), /HTTPS/);
  const sinLibreria = lectorFactory.crear(() => ({}), () => ventanaConCamara);
  await assert.rejects(sinLibreria.iniciarCamara("v", () => {}), /No fue posible cargar el lector/);
});

test("REQ-052 NFC: texto, URL o numero de serie de la etiqueta", () => {
  const decodificador = () => ({ decode: datos => datos });
  assert.equal(lectorFactory.textoDeNfc({ message: { records: [{ recordType: "text", data: " S-001 " }] } }, decodificador), "S-001");
  assert.equal(lectorFactory.textoDeNfc({ message: { records: [{ recordType: "url", data: "https://x/1" }] } }, decodificador), "https://x/1");
  assert.equal(lectorFactory.textoDeNfc({ message: { records: [{ recordType: "empty" }] }, serialNumber: "04:a2:ff" }, decodificador), "04:a2:ff");
  assert.equal(lectorFactory.textoDeNfc({}, decodificador), "");
});

test("REQ-052 NFC: disponible solo con NDEFReader; escanear y detener", async () => {
  assert.equal(lectorFactory.crear(() => ({}), () => ({})).nfcDisponible(), false);
  await assert.rejects(lectorFactory.crear(() => ({}), () => ({})).leerNfc(() => {}), /no permite leer NFC/);
  let abortado = false;
  let lectorCreado = null;
  function NDEFReader() { lectorCreado = this; }
  NDEFReader.prototype.scan = function () { return Promise.resolve(); };
  function AbortController() { this.signal = {}; this.abort = () => { abortado = true; }; }
  function TextDecoder() { this.decode = d => d; }
  const lector = lectorFactory.crear(() => ({}), () => ({ NDEFReader, AbortController, TextDecoder }));
  assert.equal(lector.nfcDisponible(), true);
  const leidos = [];
  const detener = await lector.leerNfc(t => leidos.push(t));
  lectorCreado.onreading({ message: { records: [{ recordType: "text", data: "TAG-9" }] } });
  assert.deepEqual(leidos, ["TAG-9"]);
  detener();
  assert.equal(abortado, true);
});

// ---------- componente ----------

function montar(opciones = {}) {
  const registro = { leidos: [], detenidos: 0, observadores: [] };
  const $timeout = fn => Promise.resolve().then(() => fn && fn());
  const $q = { when: v => Promise.resolve(v) };
  const $window = {
    IntersectionObserver: function (cb) {
      this.observe = () => registro.observadores.push(cb);
      this.disconnect = () => { registro.desconectado = true; };
    }
  };
  const dtaLector = {
    nfcDisponible: () => !!opciones.nfc,
    iniciarCamara: (id, alLeer) => {
      registro.idVisor = id;
      registro.alLeerCamara = alLeer;
      return opciones.falloCamara ? Promise.reject(new Error(opciones.falloCamara)) : Promise.resolve(() => { registro.detenidos += 1; });
    },
    leerNfc: (alLeer) => { registro.alLeerNfc = alLeer; return Promise.resolve(() => { registro.nfcDetenido = true; }); }
  };
  const vm = new Controlador([{}], $timeout, $q, $window, dtaLector);
  vm.que = "sensor";
  vm.alLeer = l => registro.leidos.push(l.$codigo);
  vm.$onInit();
  vm.$postLink();
  return { vm, registro };
}

const esperar = () => new Promise(r => setTimeout(r, 0));

test("REQ-052 componente: definicion", () => {
  assert.deepEqual(definicion.bindings, { alLeer: "&", que: "@" });
});

test("REQ-052 componente: la camara entrega el codigo al padre y se apaga", async () => {
  const { vm, registro } = montar();
  await vm.alternarCamara();
  assert.equal(vm.camaraActiva, true);
  assert.match(registro.idVisor, /^dtaLector\d+$/);
  registro.alLeerCamara("SN-77");
  await esperar(); await esperar();
  assert.deepEqual(registro.leidos, ["SN-77"]);
  assert.equal(vm.camaraActiva, false);
  assert.equal(registro.detenidos, 1);
  assert.match(vm.mensaje, /SN-77/);
});

test("REQ-052 componente: al dejar de verse (modal cerrado) apaga la camara", async () => {
  const { vm, registro } = montar();
  await vm.alternarCamara();
  registro.observadores[0]([{ isIntersecting: false }]);
  await esperar(); await esperar();
  assert.equal(vm.camaraActiva, false);
  assert.equal(registro.detenidos, 1);
});

test("REQ-052 componente: errores de camara visibles; NFC solo si esta disponible", async () => {
  const { vm } = montar({ falloCamara: "Permite el acceso a la cámara para leer el código." });
  await vm.alternarCamara();
  assert.equal(vm.camaraActiva, false);
  assert.equal(vm.error, true);
  assert.equal(vm.nfcDisponible, false);
  const conNfc = montar({ nfc: true });
  assert.equal(conNfc.vm.nfcDisponible, true);
  await conNfc.vm.alternarNfc();
  conNfc.registro.alLeerNfc("TAG-1");
  await esperar(); await esperar();
  assert.deepEqual(conNfc.registro.leidos, ["TAG-1"]);
  assert.equal(conNfc.vm.nfcActivo, false);
  assert.equal(conNfc.registro.nfcDetenido, true);
});

test("REQ-052 componente: $onDestroy apaga todo", async () => {
  const { vm, registro } = montar();
  await vm.alternarCamara();
  vm.$onDestroy();
  assert.equal(registro.detenidos, 1);
  assert.equal(registro.desconectado, true);
});
