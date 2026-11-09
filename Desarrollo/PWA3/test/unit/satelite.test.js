"use strict";

/**
 * REQ-089 - Vista satelital (NDVI): geometria, URL, parcelas del usuario y opciones de la interfaz.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const s = require("../../assets/js/logic/satelite.js");
const geo = require("../../assets/js/logic/geo.js");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");
const plantilla = n => fs.readFileSync(path.join(RAIZ, "assets", "js", "components", "sistema", n, n + ".html"), "utf8");

const P = [[28.60, -106.10], [28.61, -106.10], [28.61, -106.09], [28.60, -106.09]];

test("REQ-089 Web Mercator ida y vuelta", () => {
  for (const [lat, lng] of [[28.6, -106.1], [-34.6, -58.4], [0, 0], [60, 10]]) {
    const m = s.aMercator(lat, lng);
    const g = s.aLatLng(m[0], m[1]);
    assert.ok(Math.abs(g[0] - lat) < 1e-9 && Math.abs(g[1] - lng) < 1e-9, lat + "," + lng);
  }
});

test("REQ-089 caja, tamaño (~5 m/px, acotado) y recorte del poligono dentro de la imagen", () => {
  const caja = s.cajaDePuntos(P);
  const [w, h] = s.tamanoImagen(caja);
  assert.ok(w > 150 && w < 260 && h > 180 && h < 300, w + "x" + h);   // ~1 km x 1.1 km + 4 % de margen, a 5 m/px
  const puntos = s.puntosEnImagen(P, caja, w, h).split(" ").map(p => p.split(",").map(Number));
  puntos.forEach(([x, y]) => assert.ok(x > 0 && x < w && y > 0 && y < h, "dentro de la imagen"));
  assert.ok(puntos[1][1] < puntos[0][1], "el norte queda arriba (y hacia abajo)");
  assert.deepEqual(s.tamanoImagen(s.cajaDePuntos([[28.6, -106.1], [28.6001, -106.0999], [28.6, -106.0999]])), [32, 32], "minimo 32 px");
  const grande = s.cajaDePuntos([[28, -107], [29, -106]]);
  assert.ok(s.tamanoImagen(grande).every(n => n === 1024), "maximo 1024 px");
  assert.equal(s.cajaDePuntos([]), null);
});

test("REQ-089 circulo del pivote: centrado y con el radio en metros sobre el terreno", () => {
  const caja = s.cajaDeCirculo(28.6, -106.1, 400);
  const [w, h] = s.tamanoImagen(caja);
  const c = s.circuloEnImagen(28.6, -106.1, 400, caja, w, h);
  assert.ok(Math.abs(c.cx - w / 2) < 1 && Math.abs(c.cy - h / 2) < 1, "centrado");
  assert.ok(Math.abs(c.r * 2 - w / 1.08) < 2, "el diametro ocupa la imagen menos el margen");
});

test("REQ-089 URL: servicio, render NDVI, rectangulo en EPSG:3857 y PNG transparente", () => {
  const caja = s.cajaDePuntos(P);
  const url = s.urlNdvi(caja, 211, 240);
  assert.match(url, /^https:\/\/sentinel\.arcgis\.com\/arcgis\/rest\/services\/Sentinel2\/ImageServer\/exportImage\?/);
  assert.match(url, /bboxSR=3857&imageSR=3857&size=211,240&format=png&transparent=true/);
  assert.ok(url.includes("renderingRule=" + encodeURIComponent('{"rasterFunction":"NDVI Colormap"}')));
  const [[sur, oeste], [norte, este]] = s.limites(caja);
  assert.ok(sur < 28.6 && norte > 28.61 && oeste < -106.1 && este > -106.09);
});

test("REQ-089 parcelas del usuario: areas de sensores y parcelas de estacionarios con contorno valido", () => {
  const sistemas = {
    RED: { type: "Sensor", sensors: { sensorNumber: 2, S0: { poligon: P }, S1: { poligon: [[1, 1], [2, 2]] } } },
    EST: { type: "Estacionario", plots: { p0: { poligon: P }, p1: { poligon: "" }, nombre: {} } },
    PIV: { type: "PC", plans: {} }
  };
  const lista = s.parcelasDelUsuario(sistemas, geo.normalizarPoligono, geo.esPoligonoValido);
  assert.deepEqual(lista.map(x => x.clave), ["REDS0", "ESTp0"]);
  assert.deepEqual(s.parcelasDelUsuario(null, geo.normalizarPoligono, geo.esPoligonoValido), []);
});

test("REQ-089 menu lateral: 'Vista satelital' antes de 'Usuarios', solo en pivote central, red de sensores y estacionario", () => {
  const vista = HTML.indexOf("</i> Vista satelital");
  const usuarios = HTML.indexOf('href="#modalUsuarios" ng-show="authUser && selectedWindow == \'sistema\'"');
  assert.ok(vista > 0 && vista < usuarios);
  assert.match(HTML, /ng-click="alternarVistaSatelital\(\)"\s+ng-show="authUser && selectedWindow == 'sistema' && \(actualSystem\.type == 'PC' \|\| actualSystem\.type == 'Sensor' \|\| actualSystem\.type == 'Estacionario'\)"/);
});

test("REQ-089 barras flotantes: Satelite entre Sensores/Planes y Usuarios; Usuarios oculto en el celular", () => {
  for (const n of ["panel-sensores", "panel-estacionario"]) {
    const t = plantilla(n);
    const config = t.indexOf("modalConfig"), sat = t.indexOf("<b>Satélite</b>"), usuarios = t.indexOf("modalUsuarios");
    assert.ok(config > 0 && config < sat && sat < usuarios, n + ": orden");
    assert.match(t, /<td class="panel-s-e30 hide-on-small-only" ng-click="vm\.alAbrir\(\{ \$modal: 'modalUsuarios' \}\)"/, n);
    assert.match(t, /ng-click="vm\.alSatelite\(\)" role="button" ng-class="\{ 'panel-opcion-activa': vm\.sateliteActivo \}"/, n);
    // REQ-090: el texto se alinea con "Historial" (mismo tipo de icono, misma compensacion).
    assert.match(t, /<div class="center-align panel-s-e24">\s*<b>Satélite<\/b>/, n);
  }
  assert.equal((HTML.match(/satelite-activo="vistaSatelital" al-satelite="alternarVistaSatelital\(\)"/g) || []).length, 2);
});

test("REQ-089 core: pivote = su circulo; red y estacionario = todas las parcelas; capa debajo de las parcelas", () => {
  assert.match(CORE, /if \(actual\.type == "PC"\) \{[\s\S]*?satelite\.cajaDeCirculo\(lat, lng, radio\)/);
  assert.match(CORE, /satelite\.parcelasDelUsuario\(\$scope\.systems, geo\.normalizarPoligono, geo\.esPoligonoValido\)/);
  assert.match(CORE, /map\.getPane\("ndvi"\)\.style\.zIndex = 350;/);
  assert.match(CORE, /L\.svgOverlay\(svgNdvi\(url, ancho, alto, forma\), satelite\.limites\(caja\), \{ pane: "ndvi", interactive: false \}\)/);
  assert.match(CORE, /imagen\.setAttribute\("clip-path", `url\(#\$\{id\}\)`\);/, "recortada al contorno");
  assert.match(CORE, /al cambiar de sistema se apaga/);
});
