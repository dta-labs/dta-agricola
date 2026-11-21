"use strict";

/**
 * REQ-114 - Resumen ejecutivo como pagina de entrada: indicadores, "Atiende primero", "Mis cultivos" y "Hoy".
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const t = require("../../assets/js/logic/tablero.js");

const RAIZ = path.join(__dirname, "..", "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const HTML = leer("index.html");
const CORE = leer("assets", "js", "core.js");
const COMP = leer("assets", "js", "components", "tablero", "tablero.component.js");
const VISTA = leer("assets", "js", "components", "tablero", "tablero.html");
const deps = {
  resumen: require("../../assets/js/logic/resumen.js"), panel: require("../../assets/js/logic/panel.js"),
  humedad: require("../../assets/js/logic/humedad.js"), medidor: require("../../assets/js/logic/medidor.js"), geo: require("../../assets/js/logic/geo.js")
};
const ok = { voltage: "true", safety: "true", commDelay: "-1", status: "ON", position: "237", speed: "45", update: "20261120 09:48" };

test("REQ-114 semaforo y KPIs: todo en orden, regando y equipos bien", () => {
  const r = t.tablero({ a: { key: "a", name: "Pivote Norte", type: "PC", status: "ON", log: ok } }, deps);
  assert.equal(r.semaforo.nivel, "ok");
  assert.equal(r.semaforo.titulo, "Todo en orden");
  assert.deepEqual(r.kpis, { equiposBien: 1, total: 1, regando: 1, sueloAdecuado: null, nocheMin: null });
  assert.deepEqual(r.atiende, []);
});

test("REQ-114 'Atiende primero': urgentes arriba, helada del pronostico y textos del semaforo", () => {
  const sistemas = {
    a: { key: "a", name: "Pivote Norte", type: "PC", status: "ON", log: Object.assign({}, ok, { voltage: "false" }) },
    b: { key: "b", name: "Pivote Sur", type: "PC", status: "ON", log: ok }
  };
  const r = t.tablero(sistemas, deps, { pronostico: { min: 1.4, instante: Date.now() + 3600000 }, umbralHelada: 2 });
  assert.equal(r.atiende[0].clave, "a");
  assert.equal(r.atiende[0].nivel, "emergencia");
  assert.match(r.atiende[0].titulo, /^Pivote Norte · Falla eléctrica/);
  assert.equal(r.atiende[1].clave, null);
  assert.match(r.atiende[1].titulo, /^Helada esta noche · 1 °C/);
  assert.equal(r.semaforo.titulo, "2 cosas requieren tu atención");
  assert.equal(r.semaforo.detalle, "1 urgente · 1 por revisar hoy");
  assert.equal(r.kpis.nocheMin, 1);
  assert.equal(r.kpis.equiposBien, 1);
});

test("REQ-114 'Mis cultivos': agrupa sin distinguir mayusculas y calcula hectareas de los sectores del pivote", () => {
  const s = { key: "p", name: "Pivote", type: "PC", status: "OFF", length: "100", log: ok,
    plans: { a: { culture: "maíz", starAngle: "0", endAngle: "180" }, b: { culture: "Maíz", starAngle: "180", endAngle: "360" } } };
  const r = t.tablero({ p: s }, deps);
  assert.equal(r.cultivos.length, 1);
  assert.equal(r.cultivos[0].nombre, "Maíz");
  assert.equal(r.cultivos[0].hectareas, 3.1);   // pi * 100^2 / 10000
});

test("REQ-114 'Hoy': eventos por cambio de estado, notificaciones del dia y proxima helada", () => {
  const sis = { key: "a", name: "Pivote Norte" };
  assert.equal(t.eventoDeCambio(sis, null, { estado: "ok", linea: "Operando" }, 1), null);   // primera lectura: no es evento
  assert.equal(t.eventoDeCambio(sis, { estado: "ok", linea: "Operando" }, { estado: "ok", linea: "Operando" }, 1), null);
  assert.equal(t.eventoDeCambio(sis, { estado: "ok", linea: "Operando" }, { estado: "emergencia", linea: "x", mensaje: "Falla eléctrica" }, 1).texto, "Pivote Norte: Falla eléctrica");
  assert.equal(t.eventoDeCambio(sis, { estado: "emergencia", linea: "x" }, { estado: "ok", linea: "Operando" }, 1).texto, "Pivote Norte: se normalizó");
  assert.equal(t.eventoDeCambio(sis, { estado: "inactivo", linea: "Detenido" }, { estado: "ok", linea: "Operando (3°)" }, 1).texto, "Pivote Norte: inició el riego");
  const ahora = new Date(2026, 10, 20, 15, 0).getTime();
  const hoy = t.lineaDeHoy(
    [{ instante: ahora - 60000, texto: "A", nivel: "ok" }, { instante: ahora - 86400000, texto: "ayer", nivel: "ok" }],
    [{ fecha: ahora - 30000, titulo: "Helada", mensaje: "S1", nivel: "critica" }],
    { min: 0, instante: ahora + 10 * 3600000 }, ahora, 2);
  assert.deepEqual(hoy.map(h => h.texto), ["Próximo: riesgo de helada (0 °C)", "Helada · S1", "A"]);
  assert.equal(hoy[1].nivel, "emergencia");
});

test("REQ-114 minima de la noche: de ahora a las 9 h del dia siguiente", () => {
  const ahora = new Date(2026, 10, 20, 18, 0).getTime();
  const h = n => new Date(2026, 10, 20, 18 + n, 0).getTime();
  const m = t.minimaDeLaNoche([h(0), h(6), h(11), h(20)], [12, 3, 1, -5], ahora);   // h(20) = 14 h del dia siguiente: fuera
  assert.deepEqual(m, { min: 1, instante: h(11) });
  assert.equal(t.minimaDeLaNoche([], [], ahora), null);
});

test("REQ-114 la app entra por el Resumen y la cabecera alterna Resumen / Equipos", () => {
  assert.match(CORE, /\$scope\.vistaPrincipal = "resumen";/);
  assert.match(HTML, /<dta-tablero ng-if="vistaPrincipal == 'resumen'" datos="tableroActual\(\)" hoy="hoyActual\(\)"/);
  assert.match(HTML, /class="text-center our-services" ng-show="systems && vistaPrincipal == 'equipos'"/);
  assert.match(HTML, /class="barra-selector" role="tablist" ng-if="selectedWindow == 'listado'"/);
  assert.match(HTML, /ng-click="cambiarVistaPrincipal\('resumen'\)"/);
  assert.match(HTML, /ng-click="cambiarVistaPrincipal\('equipos'\)"/);
  assert.match(HTML, /'con-selector': selectedWindow == 'listado'/);
});

test("REQ-114 componente, cache (sin infdig), eventos y pronostico conectados", () => {
  assert.match(COMP, /component\("dtaTablero"/);
  assert.match(COMP, /alAbrirEquipo: "&"/);
  for (const s of ["semaforo", "Atiende primero", "Mis cultivos", "Hoy", "Ver todos los equipos"]) assert.ok(VISTA.includes(s), s);
  assert.match(CORE, /\$scope\.tableroActual = \(\) => \{ actualizarTablero\(\); return cacheTablero\.datos; \};/);
  assert.match(CORE, /registrarCambioDeEquipo\(system\);/);
  assert.match(CORE, /api\.open-meteo\.com\/v1\/forecast/);
  assert.match(CORE, /"dta-eventos:"/);
  const csp = HTML.match(/connect-src[^;]*/)[0];
  assert.ok(csp.includes("https://api.open-meteo.com"));
  assert.match(HTML, /assets\/js\/logic\/tablero\.js\?v=/);
  assert.match(HTML, /components\/tablero\/tablero\.component\.js\?v=/);
  assert.match(HTML, /components\/tablero\/tablero\.css\?v=/);
});

