/**
 * REQ-013 - Servicio de dominio `equipos`: suscripciones, cache normalizada y dedupe de alarmas.
 * Se prueba con un repositorio FALSO: ninguna llamada sale a Firebase.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crear } = require("../../assets/js/services/equipos.js");

function repositorioFalso() {
    const llamadas = [];
    const emisores = { sistema: {}, usuarios: {}, ultimoLog: {} };
    const cancelados = [];
    let n = 0;
    return {
        llamadas, emisores, cancelados,
        repo: {
            escucharSistema(clave, alCambiar, alError) {
                llamadas.push({ tipo: "sistema", clave });
                emisores.sistema[clave] = alCambiar;
                const id = ++n;
                return { ruta: "systems/" + clave + "/settings", off: () => cancelados.push(id) };
            },
            escucharUsuariosSistema(clave, alCambiar, alError) {
                llamadas.push({ tipo: "usuarios", clave });
                emisores.usuarios[clave] = alCambiar;
                const id = ++n;
                return { ruta: "systems/" + clave + "/users", off: () => cancelados.push(id) };
            },
            escucharUltimoLog(clave, directorio, alCambiar, alError) {
                llamadas.push({ tipo: "ultimoLog", clave, directorio });
                emisores.ultimoLog[clave] = alCambiar;
                const id = ++n;
                return { ruta: "systems/" + clave + "/" + directorio, off: () => cancelados.push(id) };
            },
        },
    };
}

const snap = (valor) => ({ val: () => valor });

test("REQ-013.9 cargar suscribe una vez por clave y entrega el sistema normalizado", () => {
    const f = repositorioFalso();
    const servicio = crear(f.repo);
    const recibidos = [];
    servicio.cargar(["a", "b"], { alCambiarSistema: (s, k) => recibidos.push([k, s]) });

    assert.deepEqual(f.llamadas.map((l) => l.clave), ["a", "b"]);
    f.emisores.sistema.a(snap({ name: "Equipo A", type: "Sensor" }));
    assert.deepEqual(recibidos[0], ["a", { name: "Equipo A", type: "Sensor", key: "a" }]);
    assert.equal(servicio.sistema("a").name, "Equipo A");
});

test("REQ-013.10 un snapshot vacio no crea equipo", () => {
    const f = repositorioFalso();
    const servicio = crear(f.repo);
    const recibidos = [];
    servicio.cargar(["a"], { alCambiarSistema: (s) => recibidos.push(s) });
    f.emisores.sistema.a(snap(null));
    assert.deepEqual(recibidos, []);
    assert.equal(servicio.sistema("a"), null);
});

test("REQ-013.11 detenerTodo cancela todas las suscripciones y limpia el estado", () => {
    const f = repositorioFalso();
    const servicio = crear(f.repo);
    servicio.cargar(["a", "b"], { alCambiarSistema: () => {} });
    servicio.escucharUsuarios("a", () => {});
    servicio.escucharUltimoLog("a", "logs", () => {});
    const antes = f.cancelados.length;

    servicio.detenerTodo();
    assert.equal(f.cancelados.length, antes + 4, "2 sistemas + usuarios + ultimo log");
    assert.deepEqual(servicio.sistemas(), {});
});

test("REQ-013.12 escucharUsuarios reemplaza la suscripcion anterior", () => {
    const f = repositorioFalso();
    const servicio = crear(f.repo);
    servicio.escucharUsuarios("a", () => {});
    servicio.escucharUsuarios("a", () => {});
    assert.equal(f.cancelados.length, 1);
    assert.equal(f.llamadas.filter((l) => l.tipo === "usuarios").length, 2);
});

test("REQ-013.13 escucharUltimoLog no re-suscribe si la ruta no cambia", () => {
    const f = repositorioFalso();
    const servicio = crear(f.repo);
    servicio.escucharUltimoLog("a", "logs", () => {});
    servicio.escucharUltimoLog("a", "logs", () => {});
    assert.equal(f.llamadas.filter((l) => l.tipo === "ultimoLog").length, 1);

    servicio.escucharUltimoLog("a", "dayLogs", () => {});
    assert.equal(f.llamadas.filter((l) => l.tipo === "ultimoLog").length, 2);
    assert.equal(f.cancelados.length, 1);
});

test("REQ-013.14 evaluarAlertas deduplica por fecha de la lectura", () => {
    const f = repositorioFalso();
    const servicio = crear(f.repo);
    const sistema = {
        type: "Sensor", name: "X",
        sensors: { sensorNumber: 1, S0: { alias: "S", t: { notify: true, minValue: 5 } } },
        log: { date: "20260425 0246am", dataRaw: JSON.stringify([0, 0, 4, 0, 0, 0, 0, 0]) },
    };
    const primera = servicio.evaluarAlertas(sistema, "20260425 0246am");
    assert.equal(primera.sonar, true);
    assert.equal(primera.alarmas.length, 1);

    const segunda = servicio.evaluarAlertas(sistema, "20260425 0246am");
    assert.equal(segunda.sonar, false, "la misma fecha no vuelve a sonar");
    assert.deepEqual(segunda.alarmas, []);

    const tercera = servicio.evaluarAlertas(sistema, "20260425 0346am");
    assert.equal(tercera.sonar, true, "una fecha nueva si suena");
});

test("REQ-013.15 evaluarAlertas tolera dataRaw invalido", () => {
    const f = repositorioFalso();
    const servicio = crear(f.repo);
    const sistema = {
        type: "Sensor", name: "X", sensors: { sensorNumber: 1, S0: { t: { notify: true, minValue: 5 } } },
        log: { date: "20260425 0246am", dataRaw: "{no es json" },
    };
    const r = servicio.evaluarAlertas(sistema, "20260425 0246am");
    assert.deepEqual(r.alarmas, []);
    assert.equal(r.sonar, false);
});

test("REQ-013.16 marcarRetrasos ignora los equipos tipo Sensor", () => {
    const f = repositorioFalso();
    const servicio = crear(f.repo);
    const ahora = () => new Date(2026, 3, 25, 4, 46).getTime();
    const resultado = servicio.marcarRetrasos(ahora, {
        sensor: { type: "Sensor", log: { update: "20260425 0246am", safety: "true", voltage: "true" } },
        bomba: { type: "Bomba", log: { update: "20260425 0246am", safety: "true", voltage: "true" } },
    });
    assert.deepEqual(resultado, [{ clave: "bomba", etiqueta: "+2h" }]);
});

test("REQ-013.17 el error del repositorio llega a alError", () => {
    const f = repositorioFalso();
    f.repo.escucharSistema = (clave, alCambiar, alError) => {
        alError("fallo de permisos");
        return { ruta: "x", off: () => {} };
    };
    const servicio = crear(f.repo);
    const errores = [];
    servicio.cargar(["a"], { alCambiarSistema: () => {}, alError: (clave, e) => errores.push([clave, e]) });
    assert.deepEqual(errores, [["a", "fallo de permisos"]]);
});

test("REQ-013.18 sin repositorio el servicio falla con mensaje claro", () => {
    assert.throws(() => crear(null), /falta el repositorio/);
    assert.throws(() => crear({}), /no implementa escucharSistema/);
});
