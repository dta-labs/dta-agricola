"use strict";

/**
 * REQ-109 - Aspecto de producto: resumen humano de cada equipo, fechas, barra superior, tarjetas y botones flotantes.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const r = require("../../assets/js/logic/resumen.js");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const reglas = { panel: require("../../assets/js/logic/panel.js"), humedad: require("../../assets/js/logic/humedad.js"), medidor: require("../../assets/js/logic/medidor.js") };
const ok = { voltage: "true", safety: "true", commDelay: "-1", status: "ON", position: "237", speed: "45", update: "20261120 09:48" };

test("REQ-109 fecha corta: con o sin dos puntos y con am/pm (sin '09::48')", () => {
  assert.deepEqual(r.fechaCorta("20261120 09:48"), { dia: "20/11", hora: "09:48", anio: "2026" });
  assert.equal(r.fechaCorta("20261120 0948").hora, "09:48");
  assert.equal(r.fechaCorta("20221021 0450pm").hora, "16:50");
  assert.equal(r.fechaCorta("20221021 1205am").hora, "00:05");
  assert.equal(r.fechaCorta("20221021 1230pm").hora, "12:30");
  assert.deepEqual(r.fechaCorta(""), { dia: "", hora: "", anio: "" });
  assert.doesNotMatch(HTML, /update\.substring\(9, 11\) \+ ':' \+ actualSystem\.log\.update\.substring\(11\)/);
});

test("REQ-109 pivote: operando, detenido, emergencias y sin comunicacion", () => {
  const e = s => r.resumenDeEquipo(s, reglas);
  assert.deepEqual([e({ type: "PC", status: "ON", log: ok }).linea, e({ type: "PC", status: "ON", log: ok }).mensaje, e({ type: "PC", status: "ON", log: ok }).estado],
    ["Operando (237°) · Velocidad 45 %", "Sin alertas", "ok"]);
  assert.equal(e({ type: "PC", status: "ON", log: Object.assign({}, ok, { presion: "32" }) }).mensaje, "Sin alertas · 32 psi");
  assert.equal(e({ type: "PC", status: "OFF", log: ok }).estado, "inactivo");
  assert.deepEqual([e({ type: "PC", status: "ON", log: Object.assign({}, ok, { voltage: "false" }) }).estado, e({ type: "PC", status: "ON", log: Object.assign({}, ok, { voltage: "false" }) }).mensaje],
    ["emergencia", "Falla eléctrica"]);
  assert.equal(e({ type: "PC", status: "ON", log: Object.assign({}, ok, { safety: "false" }) }).estado, "emergencia");
  assert.equal(e({ type: "PC", status: "ON", log: Object.assign({}, ok, { commDelay: "12" }) }).mensaje, "Sin comunicación");
  assert.equal(e({ type: "PL", status: "ON", log: ok }).linea, "Operando (237 %) · Velocidad 45 %");
  assert.deepEqual(e({ type: "PC", status: "ON", log: ok }).fecha, { dia: "20/11", hora: "09:48", anio: "2026" });
});

test("REQ-109 estacionario y pozo: sectores regando, confirmaciones pendientes, detenido", () => {
  const est = { type: "Estacionario", status: "ON", plots: { p0: { name: "Nogal norte", forcedStart: "1" }, p1: {}, p3: { forcedStart: 1 } }, log: { activeSectors: "[0,1,0,1,0,0,0,0]" } };
  const a = r.resumenDeEquipo(est, reglas);
  assert.deepEqual([a.estado, a.linea, a.mensaje], ["atencion", "Regando Sector 2 y Sector 4", "Esperando confirmación"]);
  const b = r.resumenDeEquipo({ type: "Estacionario", status: "ON", plots: { p1: {} }, log: { activeSectors: "[0,1,0,0,0,0,0,0]" } }, reglas);
  assert.deepEqual([b.estado, b.linea], ["ok", "Regando Sector 2"]);
  assert.equal(r.resumenDeEquipo({ type: "Estacionario", status: "OFF", plots: {} }, reglas).estado, "inactivo");
  assert.equal(r.resumenDeEquipo({ type: "Pozo", status: "ON", log: { presion: "40" } }, reglas).linea, "Bombeando · 40 psi");
});

test("REQ-109 red de sensores y nevera: helada, suelo seco, estres, sin reportar y estable", () => {
  const red = (ms, t, extra) => r.resumenDeEquipo({ type: "Sensor", tempUnit: "C",
    sensors: { S0: { id: "a", alias: "Nogal", type: "WM", t: { minValue: 2, maxValue: 30 } } },
    log: { dataRaw: JSON.stringify([ms, 50, 0, 0, t, 0, 0, 3.3]), date: "20261120 0948am" } }, reglas, extra);
  assert.deepEqual([red(32, 15).estado, red(32, 15).mensaje, red(32, 15).linea], ["ok", "Sin alertas", "1 sensor · 15 °C · Humedad adecuada"]);
  assert.deepEqual([red(150, 15).estado, red(150, 15).mensaje], ["atencion", "Suelo seco en Nogal"]);
  assert.equal(red(80, 15).mensaje, "Programar riego");
  assert.deepEqual([red(150, 1).estado, red(150, 1).mensaje], ["emergencia", "Helada en Nogal"], "la helada manda");
  assert.equal(red(32, 15, { lecturaVieja: true, antiguedad: "hace 2 d" }).mensaje, "Sin reportar hace 2 d");
  const nev = t => r.resumenDeEquipo({ type: "Nevera", sensors: { S0: { id: "x", alias: "Cámara", t: { minValue: 0, maxValue: 8 } } }, log: { dataRaw: JSON.stringify([0, 60, 0, 0, t, 0, 0, 3]) } }, reglas);
  assert.deepEqual([nev(4.2).estado, nev(4.2).linea], ["ok", "4.2 °C · Estable"]);
  assert.deepEqual([nev(19.6).estado, nev(19.6).mensaje], ["emergencia", "Temperatura fuera de rango"]);
});

test("REQ-109 barra superior en dos lineas sin cortes; el boton de mapa/mosaico ya no esta en ella", () => {
  const ini = HTML.indexOf('<div id="top-navbar"');
  const barra = HTML.slice(ini, HTML.indexOf("<!-- Contenido -->", ini));
  ["barra-izquierda", "barra-centro", "barra-derecha", 'class="barra-titulo"', "relojDelListado", "Último reporte"].forEach(x => assert.ok(barra.includes(x), x));
  assert.doesNotMatch(barra, /toggleSensorMapView|class="[^"]*\blimitar\b/);
  assert.doesNotMatch(CORE, /getElementById\("top-navbar"\)\.style/);
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.barra-superior \.barra-titulo \{[^}]*font-size: clamp\(/);
});

test("REQ-109 tarjetas del listado: solidas, resumen, fecha y hora bajo el clima, sin fechas crudas", () => {
  const ini = HTML.indexOf('ng-repeat="system in systems"');
  const tarjeta = HTML.slice(ini, HTML.indexOf("</a>", HTML.indexOf('class="tarjeta-equipo-lateral"', ini)));
  assert.match(tarjeta, /class="tarjeta-equipo" ng-class="'estado-' \+ resumenDeEquipo\(system\)\.estado">/);
  ["resumenDeEquipo(system).linea", "resumenDeEquipo(system).mensaje", "resumenDeEquipo(system).fecha.dia", "resumenDeEquipo(system).fecha.hora", 'id="pos_{{ system.key }}"']
    .forEach(x => assert.ok(tarjeta.includes(x), x));
  assert.doesNotMatch(tarjeta, /substring\(|getSystemBackgroundColor|«/);
  const lateral = tarjeta.slice(tarjeta.indexOf("tarjeta-equipo-lateral"));
  assert.ok(lateral.indexOf("iconUrl") < lateral.indexOf("fecha.dia") && lateral.indexOf("fecha.dia") < lateral.indexOf("fecha.hora"));
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.tarjeta-equipo \{[^}]*border-left: 7px solid var\(--estado\);[^}]*background: var\(--estado-fondo, #ffffff\);/);
});

test("REQ-109 botones flotantes por vista y barra de opciones solo en el mapa de sensores", () => {
  assert.match(HTML, /class="btn-floating btn-large boton-vista-sensores ng-hide"[\s\S]*?ng-show="authUser && selectedWindow == 'sistema' && actualSystem\.type == 'Sensor'" ng-click="toggleSensorMapView\(\)"/);
  const panel = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "panel-sensores", "panel-sensores.html"), "utf8");
  assert.match(panel, /<div class="col s12" ng-show="!vm\.mostrarLista">\s*<div class="row statusBar panel-s-e11">/);
});

test("REQ-110 mensajes cortos (si no, generico por nivel) y 'Sin alertas' siempre con el check", () => {
  const red = (alias, ms, t) => r.resumenDeEquipo({ type: "Sensor", tempUnit: "C",
    sensors: { S0: { id: "a", alias, type: "WM", t: { minValue: 2, maxValue: 30 } } },
    log: { dataRaw: JSON.stringify([ms, 50, 0, 0, t, 0, 0, 3.3]), date: "20261120 0948am" } }, reglas);
  assert.equal(red("Nogal del bajío oriente", 150, 15).mensaje, "Requiere atención");
  assert.equal(red("Nogal del bajío oriente", 150, 1).mensaje, "Acción inmediata");
  const todos = [red("N", 32, 15), r.resumenDeEquipo({ type: "PC", status: "ON", log: ok }, reglas), r.resumenDeEquipo({ type: "PC", status: "OFF", log: ok }, reglas)];
  todos.forEach(x => { assert.match(x.mensaje, /^Sin alertas/); assert.equal(x.icono, "check_circle"); });
  [red("N", 150, 15), red("N", 150, 1)].forEach(x => assert.ok(x.mensaje.length <= 26));
});

test("REQ-110 estacionario: valvulas y motor con su estado en la tarjeta", () => {
  const x = r.resumenDeEquipo({ type: "Estacionario", status: "ON", plots: { p0: { forcedStart: "1" }, p1: {}, p3: { forcedStart: 1 }, p7: {} },
    log: { activeSectors: "[0,1,0,1,0,0,0,0]" } }, reglas);
  assert.deepEqual(x.valvulas.map(v => [v.texto, v.estado, v.motor]), [["1", "pendiente", false], ["2", "encendido", false], ["4", "encendido", false], ["M", "apagado", true]]);
  assert.match(HTML, /ng-repeat="v in resumenDeEquipo\(system\)\.valvulas track by v\.clave" class="valvula"/);
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.tarjeta-equipo\.estado-ok \{ --estado: #[0-9a-f]{6}; --estado-fondo: #[0-9a-f]{6}; \}/, "fondo tenue del estado");
  assert.match(css, /\.tarjeta-equipo-nombre \{\s*font-size: 1\.35rem;/);
  assert.match(css, /justify-content: space-between;\s*\/\* REQ-110: fecha y hora alineadas abajo/);
});

test("REQ-110 mapa: se recalcula al hacerse visible, NDVI con el estado encima, iconos de giro y mosaico sin hueco", () => {
  assert.match(CORE, /new ResizeObserver\(\(\) => \{[\s\S]*?map\.invalidateSize\(\{ pan: false \}\);[\s\S]*?\}\)\.observe\(map\.getContainer\(\)\);/);
  assert.match(CORE, /pedirEncuadre\(system\);\s*\}\s*volverAMostrarMapa\(\);/);   // REQ-117: el encuadre espera a que el mapa se vea
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.mapa-ndvi \.leaflet-overlay-pane path \{\s*fill-opacity: 0\.12 !important;/);
  const pc = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "panel-pivote-central", "panel-pivote-central.html"), "utf8");
  assert.match(pc, />rotate_left<\/i>/); assert.match(pc, />rotate_right<\/i>/); assert.doesNotMatch(pc, /fa-reply|fa-share/);
  const paneles = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "paneles.css"), "utf8");
  assert.match(paneles, /\.bs\.sensores-tarjetas \{\s*margin-top: 10px;/);
});

test("REQ-111 colores por clase de estado (ng-style no aplica variables CSS), iconos gris oscuro, alertas llamativas, valvulas en una fila", () => {
  assert.doesNotMatch(HTML, /ng-style="\{ '--estado'/, "AngularJS 1.6 no aplica --variables con ng-style");
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  ["ok", "atencion", "emergencia", "inactivo"].forEach(e =>
    assert.match(css, new RegExp("\\.tarjeta-equipo\\.estado-" + e + " \\{ --estado: #[0-9a-f]{6}; --estado-fondo: #[0-9a-f]{6}; \\}"), e));
  assert.match(css, /filter: brightness\(0\) opacity\(0\.68\);/);
  assert.match(css, /img\.icono-bomba \{\s*filter: grayscale\(100%\)/);
  assert.match(HTML, /<img ng-switch-when="Pozo" class="icono-bomba"/);
  assert.match(css, /\.estado-emergencia \.tarjeta-equipo-mensaje \{[^}]*background: var\(--estado\);[^}]*color: #ffffff;/);
  assert.match(css, /\.tarjeta-equipo-valvulas \{\s*display: flex;\s*flex-wrap: nowrap;/);
});

test("REQ-116 listado: todas las tarjetas con la misma altura (filas flexibles, altura fija)", () => {
  const CSS = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8").replace(/\r\n/g, "\n");
  assert.match(HTML, /<div class="row lista-equipos"/);
  assert.match(CSS, /\.lista-equipos \{\n    display: flex;\n    flex-wrap: wrap;/);
  assert.match(CSS, /\.lista-equipos \.tarjeta-equipo-enlace \{[^}]*height: 112px;/);
  assert.match(CSS, /\.lista-equipos > \.col \{\n    display: flex;\n    float: none;/);
});
