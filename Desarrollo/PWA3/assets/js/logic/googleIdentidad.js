/**
 * REQ-027 - Acceso con Google sin el iframe de Firebase.
 *
 * `signInWithRedirect` depende de `__/auth/iframe`, que a su vez carga
 * `https://apis.google.com/js/api.js`. Cuando el navegador (Edge con prevencion de seguimiento,
 * bloqueadores o antivirus) bloquea ese script de terceros, el iframe falla con "Network Error"
 * y la sesion no se completa nunca: el usuario vuelve de Google y sigue en el login.
 *
 * Este modulo encapsula las decisiones de la alternativa: pedir el token a Google Identity
 * Services (GIS) y canjearlo con `signInWithCredential`, que NO usa el iframe.
 *
 * UMD: <script> (window.DTALogic.googleIdentidad) y require() en Node.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.DTALogic = raiz.DTALogic || {};
    raiz.DTALogic.googleIdentidad = fabrica();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Identificador publico del cliente OAuth del proyecto (visible en cualquier flujo de Google).
  // Se puede sobrescribir con `config.googleClientId` en firebaseConfig.js.
  const CLIENT_ID_POR_DEFECTO =
    "157203634312-c2v11taeeh82eq3dendmhbaofu2uqdlq.apps.googleusercontent.com";

  // Ancho minimo del boton oficial: por debajo, Google lo recorta.
  const ANCHO_MINIMO = 200;

  // GIS exige un nombre de funcion global (no acepta una funcion anonima como callback).
  const CALLBACK_GLOBAL = "onCredencialDeGoogle";

  /**
   * Comprueba si Google Identity Services esta disponible en la pagina.
   *
   * @param {Window|null|undefined} ventana
   * @returns {boolean}
   */
  function hayGIS(ventana) {
    return !!(
      ventana
      && ventana.google
      && ventana.google.accounts
      && ventana.google.accounts.id
      && typeof ventana.google.accounts.id.initialize === "function"
    );
  }

  /**
   * Extrae el id_token de la respuesta de GIS.
   *
   * @param {object|null|undefined} respuesta
   * @returns {string|null} token utilizable o null si no lo hay.
   */
  function idTokenDesdeRespuesta(respuesta) {
    if (!respuesta || typeof respuesta !== "object") return null;

    const token = respuesta.credential;

    if (typeof token !== "string") return null;
    if (token.trim() === "") return null;

    return token;
  }

  /**
   * Resuelve el client_id que debe usar GIS.
   *
   * @param {object|null|undefined} configuracion `config` de firebaseConfig.js
   * @returns {string}
   */
  function clientIdDesdeConfig(configuracion) {
    const configurado = configuracion && configuracion.googleClientId;

    if (typeof configurado === "string" && configurado.trim() !== "") {
      return configurado.trim();
    }

    return CLIENT_ID_POR_DEFECTO;
  }

  /**
   * Opciones para `google.accounts.id.initialize`.
   *
   * `auto_select` se deja en false a proposito: con true Google entra sin mostrar la cuenta, y
   * eso impide elegir usuario en equipos compartidos.
   *
   * @param {string} [clientId]
   * @returns {object}
   */
  function opcionesDeInicializacion(clientId) {
    return {
      client_id: (typeof clientId === "string" && clientId.trim() !== "")
        ? clientId.trim()
        : CLIENT_ID_POR_DEFECTO,
      auto_select: false,
      ux_mode: "popup",
      callback: CALLBACK_GLOBAL,
    };
  }


  /**
   * Opciones de `google.accounts.id.renderButton`.
   *
   * Se usa el boton oficial en lugar de `prompt()` porque One Tap depende de FedCM, y con FedCM
   * desactivado (Edge, ajustes del sitio) `prompt()` no muestra nada. El boton con
   * `ux_mode: "popup"` abre el dialogo clasico de Google y no necesita FedCM.
   *
   * @param {number|string} [ancho] ancho disponible en px.
   * @returns {object}
   */
  function opcionesDelBoton(ancho) {
    const numero = parseInt(ancho, 10);
    const anchoFinal = (isNaN(numero) || numero < ANCHO_MINIMO) ? ANCHO_MINIMO : numero;

    return {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "left",
      width: anchoFinal,
      ux_mode: "popup",
    };
  }

  return {
    ANCHO_MINIMO: ANCHO_MINIMO,
    CLIENT_ID_POR_DEFECTO: CLIENT_ID_POR_DEFECTO,
    CALLBACK_GLOBAL: CALLBACK_GLOBAL,
    hayGIS: hayGIS,
    idTokenDesdeRespuesta: idTokenDesdeRespuesta,
    clientIdDesdeConfig: clientIdDesdeConfig,
    opcionesDeInicializacion: opcionesDeInicializacion,
    opcionesDelBoton: opcionesDelBoton,
  };
});
