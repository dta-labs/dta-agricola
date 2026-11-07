/**
 * REQ-052 - dtaLector: leer identificadores con la camara (QR y codigos de barras) o por NFC.
 *
 * Sustituye a los dos lectores casi iguales de core.js (equipo y sensor), que solo leian QR.
 *   - Camara: html5-qrcode (assets/modules), QR + Data Matrix + barras lineales; usa el lector nativo
 *     del navegador (BarcodeDetector) cuando existe.
 *   - NFC: Web NFC (NDEFReader). Solo Chrome para Android, con HTTPS y un gesto del usuario.
 */
(function (raiz) {
    "use strict";

    var FORMATOS = ["QR_CODE", "DATA_MATRIX", "AZTEC", "PDF_417", "CODE_128", "CODE_39", "CODE_93",
        "EAN_13", "EAN_8", "UPC_A", "UPC_E", "ITF", "CODABAR"];

    /** Texto de una lectura NFC: primer registro de texto o URL; si no hay, el numero de serie de la etiqueta. */
    function textoDeNfc(evento, crearDecodificador) {
        var mensaje = evento && evento.message;
        var registros = (mensaje && mensaje.records) || [];
        for (var i = 0; i < registros.length; i += 1) {
            var r = registros[i];
            var esTexto = r.recordType === "text" || r.mediaType === "text/plain";
            if ((esTexto || r.recordType === "url") && r.data) {
                var texto = crearDecodificador(r.encoding || "utf-8").decode(r.data).trim();
                if (texto) return texto;
            }
        }
        return evento && evento.serialNumber ? String(evento.serialNumber).trim() : "";
    }

    function mensajeDeErrorDeCamara(error) {
        var nombre = error && error.name;
        if (nombre === "NotAllowedError" || nombre === "PermissionDeniedError") return "Permite el acceso a la cámara para leer el código.";
        if (nombre === "NotFoundError") return "No se encontró una cámara en este dispositivo.";
        return "No fue posible iniciar la cámara. Verifica que no la esté usando otra aplicación.";
    }

    /**
     * @param obtenerHtml5Qrcode  funcion -> { Html5Qrcode, Html5QrcodeSupportedFormats } (globales de la libreria)
     * @param obtenerVentana      funcion -> window (navigator, NDEFReader, AbortController, TextDecoder)
     */
    function crear(obtenerHtml5Qrcode, obtenerVentana) {

        function ventana() { return (obtenerVentana && obtenerVentana()) || {}; }

        function camaraDisponible() {
            var lib = obtenerHtml5Qrcode && obtenerHtml5Qrcode();
            var nav = ventana().navigator;
            return !!(lib && lib.Html5Qrcode && nav && nav.mediaDevices && nav.mediaDevices.getUserMedia);
        }

        function nfcDisponible() {
            return typeof ventana().NDEFReader === "function";
        }

        /**
         * Abre la camara en el elemento `idElemento`. Llama a alLeer(texto) con cada codigo leido.
         * Devuelve Promise<funcion detener>.
         */
        function iniciarCamara(idElemento, alLeer) {
            var lib = obtenerHtml5Qrcode && obtenerHtml5Qrcode();
            if (!camaraDisponible()) {
                return Promise.reject(new Error(lib && lib.Html5Qrcode
                    ? "La cámara requiere abrir la aplicación mediante HTTPS."
                    : "No fue posible cargar el lector de códigos."));
            }
            var tipos = lib.Html5QrcodeSupportedFormats || {};
            var formatos = FORMATOS.map(function (f) { return tipos[f]; }).filter(function (f) { return f !== undefined; });
            var lector = new lib.Html5Qrcode(idElemento, {
                formatsToSupport: formatos,
                experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                verbose: false
            });
            var detenido = false;
            function detener() {
                if (detenido) return Promise.resolve();
                detenido = true;
                return Promise.resolve()
                    .then(function () { return lector.stop(); })
                    .catch(function () {})
                    .then(function () { try { lector.clear(); } catch (e) { /* ya limpio */ } });
            }
            return lector.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    // Recuadro ancho: sirve para QR y para codigos de barras lineales.
                    qrbox: function (ancho, alto) {
                        return { width: Math.floor(ancho * 0.85), height: Math.floor(Math.min(alto, ancho) * 0.55) };
                    }
                },
                function (texto) {
                    if (detenido || !texto) return;
                    alLeer(String(texto).trim());
                },
                function () { /* fotograma sin codigo: normal */ }
            ).then(function () { return detener; }, function (error) {
                detenido = true;
                try { lector.clear(); } catch (e) { /* nada que limpiar */ }
                throw new Error(mensajeDeErrorDeCamara(error));
            });
        }

        /** Empieza a escuchar etiquetas NFC. Devuelve Promise<funcion detener>. */
        function leerNfc(alLeer, alError) {
            var v = ventana();
            if (!nfcDisponible()) return Promise.reject(new Error("Este dispositivo o navegador no permite leer NFC."));
            var controlador = typeof v.AbortController === "function" ? new v.AbortController() : null;
            var lector = new v.NDEFReader();
            lector.onreading = function (evento) {
                var texto = textoDeNfc(evento, function (codificacion) { return new v.TextDecoder(codificacion); });
                if (texto) alLeer(texto);
            };
            lector.onreadingerror = function () {
                if (alError) alError(new Error("No se pudo leer la etiqueta. Acércala de nuevo."));
            };
            return lector.scan(controlador ? { signal: controlador.signal } : undefined).then(function () {
                return function detener() { if (controlador) controlador.abort(); };
            }, function (error) {
                var nombre = error && error.name;
                throw new Error(nombre === "NotAllowedError" ? "Permite el acceso a NFC para leer la etiqueta." : "No se pudo activar NFC. Comprueba que esté encendido.");
            });
        }

        return {
            camaraDisponible: camaraDisponible,
            nfcDisponible: nfcDisponible,
            iniciarCamara: iniciarCamara,
            leerNfc: leerNfc
        };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { crear: crear, textoDeNfc: textoDeNfc, FORMATOS: FORMATOS };
    }
    if (raiz.angular) {
        raiz.angular.module("Administracion").factory("dtaLector", function () {
            return crear(function () {
                return { Html5Qrcode: raiz.Html5Qrcode, Html5QrcodeSupportedFormats: raiz.Html5QrcodeSupportedFormats };
            }, function () { return raiz; });
        });
    }
})(typeof window !== "undefined" ? window : globalThis);
