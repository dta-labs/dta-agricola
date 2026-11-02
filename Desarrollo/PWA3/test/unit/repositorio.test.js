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
        escucharPorClave(ruta, clave, alCambiar, alError) {
            llamadas.push({ metodo: "escucharPorClave", ruta, clave });
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
        escribir(ruta, valor) {
            llamadas.push({ metodo: "escribir", ruta, valor });
            return Promise.resolve();
        },
        actualizar(ruta, valor) {
            llamadas.push({ metodo: "actualizar", ruta, valor });
            return Promise.resolve();
        },
        empujar(ruta, valor) {
            llamadas.push({ metodo: "empujar", ruta, valor });
            return Promise.resolve();
        },
        borrar(ruta) {
            llamadas.push({ metodo: "borrar", ruta });
            return Promise.resolve();
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

// ---------------------------- REQ-011: escrituras ----------------------------
const ultima = (f, metodo) => f.llamadas.filter((l) => l.metodo === metodo).pop();

test("REQ-011.1 escribirEstadoSistema actualiza solo settings/status", async () => {
    const f = adaptadorFalso();
    await crearRepo(f.adaptador).escribirEstadoSistema("k", "ON");
    assert.deepEqual(ultima(f, "actualizar"), { metodo: "actualizar", ruta: "systems/k/settings", valor: { status: "ON" } });
});

test("REQ-011.2 guardarSettingsSistema actualiza settings completo", async () => {
    const f = adaptadorFalso();
    await crearRepo(f.adaptador).guardarSettingsSistema("k", { name: "X", status: "OFF" });
    assert.equal(ultima(f, "actualizar").ruta, "systems/k/settings");
    assert.deepEqual(ultima(f, "actualizar").valor, { name: "X", status: "OFF" });
});

test("REQ-011.3 crearSistema escribe { settings } en systems/{clave}", async () => {
    const f = adaptadorFalso();
    await crearRepo(f.adaptador).crearSistema("k", { name: "Nuevo" });
    assert.deepEqual(ultima(f, "escribir"), { metodo: "escribir", ruta: "systems/k", valor: { settings: { name: "Nuevo" } } });
});

test("REQ-011.4 vincularUsuarioASistema escribe en las dos direcciones", async () => {
    const f = adaptadorFalso();
    await crearRepo(f.adaptador).vincularUsuarioASistema("ana.perez@x.com", "k", "propietario", "Ana");
    const rutas = f.llamadas.filter((l) => l.metodo === "actualizar").map((l) => l.ruta).sort();
    assert.deepEqual(rutas, ["systems/k/users", "users/ana-perez@x-com/systems"]);
    const enSistema = f.llamadas.find((l) => l.ruta === "systems/k/users");
    assert.deepEqual(enSistema.valor, { "ana-perez@x-com": { alias: "Ana", role: "propietario" } });
});

test("REQ-011.5 desvincularUsuarioDeSistema pone null en ambos lados", async () => {
    const f = adaptadorFalso();
    await crearRepo(f.adaptador).desvincularUsuarioDeSistema("k", "ana-perez@x.com");
    const valores = f.llamadas.filter((l) => l.metodo === "actualizar").map((l) => l.valor);
    assert.deepEqual(valores, [{ "ana-perez@x-com": null }, { k: null }]);
});

test("REQ-011.6 guardarPerfilUsuario escribe en users/{email}/profile", async () => {
    const f = adaptadorFalso();
    await crearRepo(f.adaptador).guardarPerfilUsuario("ana.perez@x.com", { telefono: "555" });
    assert.equal(ultima(f, "actualizar").ruta, "users/ana-perez@x-com/profile");
});

test("REQ-011.7 registrarAcceso anade la entrada con marca de tiempo", async () => {
    const f = adaptadorFalso();
    await crearRepo(f.adaptador).registrarAcceso("u1", "login", "ok");
    const llamada = ultima(f, "actualizar");
    assert.equal(llamada.ruta, "access/u1");
    const claves = Object.keys(llamada.valor);
    assert.equal(claves.length, 1);
    assert.deepEqual(llamada.valor[claves[0]], { accessType: "login", data: "ok" });
});

test("REQ-011.8 leerMediciones devuelve el array de valores", async () => {
    const f = adaptadorFalso();
    f.adaptador.leerUltimos = (ruta, n) => Promise.resolve({ val: () => ({ a: { v: 1 }, b: { v: 2 } }) });
    const mediciones = await crearRepo(f.adaptador).leerMediciones("k", 2);
    assert.deepEqual(mediciones, [{ v: 1 }, { v: 2 }]);
});

test("REQ-011.9 leerMediciones sin datos devuelve lista vacia", async () => {
    const f = adaptadorFalso();
    f.adaptador.leerUltimos = () => Promise.resolve({ val: () => null });
    assert.deepEqual(await crearRepo(f.adaptador).leerMediciones("k", 2), []);
});

test("REQ-011.10 escucharUsuarioPorClave consulta users por clave y convierte los puntos", () => {
    const f = adaptadorFalso();
    const repo = crearRepo(f.adaptador);
    const sub = repo.escucharUsuarioPorClave("ana.perez@x.com", () => {});
    assert.deepEqual(f.llamadas[0], { metodo: "escucharPorClave", ruta: "users", clave: "ana-perez@x-com" });
    assert.equal(sub.ruta, "users/ana-perez@x-com");
});