// ---------- REQ-115: sugerencias del dia ----------

test("REQ-115 sin equipos: bienvenida con sugerencias de inicio (agregar, adquirir, instalar)", () => {
  const r = t.tablero([], deps, { sinEquipos: true });
  assert.equal(r.vacio, true);
  assert.deepEqual(r.sugerencias.map(s => s.accion && s.accion.tipo), ["agregar", "url", undefined]);
  assert.equal(t.tablero([], deps, { sinEquipos: true, instalada: true }).sugerencias.length, 2);
  assert.equal(t.tablero({}, deps, {}).vacio, false);   // cargando: no es "sin equipos"
});

test("REQ-115 con equipos: lo accionable primero (maximo 2) y un consejo del dia que rota", () => {
  const sinSenal = { key: "a", name: "Pivote Norte", type: "PC", status: "ON", log: Object.assign({}, ok, { commDelay: "12" }) };
  const r = t.tablero({ a: sinSenal }, deps, { ahora: new Date(2026, 10, 20).getTime() });
  assert.equal(r.vacio, false);
  assert.equal(r.sugerencias[0].titulo, "Revisa la conexión de Pivote Norte");
  assert.deepEqual(r.sugerencias[0].accion, { tipo: "equipo", clave: "a" });
  assert.equal(r.sugerencias.length, 2);
  assert.ok(t.CONSEJOS.includes(r.sugerencias[1]));
  const otroDia = t.tablero({ a: sinSenal }, deps, { ahora: new Date(2026, 10, 21).getTime() }).sugerencias[1];
  assert.notEqual(otroDia, r.sugerencias[1]);
  const helada = t.tablero({}, deps, { pronostico: { min: -1, instante: Date.now() + 3600000 } }).sugerencias;
  assert.equal(helada[0].titulo, "Prepárate para la helada");
});

test("REQ-115 vista: sugerencias al final, bienvenida sin equipos y 'Agregar equipo' conectado", () => {
  assert.ok(VISTA.indexOf("Sugerencias del día") > VISTA.indexOf("<!-- 4. Hoy -->"));
  assert.match(VISTA, /ng-if="vm\.datos && vm\.datos\.vacio"/);
  assert.match(VISTA, /ng-if="vm\.datos && !vm\.datos\.vacio"/);
  assert.match(COMP, /alAgregarEquipo: "&"/);
  assert.match(COMP, /raiz\.open\(a\.url, "_blank", "noopener"\)/);
  assert.match(HTML, /al-agregar-equipo="agregarEquipoDesdeResumen\(\)"/);
  assert.match(CORE, /abrirModal\("modalNuevoEquipo"\)/);
  assert.match(CORE, /\$scope\.sinEquipos = true; pantallaDeInicio\("listo"\); return; \}/);
});
