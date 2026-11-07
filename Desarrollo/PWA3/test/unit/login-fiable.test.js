"use strict";

/**
 * REQ-035 - Login fiable: dominio de autenticacion, metodo de acceso y cierre de sesion.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const login = require("../../assets/js/logic/login.js");

const POR_DEFECTO = "dta-agricola.firebaseapp.com";

test("REQ-035.1 en Firebase Hosting el authDomain es el propio dominio (sin puerto)", () => {
    assert.equal(login.authDomainPara("dta-agricola.web.app", POR_DEFECTO), "dta-agricola.web.app");
    assert.equal(login.authDomainPara("DTA-Agricola.web.app", POR_DEFECTO), "dta-agricola.web.app");
    assert.equal(login.authDomainPara("dta-agricola--pwa3-ab12cd.web.app", POR_DEFECTO), "dta-agricola--pwa3-ab12cd.web.app");
    assert.equal(login.authDomainPara("dta-agricola.firebaseapp.com", POR_DEFECTO), "dta-agricola.firebaseapp.com");
});

test("REQ-035.2 fuera de Firebase Hosting se conserva el authDomain de la configuracion", () => {
    for (const host of ["localhost:8090", "127.0.0.1:5502", "[::1]:3000", "192.168.1.20:8090", "dtaamerica.com", "", null]) {
        assert.equal(login.authDomainPara(host, POR_DEFECTO), POR_DEFECTO, String(host));
    }
});

test("REQ-035.3 un dominio que solo contiene web.app no se toma por hosting", () => {
    assert.equal(login.esHostingDeFirebase("web.app.atacante.com"), false);
    assert.equal(login.esHostingDeFirebase("webXapp"), false);
});

test("REQ-035.4 entornos locales: localhost, loopback y redes privadas", () => {
    for (const host of ["localhost", "localhost:8090", "127.0.0.1:5502", "[::1]:3000", "app.localhost",
        "10.0.0.5", "192.168.1.20:8090", "172.16.0.1", "172.31.255.255"]) {
        assert.equal(login.esEntornoLocal(host), true, host);
    }
    for (const host of ["dta-agricola.web.app", "172.32.0.1", "8.8.8.8", "", null, undefined]) {
        assert.equal(login.esEntornoLocal(host), false, String(host));
    }
});

test("REQ-035.5 Google: popup en local, redireccion en hosting", () => {
    assert.equal(login.metodoDeAccesoGoogle("localhost:8090"), "popup");
    assert.equal(login.metodoDeAccesoGoogle("127.0.0.1:5502"), "popup");
    assert.equal(login.metodoDeAccesoGoogle("dta-agricola.web.app"), "redirect");
    assert.equal(login.metodoDeAccesoGoogle("dta-agricola--pwa3-ab12cd.web.app"), "redirect");
});

test("REQ-035.6 el nulo del observador se respeta si el usuario pidio salir", () => {
    assert.equal(login.debeIgnorarSesionNula({ huboSesion: true, cierrePedido: true }), false);
    assert.equal(login.debeIgnorarSesionNula({ huboSesion: false, cierrePedido: false }), false);
    assert.equal(login.debeIgnorarSesionNula({ huboSesion: false, cierrePedido: true }), false);
    assert.equal(login.debeIgnorarSesionNula(null), false);
});

test("REQ-035.7 el nulo transitorio tras una sesion valida se ignora", () => {
    assert.equal(login.debeIgnorarSesionNula({ huboSesion: true, cierrePedido: false }), true);
});

test("REQ-035.8 mensajes para los codigos actuales de Firebase", () => {
    assert.match(login.mensajeDeError({ code: "auth/invalid-credential" }), /incorrect/i);
    assert.match(login.mensajeDeError({ code: "auth/invalid-login-credentials" }), /incorrect/i);
    assert.match(login.mensajeDeError({ code: "auth/too-many-requests" }), /intentos/i);
    assert.match(login.mensajeDeError({ code: "auth/missing-email" }), /correo/i);
});

test("REQ-039.1 esCorreoValido", () => {
  for (const correo of ["a@b.co", " qa@dtaamerica.com ", "nombre.apellido+x@dominio.com.mx"]) {
    assert.equal(login.esCorreoValido(correo), true, correo);
  }
  for (const correo of ["", "   ", "sin-arroba", "a@b", "a @b.co", "@b.co", null, undefined, 5]) {
    assert.equal(login.esCorreoValido(correo), false, String(correo));
  }
});

test("REQ-039.2 debeAvisarError: solo errores de Firebase y no la ventana cerrada", () => {
  assert.equal(login.debeAvisarError({ code: "auth/wrong-password" }), true);
  assert.equal(login.debeAvisarError({ code: "auth/popup-closed-by-user" }), false);
  assert.equal(login.debeAvisarError({ code: "auth/cancelled-popup-request" }), false);
  assert.equal(login.debeAvisarError("auth/popup-closed-by-user"), false);
  assert.equal(login.debeAvisarError(new Error("otra cosa")), false);
  assert.equal(login.debeAvisarError(null), false);
});

test("REQ-039.3 auth/internal-error con INVALID_LOGIN_CREDENTIALS se explica como credenciales incorrectas", () => {
  const error = { code: "auth/internal-error", message: '{"error":{"code":400,"message":"INVALID_LOGIN_CREDENTIALS"}}' };
  assert.match(login.mensajeDeError(error), /incorrect/i);
  assert.match(login.mensajeDeError({ code: "auth/internal-error", message: "otra cosa" }), /auth\/internal-error/);
});
