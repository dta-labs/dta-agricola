"use strict";

/**
 * REQ-133/134 - Tarjetas de la nevera: valor principal grande, secundario en una segunda columna, estado con su tono
 * (fondo atenuado como el listado) y un mismo diseño para temperatura/humedad, puerta, corriente, presion y caudal.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const n = require("../../assets/js/logic/nevera.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const t = (sensor, datos, indice = 0, unidad = "C") => n.tarjeta(sensor, datos, indice, unidad);

test("REQ-133 temperatura: Helado / Adecuado / Caliente con los umbrales del sensor (o 0 y 3 °C)", () => {
  const s = { type: "SHT2", alias: "Cámara 1", t: { minValue: "0", maxValue: "4" } };
  const est = (v, sensor = s) => t(sensor, ["90", v, "3.1"]).estado;
  assert.deepEqual(["-0.5", "0", "2.4", "4", "4.1", "NaN"].map(v => est(v).texto), ["Helado", "Adecuado", "Adecuado", "Adecuado", "Caliente", "Sin lectura"]);
  assert.deepEqual(["-0.5", "2.4", "4.1", "NaN"].map(v => est(v).tono), ["frio", "ok", "alerta", "inactivo"]);
  assert.deepEqual(["-1", "2", "3.5"].map(v => est(v, { id: "X" }).texto), ["Helado", "Adecuado", "Caliente"]);   // sin tipo ni umbrales
  assert.equal(t({ id: "X" }, []).rangoTexto, "Rango 0 a 3 °C (por defecto)");
});

test("REQ-133/134 temperatura grande y humedad en la segunda columna; lecturas por la clave; °F", () => {
  const datos = ["90", "2.44", "3.1", "70", "-1.2", "2.9"];
  assert.equal(n.indiceDe("S1"), 1);
  assert.equal(n.indiceDe("sensorNumber"), null);
  const b = t({ id: "B", type: "SHT2", h: { minValue: "85", maxValue: "95" } }, datos, n.indiceDe("S1"));
  assert.deepEqual([b.nombre, b.principal.valorTexto, b.principal.unidad, b.secundario.valorTexto, b.secundario.unidad, b.secundario.etiqueta, b.voltaje],
    ["B", "-1.2", "°C", "70", "% Hr", "Seca", 2.9]);
  assert.equal(t({ id: "A" }, datos).secundario.etiqueta, "Humedad");          // sin umbrales de humedad
  const f = t({ id: "A" }, datos, 0, "F");
  assert.deepEqual([f.principal.valorTexto, f.principal.unidad, f.rangoTexto], ["36.4", "°F", "Rango 32 a 37.4 °F (por defecto)"]);
});

test("REQ-134 otros tipos con el mismo diseño: puerta, corriente, presion y caudal (1 o 2 valores)", () => {
  const puerta = v => t({ type: "Contact" }, [v, "NaN", "3"]);
  assert.deepEqual([puerta("1").estado.texto, puerta("1").estado.tono, puerta("0").estado.texto, puerta("NaN").estado.texto], ["Abierta", "atencion", "Cerrada", "Sin lectura"]);
  assert.equal(puerta("1").secundario, null);
  const i = t({ type: "Irms" }, ["3.42", "3.1", "3"]);
  assert.deepEqual([i.estado.texto, i.principal.valorTexto + i.principal.unidad, i.secundario.valorTexto, i.secundario.etiqueta], ["Encendido", "3.4A", "3.1", "Corriente 2"]);
  assert.equal(t({ type: "Irms" }, ["0.1", "NaN", "3"]).estado.texto, "Apagado");
  assert.equal(t({ type: "Irms" }, ["0.1", "NaN", "3"]).secundario, null);     // un solo valor
  const psi = v => t({ type: "Psi", psi: { minValue: "20", maxValue: "60" } }, [v, "NaN", "3"]).estado.texto;
  assert.deepEqual(["12", "40", "70"].map(psi), ["Presión baja", "Normal", "Presión alta"]);
  assert.deepEqual(["0", "30"].map(v => t({ type: "Psi" }, [v, "NaN", "3"]).estado.texto), ["Sin presión", "Con presión"]);
  const fl = t({ type: "Fl", fl: { minValue: "30", maxValue: "10" } }, ["18.5", "20.1", "3"]);   // umbrales en cualquier orden
  assert.deepEqual([fl.estado.texto, fl.principal.unidad, fl.secundario.etiqueta, fl.rangoTexto], ["Normal", "L/min", "Caudal 2", "Rango 10 a 30 L/min"]);
  assert.deepEqual(["0", "5"].map(v => t({ type: "Fl" }, [v, "NaN", "3"]).estado.texto), ["Sin flujo", "Fluyendo"]);
});

test("REQ-134 la tarjeta: fondo atenuado por tono, principal y secundario en dos columnas, misma altura por fila", () => {
  const html = leer("assets", "js", "components", "sistema", "panel-nevera", "panel-nevera.html");
  assert.match(html, /ng-class="\['tono-' \+ vm\.tarjeta\(coldRoomKey, coldRoom\)\.estado\.tono, 'tipo-' \+ vm\.tarjeta\(coldRoomKey, coldRoom\)\.tipo\]"/);
  assert.ok(html.indexOf('class="nevera-principal"') < html.indexOf('class="nevera-secundario"'));
  assert.match(html, /<div class="nevera-secundario" ng-if="vm\.tarjeta\(coldRoomKey, coldRoom\)\.secundario">/);
  const css = leer("assets", "js", "components", "sistema", "paneles.css");
  assert.match(css, /\.nevera-tarjeta \{[^}]*background: var\(--nevera-fondo\);/);
  ["frio", "ok", "atencion", "alerta", "inactivo"].forEach(tono => assert.match(css, new RegExp("\\.nevera-tarjeta\\.tono-" + tono + " \\{ --nevera: #[0-9a-f]{6}; --nevera-fondo: #[0-9a-f]{6}; \\}")));
  assert.match(css, /\.nevera-tarjetas > \.col \{\n    display: flex;\n    float: none;\n    margin-left: 0 !important;/);
  assert.match(leer("assets", "css", "style.css"), /\.lista-equipos > \.col \{\n    display: flex;\n    float: none;\n    margin-left: 0 !important;/);
  assert.match(leer("index.html"), /<script src="\.\/assets\/js\/logic\/nevera\.js\?v=/);
});

test("REQ-135 la tarjeta abre la configuracion; solo queda el boton de la grafica, mas grande; titulo mayor", () => {
  const html = leer("assets", "js", "components", "sistema", "panel-nevera", "panel-nevera.html");
  assert.match(html, /<div class="nevera-tarjeta" ng-class="[^"]*"\n\s*role="button" tabindex="0" aria-label="Configurar [^"]*"\n\s*ng-click="vm\.alEditarSensor\(\{ \$sensor: coldRoom \}\)"\n\s*ng-keydown="\(\$event\.key === 'Enter' \|\| \$event\.key === ' '\) && vm\.alEditarSensor\(\{ \$sensor: coldRoom \}\)">/);
  assert.match(html, /ng-click="\$event\.stopPropagation\(\); vm\.alGrafica\(\{ \$sensor: coldRoom, \$clave: coldRoomKey \}\)"/);
  assert.doesNotMatch(html, />settings</);
  // REQ-147: ademas del de la grafica, solo el aviso "sin datos" (abre las notificaciones)
  assert.equal((html.match(/<button /g) || []).length, 2);
  assert.equal((html.match(/<button type="button" class="nevera-sin-datos"/g) || []).length, 1);
  const css = leer("assets", "js", "components", "sistema", "paneles.css");
  assert.match(css, /\.nevera-boton-grafica \{[^}]*width: 96px;[^\n]*\n    height: 36px;/);   // REQ-136: mas ancho, altura de antes
  assert.match(css, /\.nevera-nombre \{[^}]*font-size: 1\.4rem;/);
});

// ---------- REQ-148: invernadero sin rango por defecto ----------

test("REQ-148 invernadero: sin limites definidos no aplica el 0-3 °C de las neveras", () => {
  const inv = { tipoSistema: "Invernadero" };
  const sin = n.tarjeta({ id: "I1" }, [70, 24.5, 3.9], 0, "C", inv);
  assert.equal(sin.estado.nivel, "sin-limites");
  assert.equal(sin.estado.texto, "Sin límites");
  assert.equal(sin.estado.tono, "inactivo");
  assert.equal(sin.principal.valorTexto, "24.5");
  assert.equal(sin.rangoTexto, "Define los límites en la configuración");
  assert.equal(n.tarjeta({ id: "I1" }, [], 0, "C", inv).estado.nivel, "sin-dato");
  // con los limites del usuario: Helado / Adecuado / Caliente como siempre
  const con = n.tarjeta({ id: "I1", t: { minValue: "15", maxValue: "30" } }, [70, 24.5, 3.9], 0, "C", inv);
  assert.equal(con.estado.texto, "Adecuado");
  assert.equal(con.rangoTexto, "Rango 15 a 30 °C");
  assert.equal(n.tarjeta({ id: "I1", t: { minValue: "15", maxValue: "30" } }, [70, 31, 3.9], 0, "C", inv).estado.texto, "Caliente");
  // la nevera conserva su rango por defecto
  assert.equal(n.tarjeta({ id: "N1" }, [70, 24.5, 3.9], 0, "C", { tipoSistema: "Nevera" }).rangoTexto, "Rango 0 a 3 °C (por defecto)");
});

test("REQ-148 el panel pasa el tipo del sistema a la tarjeta", () => {
  const { Controlador } = require("../../assets/js/components/sistema/panel-nevera/panel-nevera.component.js");
  const vm = new Controlador({ panel: {} });
  vm.sistema = { type: "Invernadero" };
  vm.datos = [70, 24.5, 3.9];
  assert.equal(vm.tarjeta("S0", { id: "I1" }).estado.nivel, "sin-limites");
  vm.sistema = { type: "Nevera" };
  assert.equal(vm.tarjeta("S0", { id: "I1" }).estado.texto, "Caliente");
});
