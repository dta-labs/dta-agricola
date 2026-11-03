/**
 * REQ-025 - Aviso de salida seguro.
 *
 * Por que existe este modulo: el listener de `beforeunload` hacia
 * `document.getElementById("mensaje").innerHTML = ...` y ese elemento no existe en el DOM.
 * Cuando Firebase Auth navega para procesar el redirect de Google, el navegador dispara
 * `beforeunload`, el listener lanzaba `Uncaught TypeError` y eso abortaba el manejo de la
 * sesion: el login volvia pero nunca se entraba.
 *
 * Reglas que aplica:
 *  1. Escribir en el DOM solo si el elemento existe.
 *  2. No pedir confirmacion si no hay cambios pendientes: un `beforeunload` que siempre
 *     interrumpe estorba a los flujos de autenticacion y a la propia navegacion.
 *  3. Nunca lanzar: un fallo del aviso no puede tumbar la salida de la pagina.
 *
 * UMD: se carga como <script> (window.DTALogic.aviso) y con require() en Node.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.DTALogic = raiz.DTALogic || {};
    raiz.DTALogic.aviso = fabrica();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ID_POR_DEFECTO = "mensaje";
  const TEXTO_POR_DEFECTO = "Si se va no se guardarán los datos";

  /**
   * Escribe texto en un elemento si existe.
   *
   * @param {Document|null|undefined} doc documento donde buscar.
   * @param {string} id identificador del elemento.
   * @param {string} texto contenido a escribir.
   * @returns {boolean} true si se escribio, false si el elemento no existe o algo fallo.
   */
  function escribirSiExiste(doc, id, texto) {
    if (!doc || typeof doc.getElementById !== "function") return false;

    try {
      const elemento = doc.getElementById(id);
      if (!elemento) return false;

      elemento.innerHTML = texto;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Instala el aviso de salida.
   *
   * @param {Window|null|undefined} win ventana donde registrar el evento.
   * @param {Document|null|undefined} doc documento donde escribir el aviso.
   * @param {object} [opciones] `id`, `texto` y `hayCambios` (funcion que decide si se avisa).
   * @returns {boolean} true si se registro el listener.
   */
  function instalarAvisoDeSalida(win, doc, opciones) {
    if (!win || typeof win.addEventListener !== "function") return false;

    const ajustes = opciones || {};
    const id = ajustes.id || ID_POR_DEFECTO;
    const texto = ajustes.texto || TEXTO_POR_DEFECTO;
    const hayCambios = typeof ajustes.hayCambios === "function" ? ajustes.hayCambios : null;

    const manejador = function (evento) {
      escribirSiExiste(doc, id, texto);

      if (!hayCambios) return undefined;

      let pendiente = false;
      try {
        pendiente = hayCambios() === true;
      } catch (error) {
        pendiente = false;
      }

      if (!pendiente) return undefined;

      const eventoReal = evento || {};

      try {
        if (typeof eventoReal.preventDefault === "function") eventoReal.preventDefault();
        eventoReal.returnValue = "";
      } catch (error) {
        // Un navegador puede prohibir tocar returnValue: se ignora a proposito.
      }

      return "";
    };

    win.addEventListener("beforeunload", manejador);

    return true;
  }

  return {
    ID_POR_DEFECTO,
    TEXTO_POR_DEFECTO,
    escribirSiExiste,
    instalarAvisoDeSalida,
  };
});
