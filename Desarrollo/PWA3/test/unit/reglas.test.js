/**
 * REQ-022 - Invariantes de las reglas de la base de datos.
 *
 * No sustituye a probar contra Firebase: fija por que el acceso anonimo esta cerrado y evita que
 * vuelva `".read": true` en la raiz, que es lo que habia antes.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const reglas = require("../../database.rules.json").rules;

test("REQ-022.1 la raiz no permite lectura ni escritura anonima", () => {
    assert.equal(reglas[".read"], false);
    assert.equal(reglas[".write"], false);
});

test("REQ-022.2 ninguna regla es el literal true", () => {
    const culpables = [];
    (function recorrer(nodo, ruta) {
        if (!nodo || typeof nodo !== "object") return;
        for (const clave of Object.keys(nodo)) {
            const valor = nodo[clave];
            if ((clave === ".read" || clave === ".write") && valor === true) culpables.push(ruta + "/" + clave);
            if (valor && typeof valor === "object") recorrer(valor, ruta + "/" + clave);
        }
    })(reglas, "");
    assert.deepEqual(culpables, [], "no debe quedar .read/.write: true");
});

test("REQ-022.3 systems, users, cultivos y configurations exigen sesion", () => {
    // El permiso vive en systems/$systemId: Firebase lo hereda a settings, users y logs.
    assert.match(reglas.systems.$systemId[".read"], /auth\s*!=\s*null/);
    assert.match(reglas.systems.$systemId[".write"], /auth\s*!=\s*null/);
    assert.match(reglas.users[".read"], /auth\s*!=\s*null/);
    assert.match(reglas.cultivos[".read"], /auth\s*!=\s*null/);
    assert.match(reglas.configurations.$tipo[".read"], /auth\s*!=\s*null/);
    assert.match(reglas.access.$uid[".read"], /auth\s*!=\s*null/);
});

test("REQ-022.4 se conservan los indices de date", () => {
    const sistema = reglas.systems.$systemId;
    assert.deepEqual(sistema.logs[".indexOn"], ["date"]);
    assert.deepEqual(sistema.dayLogs[".indexOn"], ["date"]);
});

test("REQ-022.5 los logs no son legibles sin sesion", () => {
    const sistema = reglas.systems.$systemId;
    assert.match(sistema.logs[".read"], /auth\s*!=\s*null/);
    assert.match(sistema.dayLogs[".read"], /auth\s*!=\s*null/);
});
