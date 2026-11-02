/**
 * REQ-012 - Servicio de autenticacion con adaptador falso.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crear } = require("../../assets/js/services/autenticacion.js");

function adaptadorFalso() {
    const estado = { observador: null, cerrado: 0 };
    return {
        estado,
        adaptador: {
            observar(alCambiar) { estado.observador = alCambiar; },
            cerrarSesion() { estado.cerrado += 1; return Promise.resolve("ok"); },
        },
    };
}

test("REQ-012.1 observar entrega el usuario normalizado", () => {
    const f = adaptadorFalso();
    const recibidos = [];
    crear(f.adaptador).observar((sesion) => recibidos.push(sesion));
    f.estado.observador({ email: "ana@x.com", uid: "1" });
    assert.equal(recibidos.length, 1);
    assert.equal(recibidos[0].autenticado, true);
    assert.equal(recibidos[0].usuario.email, "ana@x.com");
});

test("REQ-012.2 observar acepta el envoltorio { user } de FirebaseUI", () => {
    const f = adaptadorFalso();
    const recibidos = [];
    crear(f.adaptador).observar((sesion) => recibidos.push(sesion));
    f.estado.observador({ user: { email: "luis@x.com" } });
    assert.equal(recibidos[0].autenticado, true);
    assert.equal(recibidos[0].usuario.email, "luis@x.com");
});

test("REQ-012.3 sin usuario se informa autenticado:false", () => {
    const f = adaptadorFalso();
    const recibidos = [];
    crear(f.adaptador).observar((sesion) => recibidos.push(sesion));
    f.estado.observador(null);
    f.estado.observador({});
    assert.deepEqual(recibidos[0], { autenticado: false, usuario: null });
    assert.deepEqual(recibidos[1], { autenticado: false, usuario: null });
});

test("REQ-012.4 cerrarSesion delega en el adaptador", async () => {
    const f = adaptadorFalso();
    const resultado = await crear(f.adaptador).cerrarSesion();
    assert.equal(resultado, "ok");
    assert.equal(f.estado.cerrado, 1);
});

test("REQ-012.5 validaciones de contrato", () => {
    assert.throws(() => crear(null), /falta el adaptador/);
    assert.throws(() => crear({}), /no implementa observar/);
    assert.throws(() => crear({ observar() {} }), /no implementa cerrarSesion/);
    assert.throws(() => crear(adaptadorFalso().adaptador).observar("no"), /necesita una funcion/);
});
