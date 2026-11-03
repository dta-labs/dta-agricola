"use strict";

/**
 * REQ-025 - El aviso de salida no puede romper el flujo de sesion.
 *
 * El fallo real: `window.addEventListener("beforeunload", ...)` hacia
 * `document.getElementById("mensaje").innerHTML = ...` y `#mensaje` no existe en el DOM.
 * Resultado: `Uncaught TypeError: Cannot set properties of null` justo cuando Firebase Auth
 * navega para procesar el redirect de Google, lo que aborta el manejo de la sesion.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const aviso = require("../../assets/js/logic/aviso.js");

function crearDocumento(ids) {
  const existentes = new Set(ids || []);
  const escritos = [];

  return {
    escritos,
    getElementById(id) {
      if (!existentes.has(id)) return null;

      return {
        id,
        set innerHTML(valor) {
          escritos.push({ id, valor });
        },
        get innerHTML() {
          return "";
        },
      };
    },
  };
}

function crearVentana() {
  const listeners = {};

  return {
    listeners,
    addEventListener(tipo, manejador) {
      listeners[tipo] = listeners[tipo] || [];
      listeners[tipo].push(manejador);
    },
    disparar(tipo, evento) {
      const lista = listeners[tipo] || [];
      return lista.map((manejador) => manejador(evento));
    },
  };
}

test("escribirSiExiste devuelve true y escribe cuando el elemento existe", () => {
  const doc = crearDocumento(["mensaje"]);

  const escrito = aviso.escribirSiExiste(doc, "mensaje", "hola");

  assert.equal(escrito, true);
  assert.deepEqual(doc.escritos, [{ id: "mensaje", valor: "hola" }]);
});

test("escribirSiExiste devuelve false y NO lanza cuando el elemento no existe", () => {
  const doc = crearDocumento([]);

  const escrito = aviso.escribirSiExiste(doc, "mensaje", "hola");

  assert.equal(escrito, false);
  assert.deepEqual(doc.escritos, []);
});

test("escribirSiExiste tolera un documento nulo", () => {
  assert.equal(aviso.escribirSiExiste(null, "mensaje", "hola"), false);
  assert.equal(aviso.escribirSiExiste(undefined, "mensaje", "hola"), false);
});

test("instalarAvisoDeSalida registra un unico listener de beforeunload", () => {
  const win = crearVentana();
  const doc = crearDocumento(["mensaje"]);

  aviso.instalarAvisoDeSalida(win, doc, { id: "mensaje" });

  assert.equal(win.listeners.beforeunload.length, 1);
});

test("el listener NO lanza si el elemento aviso no existe (el fallo original)", () => {
  const win = crearVentana();
  const doc = crearDocumento([]);

  aviso.instalarAvisoDeSalida(win, doc, { id: "mensaje" });

  assert.doesNotThrow(() => {
    win.disparar("beforeunload", {});
  });
});

test("el listener escribe el aviso cuando el elemento existe", () => {
  const win = crearVentana();
  const doc = crearDocumento(["mensaje"]);

  aviso.instalarAvisoDeSalida(win, doc, { id: "mensaje" });
  win.disparar("beforeunload", {});

  assert.equal(doc.escritos.length, 1);
  assert.equal(doc.escritos[0].id, "mensaje");
});

test("sin cambios pendientes NO se pide confirmacion al salir", () => {
  const win = crearVentana();
  const doc = crearDocumento(["mensaje"]);

  aviso.instalarAvisoDeSalida(win, doc, {
    id: "mensaje",
    hayCambios: () => false,
  });

  const evento = { preventDefault() { this.previno = true; } };
  const resultados = win.disparar("beforeunload", evento);

  assert.equal(evento.previno, undefined);
  assert.equal(resultados[0], undefined);
});

test("con cambios pendientes se pide confirmacion al salir", () => {
  const win = crearVentana();
  const doc = crearDocumento(["mensaje"]);

  aviso.instalarAvisoDeSalida(win, doc, {
    id: "mensaje",
    hayCambios: () => true,
  });

  const evento = { preventDefault() { this.previno = true; } };
  win.disparar("beforeunload", evento);

  assert.equal(evento.previno, true);
  assert.equal(evento.returnValue, "");
});

test("si hayCambios lanza, el listener sigue sin romper la salida", () => {
  const win = crearVentana();
  const doc = crearDocumento(["mensaje"]);

  aviso.instalarAvisoDeSalida(win, doc, {
    id: "mensaje",
    hayCambios: () => {
      throw new Error("fallo simulado");
    },
  });

  assert.doesNotThrow(() => {
    win.disparar("beforeunload", {});
  });
});
