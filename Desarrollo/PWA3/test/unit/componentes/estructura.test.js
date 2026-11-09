"use strict";

/**
 * REQ-038 - Reglas de estructura para todos los componentes, y lo que REQ-039 saca de index.html.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..", "..", "..");
const COMPONENTES = path.join(RAIZ, "assets", "js", "components");
const HTML = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").replace(/\r\n/g, "\n");
const CORE = fs.readFileSync(path.join(RAIZ, "assets", "js", "core.js"), "utf8");

function ficheros(carpeta, extension) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap(entrada => {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) return ficheros(ruta, extension);
    return entrada.name.endsWith(extension) ? [ruta] : [];
  });
}

const DEFINICIONES = ficheros(COMPONENTES, ".component.js");
const PLANTILLAS = ficheros(COMPONENTES, ".html");

test("REQ-038 hay al menos un componente", () => {
  assert.ok(DEFINICIONES.length >= 1);
});

test("REQ-038 las plantillas no tienen style=\"\"", () => {
  PLANTILLAS.forEach(ruta => assert.doesNotMatch(fs.readFileSync(ruta, "utf8"), /\sstyle="/, ruta));
});

test("REQ-038 los componentes no tocan firebase ni el DOM global ni $parent", () => {
  DEFINICIONES.forEach(ruta => {
    const codigo = fs.readFileSync(ruta, "utf8");
    assert.doesNotMatch(codigo, /firebase\./, ruta);
    assert.doesNotMatch(codigo, /document\.getElementById/, ruta);
    assert.doesNotMatch(codigo, /\$parent/, ruta);
    assert.doesNotMatch(codigo, /\bM\.Modal\b|\bswal\(/, ruta);
  });
});

test("REQ-038 bindings sin '=' y plantilla versionada", () => {
  DEFINICIONES.forEach(ruta => {
    const { definicion } = require(ruta);
    Object.values(definicion.bindings || {}).forEach(tipo => assert.notEqual(tipo.replace("?", ""), "=", ruta));
    assert.match(definicion.templateUrl, /\.html\?v=\d/, ruta);
  });
});

test("REQ-038 cada componente y su CSS se cargan en index.html, despues de core.js", () => {
  const posCore = HTML.indexOf("./assets/js/core.js?v=");
  DEFINICIONES.forEach(ruta => {
    const relativa = "./" + path.relative(RAIZ, ruta).split(path.sep).join("/");
    const pos = HTML.indexOf(relativa + "?v=");
    assert.ok(pos > posCore, relativa + " debe cargarse despues de core.js");
    const css = ruta.replace(".component.js", ".css");
    if (fs.existsSync(css)) {
      const relCss = "./" + path.relative(RAIZ, css).split(path.sep).join("/");
      assert.ok(HTML.indexOf(relCss + "?v=") >= 0, relCss + " no se carga");
    }
  });
});

test("REQ-038 las versiones de plantilla coinciden con la del script en index.html", () => {
  DEFINICIONES.forEach(ruta => {
    const { definicion } = require(ruta);
    const version = definicion.templateUrl.split("?v=")[1];
    const relativa = "./" + path.relative(RAIZ, ruta).split(path.sep).join("/");
    assert.ok(HTML.indexOf(relativa + "?v=" + version) >= 0, relativa + " con version distinta a su plantilla");
  });
});

// ---------- REQ-039 ----------

test("REQ-039 index.html ya no contiene la vista de login", () => {
  ["signinMail", "signinPassword", "signinGoogle", "signupMail", "modalSignup", "resetPasswordBtn", "dtaLoginEmail", "shadow-login", "fondo-web.png"]
    .forEach(marca => assert.equal(HTML.indexOf(marca), -1, marca));
  assert.match(HTML, /<dta-login ng-if="selectedWindow == 'login'"><\/dta-login>/);
});

test("REQ-039 core.js ya no tiene loginEmailVerify ni reiniciarSesionGoogle", () => {
  assert.equal(CORE.indexOf("loginEmailVerify"), -1);
  assert.equal(CORE.indexOf("reiniciarSesionGoogle"), -1);
});

test("REQ-039 login.html: campos en <form> con autocomplete y enlaces externos con rel", () => {
  const plantilla = fs.readFileSync(path.join(COMPONENTES, "login", "login.html"), "utf8");
  assert.match(plantilla, /<form[^>]*ng-submit="vm\.enviar\(\)"[\s\S]*id="signinMail"[\s\S]*id="signinPassword"[\s\S]*<\/form>/);
  assert.match(plantilla, /autocomplete="username"/);
  assert.match(plantilla, /autocomplete="current-password"/);
  assert.match(plantilla, /autocomplete="new-password"/);
  (plantilla.match(/<a [^>]*target="_blank"[^>]*>/g) || []).forEach(a => assert.match(a, /rel="noopener"/));
});

test("REQ-039 los botones del campo van en un contenedor a la derecha y hay zona de mensajes", () => {
  const plantilla = fs.readFileSync(path.join(COMPONENTES, "login", "login.html"), "utf8");
  assert.equal((plantilla.match(/class="login-acciones"/g) || []).length, 2);
  assert.match(plantilla, /class="login-mensaje"[^>]*role="alert"/);
  assert.equal(plantilla.indexOf("input-login-btn-"), -1, "las clases antiguas posicionaban mal los botones");
  const css = fs.readFileSync(path.join(COMPONENTES, "login", "login.css"), "utf8");
  assert.match(css, /\.login-acciones \{[^}]*position: absolute;[^}]*right: 6px;/);
});

// ---------- REQ-040 ----------

test("REQ-040 index.html ya no contiene Ayuda ni Fichas en linea", () => {
  ["id=\"fichasTecnicas\"", "id=\"fichaTecnica\"", "showFichaTecnicaModal", "loadCultures", "selectedPlaneRiego", "n-show=",
    "Empezar a utilizar la aplicación", "compartirWhatsApp", "sidebar-footer"]
    .forEach(marca => assert.equal(HTML.indexOf(marca), -1, marca));
  // REQ-050: Ayuda en un modal sobre la pantalla actual.
  assert.match(HTML, /<dta-ayuda ng-if="ayudaAbierta" al-cerrar="cerrarAyuda\(\)"><\/dta-ayuda>/);
  assert.match(HTML, /ng-click="abrirAyuda\(\)"/);
  // REQ-048: fichas en un modal sobre la pantalla actual.
  assert.match(HTML, /<dta-fichas-tecnicas ng-if="fichasAbiertas" al-cerrar="cerrarFichas\(\)"><\/dta-fichas-tecnicas>/);
  assert.match(HTML, /ng-click="abrirFichas\(\)"/);
  assert.equal(HTML.indexOf("fichasTecnicas"), -1);
});

test("REQ-040 core.js sin loadCultures/showFichaTecnicaModal/compartirWhatsApp y con carga real de cultivos (F-5)", () => {
  ["$scope.loadCultures", "showFichaTecnicaModal", "selectedPlaneRiego", "compartirWhatsApp"]
    .forEach(marca => assert.equal(CORE.indexOf(marca), -1, marca));
  assert.equal(CORE.indexOf("if (!$scope.listOfCultures) { getCultures(); }"), -1);
  assert.ok(CORE.indexOf("const cargarCultivosSiFaltan = () => {") >= 0);
});

test("REQ-040 ayuda.html conserva las 17 secciones y no lleva enlaces externos sin rel", () => {
  const plantilla = fs.readFileSync(path.join(COMPONENTES, "ayuda", "ayuda.html"), "utf8");
  // REQ-043: las secciones son ahora botones de acordeon de Bootstrap.
  assert.equal((plantilla.match(/class="accordion-button( collapsed)?"/g) || []).length, 17);
  (plantilla.match(/<a [^>]*target="_blank"[^>]*>/g) || []).forEach(a => assert.match(a, /rel="noopener"/));
});

test("REQ-040 logic/cultivos.js se carga antes de core.js", () => {
  const posCultivos = HTML.indexOf("./assets/js/logic/cultivos.js?v=");
  assert.ok(posCultivos > 0 && posCultivos < HTML.indexOf("./assets/js/core.js?v="));
});

// ---------- REQ-043: componentes en Bootstrap ----------

// Login: su migracion a Bootstrap se revirtio el 2026-11-06 (rompia el diseno); pendiente con revision visual.
// REQ-057: los paneles de "Sistema" se extraen primero SIN cambiar su aspecto (mismo marcado de
// Materialize); su rediseno en Bootstrap es un paso aparte con revision visual del usuario.
const PENDIENTES_DE_BOOTSTRAP = [
  path.join("login", "login.html"),
  path.join("sistema", "panel-pivote-central", "panel-pivote-central.html"),
  path.join("sistema", "panel-pozo", "panel-pozo.html"),
  path.join("sistema", "panel-pivote-lineal", "panel-pivote-lineal.html"),
  path.join("sistema", "panel-estacionario", "panel-estacionario.html"),
  path.join("sistema", "panel-sensores", "panel-sensores.html"),
  path.join("sistema", "panel-nevera", "panel-nevera.html")
];

test("REQ-043 las plantillas de componentes no usan clases de Materialize y van dentro de .bs", () => {
  const MATERIALIZE = /class="[^"]*\b(col s\d+|input-field|waves-effect|collapsible|modal-trigger|modal-close|btn-flat|valign-wrapper|right-align|left-align|center-align)\b/;
  PLANTILLAS.filter(ruta => !PENDIENTES_DE_BOOTSTRAP.some(p => ruta.endsWith(p))).forEach(ruta => {
    const plantilla = fs.readFileSync(ruta, "utf8");
    assert.doesNotMatch(plantilla, MATERIALIZE, ruta);
    if (/<(div|form|button|section)\b/.test(plantilla)) {
      // REQ-059: o un modal de Materialize con el estilo comun (su contenido, Bootstrap dentro de .bs.ventana).
      assert.match(plantilla.replace(/<!--[\s\S]*?-->/g, "").trim(),
        /^(<div class="bs[ "]|<div id="[A-Za-z]+" class="modal ventana-modal[^"]*">\s*<div class="bs ventana">)/,
        ruta + " debe empezar por <div class=\"bs\"> o por un modal .ventana-modal con .bs.ventana");
    }
  });
});

test("REQ-043 Bootstrap se carga desde la app (sin CDN): CSS tras Materialize y JS antes de core.js", () => {
  const posCss = HTML.indexOf("./assets/vendor/bootstrap/bootstrap-dta.css?v=");
  const posJs = HTML.indexOf("./assets/vendor/bootstrap/bootstrap.bundle.min.js?v=");
  assert.ok(posCss > HTML.indexOf("materialize.min.css"));
  assert.ok(posJs > 0 && posJs < HTML.indexOf("./assets/js/core.js?v="));
  assert.ok(fs.existsSync(path.join(RAIZ, "assets", "vendor", "bootstrap", "bootstrap-dta.css")));
  assert.ok(fs.existsSync(path.join(RAIZ, "assets", "vendor", "bootstrap", "bootstrap.bundle.min.js")));
});

test("REQ-043 el CSS de Bootstrap esta aislado en .bs y sin BOM", () => {
  const css = fs.readFileSync(path.join(RAIZ, "assets", "vendor", "bootstrap", "bootstrap-dta.css"), "utf8");
  assert.equal(css.indexOf("\uFEFF"), -1, "un BOM invalida la regla :root");
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  const fuera = [];
  for (const m of sinComentarios.matchAll(/([^{}@;]+)\{/g)) {
    for (const sel of m[1].split(",").map(x => x.trim())) {
      if (!sel || sel.includes(".bs") || /^(:root|\[data-bs-theme|\.modal-backdrop|\.offcanvas-backdrop|from|to|\d+%|media)/.test(sel)) continue;
      fuera.push(sel);
    }
  }
  assert.deepEqual(fuera, []);
});

test("REQ-043 el enlace 'Ver mas' de Ayuda tiene href (antes la URL estaba en class)", () => {
  const plantilla = fs.readFileSync(path.join(COMPONENTES, "ayuda", "ayuda.html"), "utf8");
  assert.equal(plantilla.indexOf('class="ttps://'), -1);
  assert.match(plantilla, /href="https:\/\/dtaamerica\.com\/dta-agricola\/index\.html#content6-n"/);
});

// ---------- REQ-051 ----------

test("REQ-051 las cuatro ventanas usan el selector de mapa y ya no los campos antiguos", () => {
  const usos = HTML.match(/<dta-mapa-selector modo="(punto|poligono)"[^>]*>/g) || [];
  assert.equal(usos.filter(u => /modo="punto"/.test(u)).length, 3, "equipo nuevo, sensor nuevo, editar sensor");
  // REQ-052: tambien "Editar sensor" marca la parcela del sensor.
  assert.equal(usos.filter(u => /modo="poligono"/.test(u)).length, 3, "parcela del sensor nuevo, del sensor editado y editar parcela");
  ["editPoligon", "setNewPoligonNode", "setSensorPosition", "setDevicePosition", "Latidud", "Unicación"]
    .forEach(marca => { assert.equal(HTML.indexOf(marca), -1, marca); assert.equal(CORE.indexOf(marca), -1, marca); });
  assert.match(HTML, /poligono="edicionParcela\.poligono"[\s\S]*?al-cambiar="edicionParcela\.poligono = \$poligono"/);
  assert.match(HTML, /poligono="newSensor\.poligon"[\s\S]*?al-cambiar="newSensor\.poligon = \$poligono"/);
});

test("REQ-051 core.js guarda el poligono de la parcela en el formato de siempre", () => {
  assert.match(CORE, /\$scope\.edicionParcela = \{ poligono: __modulo\("geo"\)\.normalizarPoligono\(\$scope\.actualSystem\.plots\[index\]\.poligon\) \};/);
  assert.match(CORE, /plots\[\$scope\.editedPlan\]\.poligon = geo\.esPoligonoValido\(poligono\) \? poligono : "";/);
});

test("REQ-051 orden de carga: geo.js antes de core.js; mapa.factory y el componente despues de leaflet.js", () => {
  const pos = a => HTML.indexOf(a);
  assert.ok(pos("./assets/js/logic/geo.js?v=") < pos("./assets/js/core.js?v="));
  assert.ok(pos("./assets/js/ui/mapa.factory.js?v=") > pos("./assets/modules/leaflet/leaflet.js"));
});

// ---------- REQ-052 ----------

test("REQ-052 los tres lectores antiguos se sustituyen por <dta-lector-codigo>", () => {
  const usos = HTML.match(/<dta-lector-codigo [^>]*al-leer="[^"]+"/g) || [];
  assert.equal(usos.length, 3);
  assert.match(HTML, /al-leer="newDevice\.key = \$codigo"/);
  assert.match(HTML, /al-leer="newSensor\.id = \$codigo"/);
  assert.match(HTML, /al-leer="actualSensor\.id = \$codigo"/);
  ["QrScanner", "QrReader", "QrMessage", "QrScanning"].forEach(m => {
    assert.equal(HTML.indexOf(m), -1, m);
    assert.equal(CORE.indexOf(m), -1, m);
  });
});

test("REQ-052 fase fenologica como selector en Agregar y Editar sensor", () => {
  assert.match(HTML, /<select id="newSensorPhenologicalStage" class="browser-default form-select"/);
  assert.match(HTML, /<select id="editSensorPhenologicalStage" class="browser-default form-select"/);
  assert.equal((HTML.match(/ng-repeat="fase in fasesConActual\((newSensor|actualSensor)\.phenologicalStage\)"/g) || []).length, 2);
  assert.match(CORE, /\$scope\.fasesConActual = \(actual\) => __modulo\("cultivos"\)\.fasesConActual\(actual\);/);
});

test("REQ-052 mapa: parcelas y areas de sensores sombreadas por humedad; tocar abre la edicion", () => {
  assert.match(CORE, /__modulo\("humedad"\)\.estadoDeParcela\(campo\.plots\[idx\], \$scope\.systems\)/);
  assert.match(CORE, /poligons\[campo\.key \+ idx\]\.on\("click", \(\) => abrirEdicionDeParcela\(idx\)\);/);
  assert.match(CORE, /\$scope\.setEditPlanEstacionario\(idx\);\s*abrirModal\("modalEditRiegoEstacionario"\);/);
  // REQ-067: se intercambiaron las acciones: el area del sensor muestra sus datos y el marcador abre "Editar sensor".
  assert.match(CORE, /poligons\[capa\]\.bindPopup\(\(\) => fichaDeSensor\(/);
  assert.match(CORE, /marker\[sensor\.id\]\.on\("click", \(\) => \{\s*const vivo = sensorVivo\(campo\.key, i\) \|\| sensor;\s*abrirEdicionDeSensor\(vivo\);/);
  assert.match(CORE, /\$scope\.editSensor\(sensor\);\s*abrirModal\("modalEditSensor"\);/);
  assert.match(CORE, /fillColor: estado\.color/);
  assert.match(CORE, /leyendaHumedad\(\);/);
  assert.doesNotMatch(CORE, /bindPopup\(msg\)/, "la parcela ya no abre una ventana emergente");
});

test("REQ-052 Agregar sensor: indicador de pasos y botones con texto", () => {
  const ini = HTML.indexOf('<div id="modalNuevoSensor"');
  const modal = HTML.slice(ini, HTML.indexOf('<div id="modalEditSensor"', ini));
  assert.match(modal, /<ol class="pasos-asistente"/);
  // REQ-053: el texto va en .boton-texto (oculto en el movil) y el boton conserva aria-label.
  assert.match(modal, /aria-label="Siguiente"[^>]*>\s*<span class="boton-texto">Siguiente<\/span>/);
  assert.match(modal, /aria-label="Atrás"[^>]*>\s*<i class="material-icons left">arrow_back<\/i><span class="boton-texto">Atrás<\/span>/);
  assert.match(modal, /aria-label="Agregar sensor"[^>]*>\s*<i class="material-icons left">check<\/i><span class="boton-texto">Agregar sensor<\/span>/);
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "ventana.css"), "utf8");
  assert.match(css, /@media \(max-width: 600px\) \{[\s\S]*\.modal\.modal-asistente \.boton-icono-movil \.boton-texto \{\s*display: none;/);
  assert.match(css, /\.bs \.pasos-asistente li:not\(\.actual\) \.paso-texto \{\s*display: none;/);
});

// ---------- REQ-054 ----------

test("REQ-054 alertas: umbrales separados con su accion (segun el tipo de sensor) en Agregar y Editar sensor", () => {
  for (const [prefijo, modelo] of [["newSensor", "newSensor"], ["editSensor", "actualSensor"]]) {
    for (const metrica of ["H", "T"]) {
      for (const lado of ["Min", "Max"]) {
        assert.match(HTML, new RegExp('<label for="' + prefijo + metrica + lado + 'Value" class="alerta-etiqueta">'), prefijo + metrica + lado);
      }
    }
    // Humedad: WM (centibares) al reves que los sensores en % (igual que functions/index.js).
    assert.match(HTML, new RegExp('for="' + prefijo + "HMinValue\" class=\"alerta-etiqueta\">\\{\\{ " + modelo + "\\.type == 'WM' \\? 'No regar' : 'Regar' \\}\\}"));
    assert.match(HTML, new RegExp('for="' + prefijo + "HMaxValue\" class=\"alerta-etiqueta\">\\{\\{ " + modelo + "\\.type == 'WM' \\? 'Regar' : 'No regar' \\}\\}"));
    assert.match(HTML, new RegExp('for="' + prefijo + 'TMinValue" class="alerta-etiqueta">Helada<'));
    assert.match(HTML, new RegExp('for="' + prefijo + 'TMaxValue" class="alerta-etiqueta">Exceso de calor<'));
    // La helada admite valores bajo cero; REQ-066: en la unidad del sistema y guardada en °C.
    assert.match(HTML, new RegExp('id="' + prefijo + 'TMinValue" type="number" step="0\\.5" min="\\{\\{ actualSystem\\.tempUnit == \'C\' \\? -30 : -22 \\}\\}"'));
  }
  const funciones = fs.readFileSync(path.join(RAIZ, "functions", "index.js"), "utf8");
  assert.match(funciones, /En Watermark una lectura baja indica saturaci/, "si cambia la regla del servidor, revisar las etiquetas");
});

test("REQ-054 iconos centrados en los botones del movil", () => {
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "ventana.css"), "utf8");
  assert.match(css, /\.modal\.modal-asistente \.boton-icono-movil \{\s*display: inline-flex !important;\s*align-items: center;\s*justify-content: center;/);
});

// ---------- REQ-055 ----------

test("REQ-055/059 la ayuda (?) del pivote va junto al campo de velocidad (sin columna propia)", () => {
  const plantilla = fs.readFileSync(path.join(COMPONENTES, "sistema", "plan-pivote", "plan-pivote.html"), "utf8");
  assert.match(plantilla, /<div class="input-group">\s*<input id="planPivoteVelocidad"[\s\S]*?<button type="button" class="btn btn-outline-success" ng-click="vm\.verVelocidades\(\)"/);
  assert.doesNotMatch(HTML, /href="#systemConfigModal"/, "la tabla se abre desde el componente, no con modal-trigger");
});

test("REQ-055 los planes tienen borde verde claro", () => {
  const css = fs.readFileSync(path.join(RAIZ, "assets", "css", "style.css"), "utf8");
  assert.match(css, /\.plan-tarjeta \{[^}]*border: 2px solid #c8e6c9;/);
});

// ---------- REQ-091 ----------

test("REQ-091 Editar sensor: imagen centrada; nombre, tipo, cultivo, alertas y geolocalizacion, en ese orden", () => {
  const ini = HTML.indexOf('<div id="modalEditSensor"');
  const modal = HTML.slice(ini, HTML.indexOf('<div id="modalBuscarSensor"', ini));
  assert.match(modal, /<div class="col s12 center-align">\s*<img ng-src="\{\{ getSensorImage\(actualSensor\.type\) \}\}"/);
  const pos = ['id="editSensorAlias"', 'id="editSensorType"', "Cultivo que mide el sensor", 'id="actualSensorAlerts"', "geo-bloque"].map(x => modal.indexOf(x));
  pos.forEach((p, i) => assert.ok(p > 0, "falta el bloque " + i));
  for (let i = 1; i < pos.length; i += 1) assert.ok(pos[i - 1] < pos[i], "orden de los bloques " + i);
  const alertas = ['id="editSensorHNotify"', 'id="editSensorTNotify"', "actualSensor.type == 'Psi'\">", "actualSensor.type == 'Fl'\">", "Amenazas biológicas", "actualCulture in listOfCultures"].map(x => modal.indexOf(x));
  for (let i = 1; i < alertas.length; i += 1) assert.ok(alertas[i - 1] > 0 && alertas[i - 1] < alertas[i], "orden de las alertas " + i);
  assert.equal((modal.match(/<div\b/g) || []).length, (modal.match(/<\/div>/g) || []).length, "etiquetas equilibradas");
});
