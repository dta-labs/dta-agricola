/**
 * REQ-023 - Gestion de usuarios: perfil, preferencias y planes (logica pura).
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const perfil = require("../../assets/js/logic/perfil.js");

test("REQ-023.1 perfilDesdeUsuario reparte el nombre de Google en nombres y apellidos", () => {
    const p = perfil.perfilDesdeUsuario({ displayName: "Ana Maria Perez Lopez", email: "ana@x.com" }, null);
    assert.equal(p.nombres, "Ana Maria");
    assert.equal(p.apellidos, "Perez Lopez");
    assert.equal(p.email, "ana@x.com");
    assert.equal(p.plan, "gratis");
});

test("REQ-023.2 lo guardado tiene prioridad sobre lo que devuelve Google", () => {
    const p = perfil.perfilDesdeUsuario(
        { displayName: "Ana Perez", email: "ana@x.com", phoneNumber: "+52 555" },
        { nombres: "Ana Maria", telefono: "555-1234", rol: "propietario" });
    assert.equal(p.nombres, "Ana Maria");
    assert.equal(p.telefono, "555-1234");
    assert.equal(p.rol, "propietario");
});

test("REQ-023.3 sin displayName usa el correo como nombre", () => {
    const p = perfil.perfilDesdeUsuario({ email: "solo.correo@x.com" }, null);
    assert.equal(p.nombres, "solo.correo");
    assert.equal(p.apellidos, "");
});

test("REQ-023.4 un usuario de Google se detecta por su proveedor", () => {
    assert.equal(perfil.esDeGoogle({ providerData: [{ providerId: "google.com" }] }), true);
    assert.equal(perfil.esDeGoogle({ providerData: [{ providerId: "password" }] }), false);
    assert.equal(perfil.esDeGoogle(null), false);
});

test("REQ-023.5 combinarProblemas anade el texto de Otros", () => {
    const r = perfil.combinarProblemas(["Optimizacion del riego", "Otros"], "  Falta de agua  ");
    assert.deepEqual(r, ["Optimizacion del riego", "Otros: Falta de agua"]);
});

test("REQ-023.6 si elige Todos los anteriores se ignoran los demas", () => {
    assert.deepEqual(perfil.combinarProblemas(["Todos los anteriores", "Otros"], "x"), ["Todos los anteriores"]);
});

test("REQ-023.7 validarPerfil exige nombres, correo valido y describir Otros", () => {
    const errores = perfil.validarPerfil({ nombres: "", email: "mal", problemas: ["Otros"], otrosProblemas: "" });
    assert.equal(errores.length, 3);
    assert.match(errores.join(" | "), /nombre/i);
    assert.match(errores.join(" | "), /correo/i);
    assert.match(errores.join(" | "), /Otros/i);
    assert.deepEqual(perfil.validarPerfil({ nombres: "Ana", email: "ana@x.com", problemas: ["Otros"], otrosProblemas: "sequia" }), []);
});

test("REQ-023.8 hay tres planes con sus precios y el gratis es el de defecto", () => {
    assert.equal(perfil.PLANES.length, 3);
    assert.deepEqual(perfil.PLANES.map((p) => p.id), ["gratis", "basico", "avanzado"]);
    // Precios confirmados por el usuario: Basico 500/5,000 y Avanzado 700/7,000.
    const basico = perfil.planPorId("basico");
    assert.match(basico.precio, /500\.00 al mes/);
    assert.match(basico.precio, /5,000\.00 al año/);
    const avanzado = perfil.planPorId("avanzado");
    assert.match(avanzado.precio, /700\.00 al mes/);
    assert.match(avanzado.precio, /7,000\.00 al año/);
    assert.equal(perfil.planPorId("inexistente").id, "gratis");
    assert.equal(perfil.planPorId(null).id, "gratis");
});

test("REQ-023.9 el plan gratis incluye 1 usuario, 1 parcela y 5 sensores", () => {
    const gratis = perfil.planPorId("gratis");
    const texto = gratis.caracteristicas.join(" | ").toLowerCase();
    assert.match(texto, /1 usuario/);
    assert.match(texto, /1 parcela/);
    assert.match(texto, /5 sensores/);
    assert.match(texto, /3 meses/);
});

test("REQ-023.10 los catalogos de opciones existen con sus valores", () => {
    assert.equal(perfil.OPCIONES.inversion.length, 3);
    assert.equal(perfil.OPCIONES.decision.length, 3);
    assert.equal(perfil.OPCIONES.entrevista.length, 3);
    assert.equal(perfil.OPCIONES.rol.length, 4);
    assert.equal(perfil.OPCIONES.problemas.length, 8);
});
