"use strict";

/**
 * REQ-027 - Acceso con Google sin el iframe de Firebase.
 *
 * El flujo `signInWithRedirect` depende de `__/auth/iframe`, que carga `apis.google.com/js/api.js`.
 * Cuando el navegador bloquea ese script de terceros, el iframe falla con "Network Error" y la
 * sesion no se completa nunca.
 *
 * La alternativa es pedir el token directamente a Google Identity Services (GIS) y canjearlo con
 * `signInWithCredential`, que no usa el iframe.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const gis = require("../../assets/js/logic/googleIdentidad.js");

test("hayGIS devuelve false si la pagina no cargo Google Identity Services", () => {
  assert.equal(gis.hayGIS(undefined), false);
  assert.equal(gis.hayGIS(null), false);
  assert.equal(gis.hayGIS({}), false);
  assert.equal(gis.hayGIS({ google: {} }), false);
  assert.equal(gis.hayGIS({ google: { accounts: {} } }), false);
  assert.equal(gis.hayGIS({ google: { accounts: { id: {} } } }), false);
});

test("hayGIS devuelve true cuando initialize() esta disponible", () => {
  const ventana = { google: { accounts: { id: { initialize() {} } } } };

  assert.equal(gis.hayGIS(ventana), true);
});

test("idTokenDesdeRespuesta devuelve el token cuando Google lo entrega", () => {
  assert.equal(gis.idTokenDesdeRespuesta({ credential: "abc.def.ghi" }), "abc.def.ghi");
});

test("idTokenDesdeRespuesta descarta respuestas sin token", () => {
  assert.equal(gis.idTokenDesdeRespuesta(null), null);
  assert.equal(gis.idTokenDesdeRespuesta(undefined), null);
  assert.equal(gis.idTokenDesdeRespuesta({}), null);
  assert.equal(gis.idTokenDesdeRespuesta({ credential: "" }), null);
  assert.equal(gis.idTokenDesdeRespuesta({ credential: "   " }), null);
  assert.equal(gis.idTokenDesdeRespuesta({ credential: 42 }), null);
});

test("idTokenDesdeRespuesta tolera que Google cancele el dialogo", () => {
  assert.equal(gis.idTokenDesdeRespuesta({ type: "cancel_called" }), null);
});

test("opcionesDeInicializacion usa el client_id indicado y un callback global", () => {
  const opciones = gis.opcionesDeInicializacion("cliente-de-prueba");

  assert.equal(opciones.client_id, "cliente-de-prueba");
  assert.equal(opciones.ux_mode, "popup");
  assert.equal(opciones.auto_select, false);
  assert.equal(typeof opciones.callback, "string");
  assert.ok(opciones.callback.length > 0);
});

test("opcionesDeInicializacion cae al client_id por defecto", () => {
  const opciones = gis.opcionesDeInicializacion();

  assert.equal(opciones.client_id, gis.CLIENT_ID_POR_DEFECTO);
  assert.ok(gis.CLIENT_ID_POR_DEFECTO.indexOf(".apps.googleusercontent.com") > 0);
});

test("clientIdDesdeConfig prefiere el valor configurado", () => {
  assert.equal(
    gis.clientIdDesdeConfig({ googleClientId: "otro-cliente" }),
    "otro-cliente"
  );
});

test("clientIdDesdeConfig cae al valor por defecto si no hay configuracion", () => {
  assert.equal(gis.clientIdDesdeConfig(null), gis.CLIENT_ID_POR_DEFECTO);
  assert.equal(gis.clientIdDesdeConfig({}), gis.CLIENT_ID_POR_DEFECTO);
  assert.equal(gis.clientIdDesdeConfig({ googleClientId: "" }), gis.CLIENT_ID_POR_DEFECTO);
});
