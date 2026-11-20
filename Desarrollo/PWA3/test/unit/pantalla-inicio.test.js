"use strict";

/**
 * REQ-105 - Pantalla de inicio animada con barra de avance y version.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

const scriptDelSplash = () => {
  const ini = HTML.indexOf("// REQ-105: avance de la carga.");
  return HTML.slice(HTML.lastIndexOf("<script>", ini) + 8, HTML.indexOf("</script>", ini));
};

test("REQ-105 la pantalla de inicio es lo primero del body, con logo animado, barra y version", () => {
  const body = HTML.indexOf("<body");
  assert.ok(HTML.indexOf('<div id="splash"') > body && HTML.indexOf('<div id="splash"') < HTML.indexOf('<div id="spinner"'));
  ["sp-orbita", "sp-logo", "sp-brillo", 'id="splash-barra"', 'id="splash-estado"', 'id="splash-version"', "DTA-Agrícola"]
    .forEach(x => assert.ok(HTML.includes(x), x));
  assert.match(HTML, /<noscript><style>#splash \{ display: none; \}<\/style><\/noscript>/);
  const estilos = HTML.slice(HTML.indexOf("REQ-105: pantalla de inicio animada"), HTML.indexOf("</head>"));
  ["@keyframes sp-pop", "@keyframes sp-pulso", "@keyframes sp-brillo", "@keyframes sp-orbita", "prefers-reduced-motion"]
    .forEach(x => assert.ok(estilos.includes(x), x));
  const version = fs.readFileSync(path.join(RAIZ, "assets", "js", "app", "version.js"), "utf8");
  assert.match(version, /getElementById\("splash-version"\)/);
});

test("REQ-105 el script de avance: sintaxis valida, avance que no retrocede y retirada tras el minimo", async () => {
  const codigo = scriptDelSplash();
  assert.doesNotThrow(() => new Function(codigo));
  // DOM simulado
  const elementos = {};
  const nuevo = () => ({ style: {}, attrs: {}, textContent: "", parentNode: {}, classList: { clases: [], add(c) { this.clases.push(c); } },
    setAttribute(k, v) { this.attrs[k] = v; } });
  ["splash", "splash-barra", "splash-estado"].forEach(id => { elementos[id] = nuevo(); });
  const oyentes = {};
  const documento = { getElementById: id => elementos[id], addEventListener: (ev, fn) => { (oyentes[ev] = oyentes[ev] || []).push(fn); },
    querySelectorAll: () => ({ length: 4 }) };
  const ventana = { addEventListener: (ev, fn) => { (oyentes["w:" + ev] = oyentes["w:" + ev] || []).push(fn); } };
  const temporizadores = [];
  let ahora = 0;
  new Function("document", "window", "requestAnimationFrame", "setTimeout", "Date", codigo)(
    documento, ventana, () => {}, (fn, ms) => temporizadores.push({ fn, ms }), { now: () => ahora });
  assert.equal(typeof ventana.dtaSplash.avance, "function");
  oyentes.DOMContentLoaded.forEach(f => f());
  ventana.dtaSplash.avance(82, "Comprobando tu sesión…");
  assert.equal(elementos["splash-estado"].textContent, "Comprobando tu sesión…");
  ventana.dtaSplash.avance(40);                 // nunca retrocede
  ahora = 500;
  ventana.dtaSplash.listo();
  const retirada = temporizadores.find(t => t.ms === 1600);
  assert.ok(retirada, "espera hasta completar el minimo de 2,1 s");
  retirada.fn();
  assert.deepEqual(elementos.splash.classList.clases, ["oculto"]);
  assert.equal(elementos["splash-barra"].style.width, "100%");
  assert.ok(temporizadores.some(t => t.ms === 15000), "tope de 15 s");
});

test("REQ-105 la app marca el avance y retira la pantalla (acceso o primer equipo)", () => {
  assert.match(CORE, /pantallaDeInicio\("avance", 82, "Comprobando tu sesión…"\);/);
  assert.match(CORE, /pantallaDeInicio\("avance", 92, "Cargando tus equipos…"\);/);
  assert.match(CORE, /console\.log\("\[auth\] sin sesion: se muestra el login"\);\s*pantallaDeInicio\("listo"\);/);
  assert.match(CORE, /alCambiarSistema: \(sistema, locationKey\) => \{\s*pantallaDeInicio\("listo"\);/);
});

test("REQ-106 se anima el icono oficial de la app (el del manifiesto), no uno dibujado", () => {
  assert.match(HTML, /<img class="sp-logo" src="\.\/assets\/images\/icons\/res\/DTA_Agricola_512\.png"/);
  const manifiesto = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.json"), "utf8"));
  assert.ok(manifiesto.icons.some(i => i.src === "./assets/images/icons/res/DTA_Agricola_512.png"));
  assert.ok(fs.existsSync(path.join(RAIZ, "assets", "images", "icons", "res", "DTA_Agricola_512.png")));
  const splash = HTML.slice(HTML.indexOf('<div id="splash"'), HTML.indexOf("<noscript><style>#splash"));
  assert.doesNotMatch(splash, /<svg/);
});

test("REQ-107 icono de inicio circular (el blanco solo como aro)", () => {
  assert.match(HTML, /#splash \.sp-icono \{[^}]*border-radius: 50%;/);
});

test("REQ-108 logotipo con lema en imagen e icono mas grande dentro de la orbita", () => {
  assert.match(HTML, /<img class="sp-marca" src="\.\/assets\/images\/DTA-Agricola-lema\.png"/);
  assert.ok(fs.existsSync(path.join(RAIZ, "assets", "images", "DTA-Agricola-lema.png")));
  assert.match(HTML, /#splash \.sp-icono \{ position: relative; width: 140px; height: 140px;/);
  assert.doesNotMatch(HTML, /class="sp-nombre"|class="sp-lema"/);
});
