/**
 * REQ-032 - Cache de meteorologia.
 *
 * `getMetorologicalData(key)` pedia el tiempo a OpenWeather **una vez por sistema**. Varios
 * sistemas de la misma finca comparten coordenadas, asi que se repetian peticiones identicas a un
 * servicio externo lento (y con limite de 60 peticiones/minuto en el plan gratuito).
 *
 * Reglas:
 *  1. La clave son las coordenadas redondeadas: misma ubicacion -> misma entrada.
 *  2. Mientras una peticion esta en vuelo, las demas esperan a ESA promesa (nada de duplicar).
 *  3. Los errores no se cachean: un fallo de red se puede reintentar.
 *
 * UMD: <script> (window.DTALogic.meteo) y require() en Node.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.DTALogic = raiz.DTALogic || {};
    raiz.DTALogic.meteo = fabrica();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Diez minutos: el tiempo no cambia lo bastante como para pedirlo mas a menudo.
  const TTL_POR_DEFECTO = 10 * 60 * 1000;

  /**
   * Normaliza unas coordenadas a una clave de cache.
   *
   * @param {number|string} lat
   * @param {number|string} lon
   * @returns {string|null} "lat,lon" con 4 decimales, o null si no sirven.
   */
  function claveDeCache(lat, lon) {
    const convertir = function (valor) {
      if (valor === null || valor === undefined || valor === "") return null;

      const numero = parseFloat(valor);

      return isNaN(numero) ? null : numero.toFixed(4);
    };

    const latitud = convertir(lat);
    const longitud = convertir(lon);

    if (latitud === null || longitud === null) return null;

    return latitud + "," + longitud;
  }

  /**
   * Crea un cache con deduplicacion de peticiones en vuelo.
   *
   * @param {object} [opciones] `ttlMs` y `ahora` (reloj inyectable, para poder probarlo).
   * @returns {object} `{ obtener(clave, fabricar), peticiones, limpiar() }`
   */
  function crearCache(opciones) {
    const ajustes = opciones || {};
    const ttlMs = (typeof ajustes.ttlMs === "number" && ajustes.ttlMs >= 0)
      ? ajustes.ttlMs
      : TTL_POR_DEFECTO;
    const ahora = (typeof ajustes.ahora === "function") ? ajustes.ahora : function () {
      return Date.now();
    };

    const guardado = Object.create(null); // clave -> { valor, expira }
    const enVuelo = Object.create(null);  // clave -> promesa
    const peticiones = { total: 0, reutilizadas: 0 };

    function obtener(clave, fabricar) {
      if (typeof fabricar !== "function") {
        return Promise.reject(new Error("meteo: falta la funcion que obtiene los datos"));
      }

      const entrada = guardado[clave];

      if (entrada && entrada.expira > ahora()) {
        peticiones.reutilizadas += 1;
        return Promise.resolve(entrada.valor);
      }

      if (enVuelo[clave]) {
        peticiones.reutilizadas += 1;
        return enVuelo[clave];
      }

      peticiones.total += 1;

      const promesa = Promise.resolve()
        .then(fabricar)
        .then(function (valor) {
          guardado[clave] = { valor: valor, expira: ahora() + ttlMs };
          delete enVuelo[clave];
          return valor;
        })
        .catch(function (error) {
          // Un fallo no se cachea: la proxima vez se vuelve a intentar.
          delete enVuelo[clave];
          throw error;
        });

      enVuelo[clave] = promesa;

      return promesa;
    }

    function limpiar() {
      Object.keys(guardado).forEach(function (clave) {
        delete guardado[clave];
      });
    }

    return {
      obtener: obtener,
      limpiar: limpiar,
      peticiones: peticiones,
      ttlMs: ttlMs,
    };
  }

  return {
    TTL_POR_DEFECTO: TTL_POR_DEFECTO,
    claveDeCache: claveDeCache,
    crearCache: crearCache,
  };
});
