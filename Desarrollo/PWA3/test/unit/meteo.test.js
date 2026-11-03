"use strict";

/**
 * REQ-032 - La meteorologia se pedia una vez por sistema.
 *
 * `getMetorologicalData(key)` hacia un `$.ajax` a OpenWeather **por cada sistema**, con las
 * coordenadas de cada uno. En una finca con varios sistemas las coordenadas son las mismas, asi
 * que se repetian peticiones identicas a un servicio externo lento (y con limite de 60/min).
 *
 * Este modulo cachea por coordenadas y comparte la peticion mientras esta en vuelo.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const meteo = require("../../assets/js/logic/meteo.js");

test("claveDeCache normaliza las coordenadas a 4 decimales", () => {
  assert.equal(meteo.claveDeCache(21.123456789, -101.987654321), "21.1235,-101.9877");
});

test("claveDeCache acepta numeros en texto (los inputs son cadenas)", () => {
  assert.equal(meteo.claveDeCache("21.5", "-101.5"), "21.5000,-101.5000");
});

test("claveDeCache devuelve null sin coordenadas utilizables", () => {
  assert.equal(meteo.claveDeCache(null, 10), null);
  assert.equal(meteo.claveDeCache(10, undefined), null);
  assert.equal(meteo.claveDeCache("", ""), null);
  assert.equal(meteo.claveDeCache("abc", 10), null);
});

test("dos sistemas con las mismas coordenadas hacen UNA sola peticion", async () => {
  let llamadas = 0;
  const cache = meteo.crearCache();

  const fabricar = async () => {
    llamadas += 1;
    return { temperatura: 20 };
  };

  const primera = await cache.obtener("21.5000,-101.5000", fabricar);
  const segunda = await cache.obtener("21.5000,-101.5000", fabricar);

  assert.deepEqual(primera, { temperatura: 20 });
  assert.deepEqual(segunda, { temperatura: 20 });
  assert.equal(llamadas, 1);
});

test("peticiones simultaneas comparten la misma promesa (sin duplicar)", async () => {
  let llamadas = 0;
  const cache = meteo.crearCache();

  const fabricar = () => {
    llamadas += 1;
    return new Promise((resolver) => setTimeout(() => resolver({ ok: true }), 10));
  };

  const resultados = await Promise.all([
    cache.obtener("10.0000,20.0000", fabricar),
    cache.obtener("10.0000,20.0000", fabricar),
    cache.obtener("10.0000,20.0000", fabricar),
  ]);

  assert.equal(llamadas, 1);
  assert.deepEqual(resultados, [{ ok: true }, { ok: true }, { ok: true }]);
});

test("coordenadas distintas si hacen peticiones distintas", async () => {
  let llamadas = 0;
  const cache = meteo.crearCache();

  const fabricar = async () => {
    llamadas += 1;
    return { ok: llamadas };
  };

  await cache.obtener("1.0000,1.0000", fabricar);
  await cache.obtener("2.0000,2.0000", fabricar);

  assert.equal(llamadas, 2);
});

test("la cache caduca pasado el tiempo indicado", async () => {
  let ahora = 1000;
  let llamadas = 0;
  const cache = meteo.crearCache({ ttlMs: 500, ahora: () => ahora });

  const fabricar = async () => {
    llamadas += 1;
    return { ok: llamadas };
  };

  await cache.obtener("1.0000,1.0000", fabricar);
  ahora += 100; // dentro del TTL
  await cache.obtener("1.0000,1.0000", fabricar);
  assert.equal(llamadas, 1);

  ahora += 1000; // fuera del TTL
  await cache.obtener("1.0000,1.0000", fabricar);
  assert.equal(llamadas, 2);
});

test("si la peticion falla no se cachea el error y se puede reintentar", async () => {
  let llamadas = 0;
  const cache = meteo.crearCache();

  const falla = async () => {
    llamadas += 1;
    throw new Error("sin red");
  };

  await assert.rejects(() => cache.obtener("1.0000,1.0000", falla));
  await assert.rejects(() => cache.obtener("1.0000,1.0000", falla));

  assert.equal(llamadas, 2);
});

test("el contador distingue peticiones reales de reutilizadas", async () => {
  const cache = meteo.crearCache();
  const fabricar = async () => ({ ok: true });

  await cache.obtener("1.0000,1.0000", fabricar);
  await cache.obtener("1.0000,1.0000", fabricar);
  await cache.obtener("1.0000,1.0000", fabricar);

  assert.equal(cache.peticiones.total, 1);
  assert.equal(cache.peticiones.reutilizadas, 2);
});
