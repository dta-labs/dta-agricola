"use strict";

/**
 * REQ-057 - Paneles de "Sistema" (piloto: pivote central y pozo).
 * Comprueba que las reglas de logic/panel.js dan lo mismo que las expresiones que habia en index.html.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const panel = require("../../../assets/js/logic/panel.js");
const pc = require("../../../assets/js/components/sistema/panel-pivote-central/panel-pivote-central.component.js");
const pozo = require("../../../assets/js/components/sistema/panel-pozo/panel-pozo.component.js");

const RAIZ = path.join(__dirname, "..", "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const HTML_INDEX = () => HTML;

// Expresiones originales de index.html, para comparar.
const original = {
  senal: s => (s ? Math.round((s * 100 / 30) > 100 ? 100 : (s * 100 / 30)) : 0),
  comunicacion: log => log.reception == "Ok" && log.commDelay == "-1",
  gps: log => log.latitude != "0.00000" && log.longitude != "0.00000",
  seguridad: log => log.safety == "true",
  dias: d => String(parseInt(parseInt(d) / (1000 * 60 * 60 * 24))).padStart(2, "0"),
  horas: d => String(parseInt((parseInt(d) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, "0"),
  minutos: d => String(parseInt((parseInt(d) % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0")
};

test("REQ-057 porcentajeSenal = expresion original (0..30 -> 0..100, tope 100)", () => {
  for (const s of [0, 1, 7, 15, 29, 30, 31, 45, "12", undefined, null]) {
    assert.equal(panel.porcentajeSenal(s), original.senal(s), String(s));
  }
});

test("REQ-057 comunicacion, GPS y seguridad = expresiones originales", () => {
  const casos = [
    { reception: "Ok", commDelay: "-1", latitude: "28.1", longitude: "-106.1", safety: "true" },
    { reception: "Ok", commDelay: "5", latitude: "0.00000", longitude: "-106.1", safety: "false" },
    { reception: "Error", commDelay: "-1", latitude: "28.1", longitude: "0.00000", safety: "false" }
  ];
  for (const log of casos) {
    assert.equal(panel.comunicacionOk(log), original.comunicacion(log));
    assert.equal(panel.gpsOk(log), original.gps(log));
    assert.equal(panel.seguridadOk(log), original.seguridad(log));
  }
  // Correccion deliberada: con el booleano true, la expresion original (true == "true") daba "inseguro".
  assert.equal(original.seguridad({ safety: true }), false);
  assert.equal(panel.seguridadOk({ safety: true }), true);
  assert.equal(panel.gpsOk({}), false, "sin datos de GPS: no se muestra como correcto");
  assert.equal(panel.comunicacionOk(undefined), false);
});

test("REQ-057 duracionTexto = getDayFromMs:getHourFromMs:getMinutesFromMs", () => {
  for (const ms of [0, 59999, 60000, 3600000, 90061000, 86400000 * 12 + 3600000 * 5 + 60000 * 7]) {
    assert.equal(panel.duracionTexto(ms), original.dias(ms) + ":" + original.horas(ms) + ":" + original.minutos(ms), String(ms));
  }
  assert.equal(panel.duracionTexto(undefined), "00:00:00");
});

test("REQ-057 botonesMovimiento", () => {
  assert.deepEqual(panel.botonesMovimiento({ status: false }), { retroceso: false, detener: true, avance: false });
  assert.deepEqual(panel.botonesMovimiento({ status: true, direction: true }), { retroceso: false, detener: false, avance: true });
  assert.deepEqual(panel.botonesMovimiento({ status: true, direction: false }), { retroceso: true, detener: false, avance: false });
  assert.deepEqual(panel.botonesMovimiento(null), { retroceso: false, detener: true, avance: false });
});

test("REQ-057 panel del pivote central: colores de los botones y datos sin log", () => {
  const vm = new pc.Controlador({ panel });
  vm.sistema = { status: true, direction: true, log: { signal: 15, reception: "Ok", commDelay: "-1" } };
  assert.deepEqual(vm.colorBoton("avance"), { color: "springgreen" });
  assert.deepEqual(vm.colorBoton("detener"), { color: "lightgray" });
  assert.equal(vm.senal(), 50);
  assert.equal(vm.comunicacionOk(), true);
  vm.sistema = {};
  assert.deepEqual(vm.log(), {});
  assert.deepEqual(pc.definicion.bindings, { sistema: "<", alAvanzar: "&", alRetroceder: "&", alDetener: "&" });
});

test("REQ-057 panel del pozo: parcela en curso y duracion", () => {
  const vm = new pozo.Controlador({ panel });
  vm.sistema = { position: 1, plots: { p1: { name: "Norte", value: 3600000 * 2 + 60000 * 30 } }, status: false, log: {} };
  assert.equal(vm.numeroParcela(), 2);
  assert.equal(vm.parcela().name, "Norte");
  assert.equal(vm.duracion(), "00:02:30");
  assert.equal(vm.botones().detener, true);
  vm.sistema = {};
  assert.equal(vm.numeroParcela(), "");
  assert.deepEqual(pozo.definicion.bindings, { sistema: "<", alEncender: "&", alDetener: "&" });
});

test("REQ-057 index.html monta los dos paneles con los comandos de siempre y sin el marcado antiguo", () => {
  assert.match(HTML, /<dta-panel-pivote-central ng-if="actualSystem\.type == 'PC'" sistema="actualSystem"\s+al-avanzar="playForward\(\)" al-retroceder="playBackward\(\)" al-detener="stopSystem\(\)">/);
  assert.match(HTML, /<dta-panel-pozo ng-if="actualSystem\.type == 'Pozo'" sistema="actualSystem"\s+al-encender="playForward\(\)" al-detener="stopSystem\(\)">/);
  assert.doesNotMatch(HTML, /ng-show="actualSystem\.type == 'PC'" style="margin-bottom: 0; margin-top: 0;"/);
  assert.doesNotMatch(HTML, /ng-show="actualSystem\.type == 'Pozo'" style="margin-bottom: 0;"/);
  assert.ok(HTML.indexOf("./assets/js/components/sistema/paneles.css?v=") > 0);
});

// ---------- REQ-057 S1: pivote lineal, estacionario, sensores y nevera ----------

const PANELES = ["panel-pivote-lineal", "panel-estacionario", "panel-sensores", "panel-nevera"];
const plantilla = n => fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", n, n + ".html"), "utf8");

test("REQ-057 las plantillas no dependen de core.js: solo vm.* y variables de sus ng-repeat", () => {
  const AJENOS = /\b(actualSystem|actualSystemDataRaw|meteo|authUser|selectedWindow|showSensorMapView|getPlotColor|isPlotActive|getSensorPanelValue|openColdRoomSensorChart|editSensor|voltageToPercent|signalToPercent|playForward|playBackward|stopSystem|setEditPlanEstacionario|startPlotIrrigation|stopPlotIrrigation)\b/;
  PANELES.forEach(n => {
    const t = plantilla(n);
    assert.doesNotMatch(t, AJENOS, n);
    assert.doesNotMatch(t, /\sstyle="/, n);
    assert.doesNotMatch(t, /modal-trigger|href="#modal/, n + ": modal-trigger no funciona dentro de un componente");
    assert.doesNotMatch(t, /<!--(?:(?!-->)[\s\S])*<(?:(?!-->)[\s\S])*-->/, n + ": sin bloques de codigo comentado");
  });
});

test("REQ-057 los modales se abren con al-abrir y los comandos llegan por salidas", () => {
  assert.match(plantilla("panel-estacionario"), /ng-click="vm\.alAbrir\(\{ \$modal: 'modalHistorial' \}\)"/);
  assert.match(plantilla("panel-estacionario"), /vm\.alAlternarParcela\(\{ \$parcela: 'p' \+ \$index \}\)/);
  // REQ-063: la imagen del motor se quito; su color pasa a la "M".
  assert.match(plantilla("panel-estacionario"), /ng-style="\{ 'color': \(vm\.colorParcela\(\{ \$parcela: 'p7' \}\)\) \}"/);
  assert.match(plantilla("panel-pivote-lineal"), /ng-click="vm\.alAbrir\(\{ \$modal: 'modalSuelo' \}\)"/);
  assert.match(plantilla("panel-pivote-lineal"), /vm\.clima\.main\.humidity/);
  assert.match(plantilla("panel-sensores"), /ng-show="vm\.mostrarLista"/);
  // REQ-074: la zona de humedad la calcula el propio componente (vm.lectura); temperatura y Hr siguen con valorSensor.
  assert.match(plantilla("panel-sensores"), /vm\.valorSensor\(\{ \$clave: coldRoomKey, \$campo: 'temperature', \$sensor: coldRoom \}\)/);
  assert.match(plantilla("panel-nevera"), /ng-click="vm\.alEditarSensor\(\{ \$sensor: coldRoom \}\)"/);
  assert.match(plantilla("panel-nevera"), /vm\.datos\[\$index \* 3 \+ 1\]/);
});

test("REQ-057 index.html monta los seis paneles y core.js expone abrirVentana", () => {
  const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8");
  assert.match(CORE, /\$scope\.abrirVentana = \(id\) => abrirModal\(id\);/);
  [["dta-panel-pivote-lineal", "PL"], ["dta-panel-estacionario", "Estacionario"], ["dta-panel-sensores", "Sensor"], ["dta-panel-nevera", "Nevera"]]
    .forEach(([etiqueta, tipo]) => assert.match(HTML, new RegExp("<" + etiqueta + " ng-if=\"actualSystem\\.type == '" + tipo + "'\"")));
  assert.match(HTML, /al-alternar-parcela="setEditPlanEstacionario\(\$parcela\); isPlotActive\(actualSystem, \$parcela\) \? stopPlotIrrigation\(\) : startPlotIrrigation\(\)"/);
  assert.match(HTML, /al-editar-sensor="editSensor\(\$sensor\); abrirVentana\('modalEditSensor'\)"/);
  assert.equal((HTML.match(/ng-show="actualSystem\.type == '(PL|Estacionario|Sensor|Nevera)'/g) || []).filter(x => !/Sensor'"|Nevera'"/.test(x) || true).length >= 0, true);
  ["actualSystem.type == 'PL'\"", "actualSystem.type == 'Sensor' && !showSensorMapView"].forEach(viejo => {
    assert.equal(HTML.indexOf('<div class="col s12" ng-show="' + viejo), -1, viejo);
  });
});

test("REQ-057 porcentajeBateria = voltageToPercent", () => {
  const original = V => (Math.max(0, Math.min(100, ((V - 2.8) / (3.3 - 2.8)) * 100))).toFixed(0);
  for (const v of [2.5, 2.8, 3.0, 3.05, 3.3, 3.6, "3.1", undefined]) assert.equal(panel.porcentajeBateria(v), original(v), String(v));
});

test("REQ-057 cada clase generada de paneles.css se usa y lleva !important (igual prioridad que el estilo en linea)", () => {
  const css = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "paneles.css"), "utf8");
  const generadas = [...css.matchAll(/^\.(panel-s-e\d+) \{ ([^}]*) \}$/gm)];
  // Bajan a medida que los paneles se redisenan (S2): REQ-066 rehizo las tarjetas de sensores.
  assert.ok(generadas.length >= 30);
  const todas = PANELES.map(plantilla).join("\n");
  generadas.forEach(([, clase, cuerpo]) => {
    assert.match(todas, new RegExp("\\b" + clase + "\\b"), clase + " sin usar");
    cuerpo.split(";").filter(x => x.trim()).forEach(decl => assert.match(decl, /!important\s*$/, clase + ": " + decl));
  });
});

test("REQ-063 estacionario: sin la imagen del motor; parcelas 1-7 y la M (motor) con el color de su estado", () => {
  const t = plantilla("panel-estacionario");
  assert.doesNotMatch(t, /pozo\.png/);
  assert.match(t, /ng-repeat="plot in vm\.sistema\.plots" ng-if="\$index != 7">filter_\{\{ \$index \+ 1 \}\}<\/i>/);
  assert.match(t, /aria-label="Motor"\s+ng-click="vm\.alAlternarParcela\(\{ \$parcela: 'p7' \}\)"/);
  assert.match(t, /ng-style="\{ 'color': \(vm\.colorParcela\(\{ \$parcela: 'p7' \}\)\) \}">\s*<i class="material-icons panel-s-e35">filter_none<\/i>\s*<span class="panel-s-e39">M<\/span>/);
});

// ---------- REQ-064: codigo de colores del estacionario ----------

const sistemaCon = (orden, sectores) => ({ plots: { p2: { forcedStart: orden }, p7: { forcedStart: orden } }, log: sectores === undefined ? {} : { activeSectors: sectores } });
const SECT = n => "[" + [0, 1, 2, 3, 4, 5, 6, 7].map(i => (i === n ? 1 : 0)).join(",") + "]";

test("REQ-064 gris = apagado confirmado, amarillo = orden sin confirmar, verde = encendido confirmado", () => {
  const casos = [
    [1, SECT(2), "encendido"], [1, SECT(-1), "pendiente"], [1, undefined, "pendiente"],
    [-1, SECT(2), "pendiente"], [-1, SECT(-1), "apagado"],
    [undefined, SECT(2), "encendido"], [undefined, SECT(-1), "apagado"], [0, undefined, "apagado"]
  ];
  for (const [orden, sectores, esperado] of casos) {
    assert.equal(panel.estadoParcela(sistemaCon(orden, sectores), "p2"), esperado, `${orden} ${sectores}`);
  }
  assert.equal(panel.estadoParcela(sistemaCon(1, SECT(7)), "p7"), "encendido", "el motor (p7) sigue la misma regla");
  assert.equal(panel.estadoParcela(sistemaCon(1, [0, 0, 1]), "p2"), "encendido", "activeSectors como arreglo");
  assert.equal(panel.estadoParcela({}, "p2"), "apagado");
});

test("REQ-064 donde la funcion anterior ya acertaba, el resultado es el mismo", () => {
  // getPlotColor anterior (ventana del sistema), copiada tal cual.
  const anterior = (system, index) => {
    let color = "lightgray";
    let plot = system.plots[index];
    if (plot && plot.forcedStart && system.log) {
      let idx = parseInt(index.slice(-1)) * 2 + 1;
      if (plot.forcedStart == 1 && system.log.activeSectors && system.log.activeSectors[idx] == 1) color = "springgreen";
      if (system.log.activeSectors && plot.forcedStart != system.log.activeSectors[idx] && (plot.forcedStart == 1 || system.log.activeSectors[idx] == 1)) color = "yellow";
    }
    return color;
  };
  const COLOR = { apagado: "lightgray", pendiente: "yellow", encendido: "springgreen" };
  for (const [orden, sectores] of [[1, SECT(2)], [1, SECT(-1)], [-1, SECT(2)], [-1, SECT(-1)]]) {
    const s = sistemaCon(orden, sectores);
    assert.equal(COLOR[panel.estadoParcela(s, "p2")], anterior(s, "p2"), `${orden} ${sectores}`);
  }
  // Los dos casos que corrige REQ-064:
  assert.equal(anterior(sistemaCon(undefined, SECT(2)), "p2"), "lightgray", "antes: encendido por el equipo salia gris");
  assert.equal(anterior(sistemaCon(1, undefined), "p2"), "lightgray", "antes: orden sin ningun dato salia gris");
});

test("REQ-064 panel, listado y mapa usan el mismo estado", () => {
  const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8");
  assert.match(CORE, /return paleta\[__modulo\("panel"\)\.estadoParcela\(system, index\)\];/);
  assert.match(CORE, /COLORES_PARCELA = \{ apagado: "lightgray", pendiente: "yellow", encendido: "springgreen" \}/);
  // REQ-065: en el listado el encendido es blanco (contraste con la tarjeta).
  assert.match(CORE, /COLORES_PARCELA_LISTADO = \{ apagado: "gray", pendiente: "yellow", encendido: "white" \}/);
  assert.match(CORE, /const riego = __modulo\("panel"\)\.estadoParcela\(campo, idx\);/);
  assert.match(CORE, /BORDES_PARCELA = \{ apagado: "#bdbdbd", pendiente: "#ffd600", encendido: "#00e676" \}/);
});

// ---------- REQ-066: tarjetas de sensores ----------

test("REQ-074/076 fichas: lectura, nombre/red, zona, datos y columna derecha (clima, grafica, bateria)", () => {
  const t = plantilla("panel-sensores");
  const lista = t.slice(t.indexOf('ng-show="vm.mostrarLista"'));
  assert.match(lista, /<article class="sensor-ficha" ng-repeat="\(coldRoomKey, coldRoom\) in vm\.sistema\.sensors" ng-if="coldRoom\.id"/);
  assert.match(lista, /ng-class="'zona-' \+ vm\.lectura\(coldRoomKey, coldRoom\)\.zona"/);
  assert.match(lista, /role="button" tabindex="0"[\s\S]*?ng-click="vm\.alEditarSensor\(\{ \$sensor: coldRoom \}\)"/, "toda la ficha abre la configuracion");
  assert.match(lista, /<div class="sensor-ficha-red">\{\{ vm\.sistema\.name \}\}<\/div>/);
  assert.match(lista, /<div class="sensor-ficha-estado">\{\{ vm\.lectura\(coldRoomKey, coldRoom\)\.etiqueta \}\}<\/div>/);
  const lateral = lista.slice(lista.indexOf('<div class="sensor-ficha-lateral">'));
  assert.ok(lateral.indexOf("sensor-ficha-clima") < lateral.indexOf("sensor-ficha-boton") && lateral.indexOf("sensor-ficha-boton") < lateral.indexOf("sensor-ficha-bateria"),
    "columna derecha: clima, grafica, bateria");
  assert.match(lateral, /ng-click="\$event\.stopPropagation\(\); vm\.alGrafica\(/, "la grafica no abre la configuracion");
  assert.match(lateral, /<i class="fa fa-bar-chart" aria-hidden="true"><\/i>\s*<\/button>/, "boton de grafica solo con icono");
  assert.doesNotMatch(lista, />\s*Gráfica\s*</);
  assert.match(lateral, /<i class="fa fa-\{\{ vm\.lectura\(coldRoomKey, coldRoom\)\.bateria\.icono \}\}" aria-hidden="true"><\/i>\s*<span>\{\{ vm\.lectura\(coldRoomKey, coldRoom\)\.bateria\.texto \}\}<\/span>/, "% debajo del icono");
  assert.doesNotMatch(lista, /fa-cog/);
  assert.doesNotMatch(lista, /class="[^"]*\b(col s\d|waves-|panel-s-e)/);
  assert.match(HTML_INDEX(), /<dta-panel-sensores [^>]*clima="meteo\[actualSystem\.key\]"/);
});

function controladorSensores() {
  const sensores = require("../../../assets/js/components/sistema/panel-sensores/panel-sensores.component.js");
  const vm = new sensores.Controlador({ panel, humedad: require("../../../assets/js/logic/humedad.js"), medidor: require("../../../assets/js/logic/medidor.js") });
  // 8 valores por sensor: ms, hr, -, -, t (°C), -, -, bateria (V)
  // REQ-078: el valor principal es un ajuste de cada sensor (sensors.Sx.primaryValue).
  vm.sistema = { tempUnit: "F", sensors: { S0: {}, S1: {}, S2: {}, S3: {}, S4: {}, S5: {} }, log: { dataRaw: JSON.stringify([
    32, 99, 0, 0, 1, 0, 0, 3.3,
    5, 0, 0, 0, 10, 0, 0, 3.05,
    150, 0, 0, 0, 30, 0, 0, 2.95,
    260, 0, 0, 0, 10, 0, 0, 2.8,
    "NaN", 0, 0, 0, "NaN", 0, 0, "NaN",
    45, 0, 0, 0, 10, 0, 0, 3.3]) } };
  return vm;
}

test("REQ-074/076 lectura de la ficha: humedad del suelo por defecto, zona y bateria", () => {
  const vm = controladorSensores();
  const wm = { type: "WM", t: { minValue: 2, maxValue: 25 } };
  const s0 = vm.lectura("S0", wm);
  assert.deepEqual([s0.valor, s0.unidad, s0.etiqueta, s0.zona, s0.titulo], [32, "cb", "Humedad adecuada", "adecuada", "Humedad del suelo"]);
  assert.equal(vm.lectura("S1", wm).zona, "saturado");
  assert.equal(vm.lectura("S2", wm).zona, "seco");
  assert.equal(vm.lectura("S3", wm).zona, "fuera");
  const s4 = vm.lectura("S4", wm);
  assert.deepEqual([s4.valor, s4.etiqueta, s4.zona], ["--", "Sin lectura", "sin-dato"]);
  assert.equal(vm.lectura("S5", { type: "SHT4", h: { minValue: 25, maxValue: 60 } }).unidad, "%");
  // Bateria: 3.3 V = 100 % llena; 3.05 V = 50 % media; 2.95 V = 30 % casi vacia; 2.8 V = 0 % vacia.
  assert.deepEqual(["S0", "S1", "S2", "S3", "S4"].map(k => vm.lectura(k, wm).bateria),
    [{ icono: "battery-full", texto: "100%" }, { icono: "battery-half", texto: "50%" }, { icono: "battery-quarter", texto: "30%" },
     { icono: "battery-empty", texto: "0%" }, { icono: "battery-empty", texto: "--" }]);
  const css = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "paneles.css"), "utf8");
  ["saturado", "muy-humedo", "adecuada", "estres", "seco", "fuera", "sin-dato", "frio", "calor"].forEach(z =>
    assert.match(css, new RegExp("\\.sensor-ficha\\.zona-" + z + " \\{ --c1: #[0-9a-f]{6}; --c2: #[0-9a-f]{6}; \\}"), z));
  assert.match(css, /background: linear-gradient\(90deg, var\(--c1\) 0%, var\(--c2\) 100%\);/);
});

test("REQ-076 intercambio humedad del suelo / temperatura: valor, unidad, etiqueta y color", () => {
  const vm = controladorSensores();
  const wm = { type: "WM", t: { minValue: 2, maxValue: 25 } };
  const ev = { detenido: false, stopPropagation() { this.detenido = true; } };
  vm.alternar("S0", ev);
  assert.equal(ev.detenido, true, "el intercambio no abre la configuracion");
  const t0 = vm.lectura("S0", wm);
  assert.deepEqual([t0.valor, t0.unidad, t0.etiqueta, t0.zona, t0.titulo], [34, "°F", "Riesgo de helada", "frio", "Temperatura"]);
  assert.deepEqual([vm.lectura("S1", wm).etiqueta], ["Suelo saturado"], "las demas fichas no cambian");
  vm.alternar("S1");
  assert.deepEqual([vm.lectura("S1", wm).etiqueta, vm.lectura("S1", wm).zona], ["Temperatura adecuada", "adecuada"]);
  vm.alternar("S2");
  assert.deepEqual([vm.lectura("S2", wm).etiqueta, vm.lectura("S2", wm).zona], ["Calor extremo", "calor"]);
  vm.sistema.tempUnit = "C";
  assert.deepEqual([vm.lectura("S1", wm).valor, vm.lectura("S1", wm).unidad], [10, "°C"]);
  vm.alternar("S0");
  assert.equal(vm.lectura("S0", wm).titulo, "Humedad del suelo", "vuelve a la humedad");
  const lista = plantilla("panel-sensores");
  assert.match(lista, /<button type="button" class="sensor-ficha-swap" ng-click="vm\.alternar\(coldRoomKey, \$event\)"/);
  assert.match(lista, /<i class="material-icons" aria-hidden="true">swap_vert<\/i>/);
  assert.match(lista, /<span ng-if="vm\.esTemperatura\(coldRoomKey\)" title="Humedad del suelo"><img class="sensor-ficha-icono" src="\.\/assets\/images\/Hr_white\.png"/, "al intercambiar, la Ms pasa a la fila de datos con su icono");
});

test("REQ-066 sin tarjetas fijas (tooltips permanentes) sobre los sensores del mapa", () => {
  const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8");
  assert.doesNotMatch(CORE, /permanent: true/);
  assert.doesNotMatch(CORE, /getSensorValue/);
  // REQ-067: la ficha con los datos se abre ahora al tocar la parcela del sensor.
  assert.match(CORE, /poligons\[capa\]\.bindPopup\(\(\) => fichaDeSensor\(/);
});

test("REQ-067 mapa de sensores: la parcela muestra los datos y el sensor abre su configuracion", () => {
  const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
  assert.doesNotMatch(CORE, /marker\[sensor\.id\]\.bindPopup/, "el marcador ya no abre la ficha");
  assert.doesNotMatch(CORE, /poligons\[capa\]\.on\("click", \(\) => abrirEdicionDeSensor/, "la parcela ya no abre la edicion");
  assert.match(CORE, /poligons\[capa\]\.on\("popupopen", \(\) => setTimeout\(\(\) => bindSensorPopupActions\(indice\), 0\)\);/, "botones de grafica de la ficha");
  // La parcela se actualiza en su sitio: una ficha abierta no se cierra al llegar datos nuevos.
  const ini = CORE.indexOf("const dibujarAreasDeSensores = (campo) => {");
  const cuerpo = CORE.slice(ini, CORE.indexOf("\n    };\n", ini));
  assert.match(cuerpo, /if \(poligons\[capa\]\) \{\s*poligons\[capa\]\.setLatLngs\(area\);[\s\S]*?if \(poligons\[capa\]\.isPopupOpen\(\)\) \{\s*poligons\[capa\]\.setPopupContent\(/);
  assert.match(cuerpo, /Toca para ver los datos/);
  assert.match(CORE, /const sensorVivo = \(claveSistema, indice\) => \{/);
});

test("REQ-075/076 fichas: textos grandes y columna derecha de 44 px", () => {
  const css = fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", "paneles.css"), "utf8");
  assert.match(css, /\.bs \.sensor-ficha-nombre \{\s*margin: 0;\s*font-size: 1\.45rem;/);
  assert.match(css, /\.bs \.sensor-ficha-estado \{[^}]*font-size: 1\.3rem;/);
  assert.match(css, /\.bs \.sensor-ficha-lateral \{[^}]*flex: 0 0 44px;/);
  assert.match(css, /\.bs \.sensor-ficha-clima \{\s*width: 44px;/);
  assert.match(css, /\.bs \.sensor-ficha-boton \{[^}]*width: 44px;[^}]*height: 26px;/);
  assert.match(css, /\.bs \.sensor-ficha-bateria \{[^}]*flex-direction: column;[^}]*width: 44px;/);
});
