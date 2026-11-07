"use strict";

/**
 * REQ-051 - <dta-mapa-selector> con un mapa falso (sin Leaflet ni navegador).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { Controlador, definicion } = require("../../../assets/js/components/comunes/mapa-selector/mapa-selector.component.js");
const mapaFactory = require("../../../assets/js/ui/mapa.factory.js");
const geo = require("../../../assets/js/logic/geo.js");

const $q = { when: v => Promise.resolve(v) };
const $timeout = fn => fn();

function montar(bindings, opciones = {}) {
  const registro = { lienzo: null, dibujos: [], encuadres: [], emitidos: [], destruido: false };
  const dtaMapa = {
    crearLienzo: (contenedor, op, eventos) => {
      registro.opciones = op;
      registro.eventos = eventos;
      registro.lienzo = {
        mostrarPunto: p => registro.dibujos.push(["punto", p]),
        mostrarPoligono: pts => registro.dibujos.push(["poligono", pts.map(x => x.slice())]),
        encuadrar: o => registro.encuadres.push(o),
        destruir: () => { registro.destruido = true; }
      };
      return registro.lienzo;
    },
    ubicacionActual: () => (opciones.errorUbicacion ? Promise.reject(new Error(opciones.errorUbicacion)) : Promise.resolve(opciones.ubicacion || { lat: 28.5, lng: -106.1, precision: 8 }))
  };
  const $element = [{ querySelector: sel => (sel === ".mapa-lienzo" ? { lienzo: true } : null) }];
  const vm = new Controlador($element, $timeout, $q, dtaMapa, { geo });
  Object.assign(vm, bindings);
  vm.alCambiar = locales => registro.emitidos.push(locales);
  vm.$onInit();
  vm.$postLink();
  return { vm, registro };
}

test("REQ-051 definicion: entradas de una via y salida al-cambiar", () => {
  assert.deepEqual(definicion.bindings, { modo: "@", latitud: "<", longitud: "<", poligono: "<", centroLat: "<", centroLng: "<", alCambiar: "&" });
  assert.match(definicion.templateUrl, /mapa-selector\.html\?v=\d/);
});

test("REQ-051 punto: tocar el mapa fija la posicion y la entrega al padre", () => {
  const { vm, registro } = montar({ modo: "punto", latitud: "", longitud: "", centroLat: 28.6, centroLng: -106.0 });
  assert.deepEqual(registro.opciones.centro, { lat: 28.6, lng: -106 });
  assert.deepEqual(registro.encuadres.at(-1), { centro: { lat: 28.6, lng: -106 } });
  registro.eventos.alTocar(28.6321234, -106.0691234);
  assert.deepEqual(registro.emitidos.at(-1), { $lat: 28.632123, $lng: -106.069123 });
  assert.equal(vm.latTexto, "28.632123");
  assert.deepEqual(registro.dibujos.at(-1), ["punto", { lat: 28.632123, lng: -106.069123 }]);
});

test("REQ-051 punto: arrastrar el marcador y escribir coordenadas (validas e invalidas)", () => {
  const { vm, registro } = montar({ modo: "punto", latitud: 28.5, longitud: -106.1 });
  assert.deepEqual(registro.encuadres.at(-1), { punto: { lat: 28.5, lng: -106.1 } });
  registro.eventos.alMoverPunto(28.51, -106.11);
  assert.deepEqual(registro.emitidos.at(-1), { $lat: 28.51, $lng: -106.11 });
  vm.latTexto = "95";
  vm.lngTexto = "-106";
  vm.alEscribir();
  assert.match(vm.mensaje, /Latitud entre -90 y 90/);
  assert.equal(registro.emitidos.length, 1);
  vm.latTexto = "28,7";
  vm.lngTexto = "-106.2";
  vm.alEscribir();
  assert.deepEqual(registro.emitidos.at(-1), { $lat: 28.7, $lng: -106.2 });
  assert.equal(vm.mensaje, null);
});

test("REQ-051 poligono: tocar agrega esquinas, deshacer y borrar; entrega [[lat,lng]] al padre", () => {
  const { vm, registro } = montar({ modo: "poligono", poligono: "" });
  assert.equal(vm.ayudaAbierta, true, "sin poligono la ayuda se abre sola");
  assert.equal(vm.faltan(), 3);
  registro.eventos.alTocar(28.60, -106.08);
  registro.eventos.alTocar(28.61, -106.08);
  assert.equal(vm.faltan(), 1);
  registro.eventos.alTocar(28.61, -106.07);
  assert.equal(vm.faltan(), 0);
  assert.match(vm.area(), /ha$/);
  assert.deepEqual(registro.emitidos.at(-1), { $poligono: [[28.6, -106.08], [28.61, -106.08], [28.61, -106.07]] });
  registro.eventos.alMoverVertice(0, 28.599, -106.081);
  assert.deepEqual(registro.emitidos.at(-1).$poligono[0], [28.599, -106.081]);
  vm.deshacer();
  assert.equal(registro.emitidos.at(-1).$poligono.length, 2);
  vm.borrarTodo();
  assert.deepEqual(registro.emitidos.at(-1), { $poligono: [] });
  assert.equal(vm.ayudaAbierta, true);
});

test("REQ-051 poligono: lee el formato guardado (texto en los pares) y encuadra a la parcela", () => {
  const guardado = [["28.6", "-106.08"], ["28.61", "-106.08"], ["28.61", "-106.07"]];
  const { vm, registro } = montar({ modo: "poligono", poligono: guardado });
  assert.equal(vm.ayudaAbierta, false);
  assert.deepEqual(registro.dibujos[0], ["poligono", [[28.6, -106.08], [28.61, -106.08], [28.61, -106.07]]]);
  assert.deepEqual(registro.encuadres.at(-1).puntos.length, 3);
});

test("REQ-051 $onChanges: otro valor del padre redibuja; el eco del propio cambio no", () => {
  const { vm, registro } = montar({ modo: "punto", latitud: 28.5, longitud: -106.1 });
  const encuadresAntes = registro.encuadres.length;
  registro.eventos.alTocar(28.52, -106.12);
  vm.latitud = 28.52; vm.longitud = -106.12;          // el padre guarda lo que se le entrego
  vm.$onChanges({ latitud: {}, longitud: {} });
  assert.equal(registro.encuadres.length, encuadresAntes, "eco: no re-encuadra");
  vm.latitud = 27.0; vm.longitud = -105.0;              // otro sensor
  vm.$onChanges({ latitud: {}, longitud: {} });
  assert.deepEqual(registro.encuadres.at(-1), { punto: { lat: 27, lng: -105 } });
});

test("REQ-051 mi ubicacion: punto se coloca; en poligono agrega una esquina; avisa precision y errores", async () => {
  const punto = montar({ modo: "punto" }, { ubicacion: { lat: 28.4, lng: -106.2, precision: 80 } });
  await punto.vm.miUbicacion();
  assert.deepEqual(punto.registro.emitidos.at(-1), { $lat: 28.4, $lng: -106.2 });
  assert.match(punto.vm.mensaje, /±80 m/);
  assert.equal(punto.vm.buscando, false);
  const poligono = montar({ modo: "poligono" });
  await poligono.vm.miUbicacion();
  assert.equal(poligono.registro.emitidos.at(-1).$poligono.length, 1);
  const fallo = montar({ modo: "punto" }, { errorUbicacion: "Permite el acceso a tu ubicación" });
  await fallo.vm.miUbicacion();
  assert.match(fallo.vm.mensaje, /Permite el acceso/);
});

test("REQ-051 $onDestroy destruye el mapa", () => {
  const { vm, registro } = montar({ modo: "punto" });
  vm.$onDestroy();
  assert.equal(registro.destruido, true);
});

test("REQ-051 dtaMapa.ubicacionActual: sin geolocalizacion rechaza con un mensaje claro", async () => {
  const mapa = mapaFactory.crear(() => null, () => ({}), () => ({}));
  await assert.rejects(mapa.ubicacionActual(), /no permite obtener la ubicación/);
  const conPermisoDenegado = mapaFactory.crear(() => null, () => ({ geolocation: { getCurrentPosition: (ok, error) => error({ code: 1 }) } }), () => ({}));
  await assert.rejects(conPermisoDenegado.ubicacionActual(), /Permite el acceso/);
  assert.equal(mapa.crearLienzo(null, {}, {}), null);
});

test("REQ-051 la plantilla siempre ofrece la ayuda visual en modo poligono", () => {
  const plantilla = fs.readFileSync(path.join(__dirname, "..", "..", "..", "assets", "js", "components", "comunes", "mapa-selector", "mapa-selector.html"), "utf8");
  assert.match(plantilla, /<div class="mapa-ayuda" ng-if="vm\.esPoligono">/);
  assert.match(plantilla, /<svg class="mapa-ayuda-dibujo"/);
  assert.match(plantilla, /Toca la primera esquina de la parcela/);
});
