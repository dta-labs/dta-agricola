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
  humedad: require("../../assets/js/logic/humedad.js"), medidor: require("../../assets/js/logic/medidor.js"), geo: require("../../assets/js/logic/geo.js"), frio: require("../../assets/js/logic/frio.js")
};
const ok = { voltage: "true", safety: "true", commDelay: "-1", status: "ON", position: "237", speed: "45", update: "20261120 09:48" };

test("REQ-114 semaforo y KPIs: todo en orden, regando y equipos bien", () => {
  const r = t.tablero({ a: { key: "a", name: "Pivote Norte", type: "PC", status: "ON", log: ok } }, deps);
  assert.equal(r.semaforo.nivel, "ok");
  assert.equal(r.semaforo.titulo, "Todo en orden");
  assert.deepEqual([r.kpis.equiposBien, r.kpis.total, r.kpis.regando, r.kpis.sueloAdecuado, r.kpis.nocheMin, r.kpis.fallasCriticas], [1, 1, 1, null, null, 0]);   // REQ-155: mas indicadores
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
  // REQ-155: la helada del pronostico tambien es critica; el banner las cuenta y nombra
  assert.equal(t.tablero({ a: sistemas.a }, deps).semaforo.titulo, "1 alerta crítica");
  assert.match(r.atiende[1].titulo, /^Helada esta noche · 1 °C/);
  assert.equal(r.semaforo.titulo, "2 alertas críticas");   // REQ-118: "alertas", no "cosas"
  assert.equal(r.semaforo.detalle, "Pivote Norte · Falla eléctrica · Helada esta noche · 1 °C");
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
  for (const s of ["semaforo", "Qué atender primero", "Mis cultivos", "Actividad de hoy", "Lo que toca hoy", "Ver todos los equipos"]) assert.ok(VISTA.includes(s), s);
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

test("REQ-115 con equipos: lo accionable primero; el consejo del dia (rota) solo si no hay nada ligado a datos", () => {
  const sinSenal = { key: "a", name: "Pivote Norte", type: "PC", status: "ON", log: Object.assign({}, ok, { commDelay: "12" }) };
  const r = t.tablero({ a: sinSenal }, deps, { ahora: new Date(2026, 10, 20).getTime() });
  assert.equal(r.vacio, false);
  assert.equal(r.sugerencias[0].titulo, "Revisa la conexión de Pivote Norte");
  assert.deepEqual(r.sugerencias[0].accion, { tipo: "equipo", clave: "a" });
  assert.equal(r.sugerencias.length, 1);                      // REQ-155: sin consejo de relleno
  const bien = { key: "b", name: "Pivote Sur", type: "PC", status: "ON", log: ok };
  const consejo = t.tablero({ b: bien }, deps, { ahora: new Date(2026, 10, 20).getTime() }).sugerencias;
  assert.equal(consejo.length, 1);
  assert.ok(t.CONSEJOS.includes(consejo[0]));
  const otroDia = t.tablero({ b: bien }, deps, { ahora: new Date(2026, 10, 21).getTime() }).sugerencias[0];
  assert.notEqual(otroDia, consejo[0]);
  const helada = t.tablero({}, deps, { pronostico: { min: -1, instante: Date.now() + 3600000 } }).sugerencias;
  assert.equal(helada[0].titulo, "Prepárate para la helada");
});

test("REQ-115 vista: sugerencias al final, bienvenida sin equipos y 'Agregar equipo' conectado", () => {
  assert.ok(VISTA.indexOf("Sugerencias del día") > VISTA.indexOf("<!-- 5. Lo que toca hoy"));   // REQ-155: tras "Lo que toca hoy", antes de los cultivos
  assert.ok(VISTA.indexOf("Sugerencias del día") < VISTA.indexOf("<!-- 4. Mis cultivos"));
  assert.match(VISTA, /ng-if="vm\.datos && vm\.datos\.vacio"/);
  assert.match(VISTA, /ng-if="vm\.datos && !vm\.datos\.vacio && !vm\.datos\.cargando"/);   // REQ-168
  assert.match(COMP, /alAgregarEquipo: "&"/);
  assert.match(COMP, /raiz\.open\(a\.url, "_blank", "noopener"\)/);
  assert.match(HTML, /al-agregar-equipo="agregarEquipoDesdeResumen\(\)"/);
  assert.match(CORE, /abrirModal\("modalNuevoEquipo"\)/);
  assert.match(CORE, /\$scope\.sinEquipos = true; pantallaDeInicio\("listo"\); return; \}/);
});

// ---------- REQ-138: cultivos con su equipo, reposo invernal, semaforo y "Atiende primero" ----------

test("REQ-138 Mis cultivos: sin sensor, el equipo donde esta y su estado; agrupa sin acentos", () => {
  const ahora = new Date(2026, 5, 15).getTime();   // junio: fuera del reposo
  const s = {
    a: { key: "a", name: "Pivote Norte", type: "PC", status: "ON", latitude: "28.6", log: ok, length: "100",
      plans: { p0: { culture: "Manzana", starAngle: "0", endAngle: "360" } } },
    b: { key: "b", name: "Estacionario 2", type: "Estacionario", status: "ON", latitude: "28.6", log: ok,
      plots: { p0: { culture: "Maíz" }, p1: { culture: "Maiz" } } }
  };
  const r = t.tablero(s, deps, { ahora });
  const maiz = r.cultivos.find(c => c.clave === "maiz");
  assert.equal(maiz.nombre, "Maíz");                                   // "Maiz" y "Maíz": un solo cultivo
  assert.deepEqual([maiz.equipo.clave, maiz.equipo.nombre, maiz.otrosEquipos], ["b", "Estacionario 2", 0]);
  const manzana = r.cultivos.find(c => c.clave === "manzana");
  assert.deepEqual([manzana.equipo.nombre, manzana.equipo.linea, manzana.reposo], ["Pivote Norte", "Operando", false]);
});

test("REQ-138 periodo del cultivo: en reposo invernal la helada no se avisa (Atiende primero, sugerencias, Hoy)", () => {
  const ahora = new Date(2026, 10, 22).getTime();  // 22 nov: manzano en reposo (1 nov - 15 mar)
  const pronostico = { min: -1, instante: ahora + 3600000 };
  const manzano = { a: { key: "a", name: "Huerta", type: "PC", status: "ON", latitude: "28.6", log: ok, length: "100",
    plans: { p0: { culture: "Manzana", starAngle: "0", endAngle: "360" } } } };
  const r = t.tablero(manzano, deps, { pronostico, umbralHelada: 2, ahora });
  assert.deepEqual(r.atiende, []);
  assert.deepEqual(r.reposo, { heladaRelevante: false, sistemas: ["a"] });
  assert.equal(r.cultivos[0].fase, "En reposo invernal");
  assert.ok(!r.sugerencias.some(sg => /helada/i.test(sg.titulo)));
  const notif = [{ fecha: ahora + 1000, titulo: "Riesgo de helada en Huerta", tipo: "helada", sistema: "a", nivel: "alta" }];
  assert.deepEqual(t.lineaDeHoy([], notif, pronostico, ahora + 2000, 2, r.reposo), []);
  // con un cultivo sensible (maiz) la helada si se avisa
  const mixto = Object.assign({}, manzano, { b: { key: "b", name: "Parcela", type: "Estacionario", status: "ON", latitude: "28.6", log: ok, plots: { p0: { culture: "Maíz" } } } });
  const r2 = t.tablero(mixto, deps, { pronostico, umbralHelada: 2, ahora });
  assert.match(r2.atiende[0].titulo, /^Helada esta noche/);
  assert.deepEqual(r2.reposo.sistemas, ["a"]);
  assert.equal(t.lineaDeHoy([], notif, pronostico, ahora + 2000, 2, r2.reposo).length, 1);   // solo el "Proximo"
});

test("REQ-138 vista: semaforo abre las notificaciones, Atiende primero con alto fijo y sin barra, cultivo abre su equipo", () => {
  assert.match(VISTA, /<button type="button" class="tablero-semaforo" ng-class="'nivel-' \+ vm\.datos\.semaforo\.nivel" ng-click="vm\.alAbrirNotificaciones\(\)"/);
  assert.match(COMP, /alAbrirNotificaciones: "&"/);
  assert.match(HTML, /al-abrir-notificaciones="abrirNotificaciones\(\)"/);
  // REQ-155: el area de alto fijo se sustituye por maximo 5 visibles y "Ver los N restantes"
  assert.match(VISTA, /ng-repeat="a in vm\.avisos\(\) \| limitTo: vm\.limite\(\) track by \$index"/);
  assert.match(VISTA, /ng-click="c\.equipo && vm\.alAbrirEquipo\(\{ \$clave: c\.equipo\.clave \}\)"/);
  assert.match(CORE, /frio: __modulo\("frio"\) \}\);/);
  assert.match(CORE, /tablero\.lineaDeHoy\(eventosDelDia, bandejaLista, pronosticoNoche, Date\.now\(\), umbral, datos\.reposo\)/);
});
