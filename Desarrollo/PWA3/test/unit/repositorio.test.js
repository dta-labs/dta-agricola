/**
 * REQ-010 - El repositorio construye las rutas y consultas correctas.
 * Se prueba con un adaptador FALSO: ninguna llamada sale a Firebase.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crear: crearRepo } = require("../../assets/js/services/repositorio.js");

function adaptadorFalso() {
    const llamadas = [];
    const emisores = [];
    const cancelados = [];

    const adaptador = {
        escuchar(ruta, alCambiar, alError) {
            llamadas.push({ metodo: "escuchar", ruta });
            emisores.push(alCambiar);
            const indice = emisores.length - 1;
            return () => cancelados.push(indice);
        },
        escucharUltimos(ruta, n, alCambiar, alError) {
            llamadas.push({ metodo: "escucharUltimos", ruta, n });
            emisores.push(alCambiar);
            const indice = emisores.length - 1;
            return () => cancelados.push(indice);
        },
        leer(ruta) {
            llamadas.push({ metodo: "leer", ruta });
            return Promise.resolve({ ruta });
        },
        leerUltimos(ruta, n) {
            llamadas.push({ metodo: "leerUltimos", ruta, n });
            return Promise.resolve({ ruta, n });
        },
        leerRango(ruta, campo, desde, hasta) {
            llamadas.push({ metodo: "leerRango", ruta, campo, desde, hasta });
            return Promise.resolve({ ruta, desde, hasta });
        },
    };

    return { adaptador, llamadas, emisores, cancelados };
}

test("REQ-010.1 escucharSistema apunta a systems/{clave}/settings", () => {
    const f = adaptadorFalso();
    const repo = crearRepo(f.adaptador);
    const sub = repo.escucharSistema("abc", () => {});
    assert.equal(f.llamadas[0].metodo, "escuchar");
    assert.equal(f.llamadas[0].ruta, "systems/abc/settings");
    assert.equal(sub.ruta, "systems/abc/settings");
});

test("REQ-010.2 escucharSistema entrega los cambios y permite cancelar", () => {
    const f = adaptadorFalso();
    const repo = crearRepo(f.adaptador);
    const recibidos = [];
    const sub = repo.escucharSistema("abc", (v) => recibidos.push(v));
    f.emisores[0]("snapshot-1");
    f.emisores[0]("snapshot-2");
    assert.deepEqual(recibidos, ["snapshot-1", "snapshot-2"]);
    sub.off();
    assert.deepEqual(f.cancelados, [0]);
});

test("REQ-010.3 escucharUsuariosSistema apunta a systems/{clave}/users", () => {
    const f = adaptadorFalso();
    crearRepo(f.adaptador).escucharUsuariosSistema("abc", () => {});
    assert.equal(f.llamadas[0].ruta, "systems/abc/users");
});

test("REQ-010.4 escucharUltimoLog usa limitToLast(1)", () => {
    const f = adaptadorFalso();
    crearRepo(f.adaptador).escucharUltimoLog("abc", "dayLogs", () => {});
    assert.equal(f.llamadas[0].metodo, "escucharUltimos");
    assert.equal(f.llamadas[0].ruta, "systems/abc/dayLogs");
    assert.equal(f.llamadas[0].n, 1);
});

test("REQ-010.5 leerLogs normaliza el directorio con o sin barra inicial", async () => {
    const f = adaptadorFalso();
    const repo = crearRepo(f.adaptador);
    await repo.leerLogs("abc", "/logs", 7);
    await repo.leerLogs("abc", "logs", 7);
    assert.deepEqual(f.llamadas.map((l) => l.ruta), ["systems/abc/logs", "systems/abc/logs"]);
    assert.deepEqual(f.llamadas.map((l) => l.n), [7, 7]);
});

test("REQ-010.6 leerLogsPorRango filtra por date y cierra con \\uf8ff", async () => {
    const f = adaptadorFalso();
    await crearRepo(f.adaptador).leerLogsPorRango("abc", "/logs", "2026-01-01", "2026-01-31");
    const llamada = f.llamadas[0];
    assert.equal(llamada.metodo, "leerRango");
    assert.equal(llamada.ruta, "systems/abc/logs");
    assert.equal(llamada.campo, "date");
    assert.equal(llamada.desde, "2026-01-01");
    assert.equal(llamada.hasta, "2026-01-31\uf8ff");
});

test("REQ-010.7 leerCultivos y leerConfiguracion usan las rutas del esquema", async () => {
    const f = adaptadorFalso();
    const repo = crearRepo(f.adaptador);
    await repo.leerCultivos();
    await repo.leerConfiguracion("sensor");
    assert.deepEqual(f.llamadas.map((l) => l.ruta), ["cultivos", "configurations/sensor"]);
});

test("REQ-010.8 un adaptador incompleto falla con mensaje claro", () => {
    assert.throws(() => crearRepo({}), /no implementa escuchar/);
    assert.throws(() => crearRepo(null), /falta el adaptador/);
});
