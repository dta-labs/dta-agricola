/**
 * REQ-157 - <dta-compartir-app>: compartir la aplicacion desde el pie del menu lateral (antes en la Ayuda).
 * Solo iconos: WhatsApp, Telegram, correo, SMS, copiar enlace, QR (a pantalla completa, grande y de alto contraste)
 * y "Más" (hoja de compartir del sistema, si el navegador la tiene).
 *
 *   <li class="menu-compartir"><dta-compartir-app></dta-compartir-app></li>
 */
(function (raiz) {
    "use strict";

    var VERSION = "26.11.22.033";
    var URL_APP = "https://dta-agricola.web.app";
    var TITULO = "DTA - Monitoring & Control";
    var TEXTO = "Monitorea y controla tus equipos de riego con DTA-Agrícola";

    /** Enlaces para compartir (puro: se prueba en Node). */
    function enlaces(url) {
        var u = url || URL_APP;
        var mensaje = TITULO + ": " + u;
        return {
            whatsapp: "https://wa.me/?text=" + encodeURIComponent(mensaje),
            telegram: "https://t.me/share/url?url=" + encodeURIComponent(u) + "&text=" + encodeURIComponent(TEXTO),
            correo: "mailto:?subject=" + encodeURIComponent(TITULO) + "&body=" + encodeURIComponent(TEXTO + ".\n\nÁbrela aquí: " + u),
            sms: "sms:?&body=" + encodeURIComponent(mensaje)
        };
    }

    function ControladorCompartir($window, $timeout, $element) {
        var vm = this;
        var capa = null;

        vm.url = URL_APP;
        vm.enlaces = enlaces(URL_APP);
        vm.qrAbierto = false;
        vm.copiado = false;
        vm.puedeCompartir = !!($window.navigator && typeof $window.navigator.share === "function");

        vm.$postLink = function () {
            // El menu lateral tiene transform: un position:fixed dentro de el quedaria encerrado. La capa del QR va al body.
            var raizDom = $element && $element[0];
            capa = raizDom && raizDom.querySelector ? raizDom.querySelector(".compartir-qr-capa") : null;
            if (capa && $window.document && $window.document.body) $window.document.body.appendChild(capa);
        };

        vm.$onDestroy = function () {
            if (capa && capa.parentNode) capa.parentNode.removeChild(capa);
        };

        vm.abrir = function (tipo) {
            var destino = vm.enlaces[tipo];
            if (!destino) return;
            if (tipo === "correo" || tipo === "sms") $window.location.href = destino;
            else $window.open(destino, "_blank", "noopener");
        };

        vm.copiar = function () {
            var marcar = function () {
                vm.copiado = true;
                $timeout(function () { vm.copiado = false; }, 2000);
                if ($window.M && $window.M.toast) $window.M.toast({ html: "Enlace copiado" });
            };
            var portapapeles = $window.navigator && $window.navigator.clipboard;
            if (portapapeles && portapapeles.writeText) {
                portapapeles.writeText(vm.url).then(function () { $timeout(marcar); }, function () { $window.prompt("Copia el enlace:", vm.url); });
            } else {
                $window.prompt("Copia el enlace:", vm.url);
            }
        };

        vm.compartirSistema = function () {
            if (!vm.puedeCompartir) return;
            $window.navigator.share({ title: TITULO, text: TEXTO, url: vm.url }).catch(function () { /* cancelado */ });
        };

        vm.abrirQR = function () { vm.qrAbierto = true; };
        vm.cerrarQR = function () { vm.qrAbierto = false; };
        vm.teclaQR = function (evento) { if (evento && evento.key === "Escape") vm.cerrarQR(); };
    }
    ControladorCompartir.$inject = ["$window", "$timeout", "$element"];

    var definicion = {
        templateUrl: "./assets/js/components/comunes/compartir-app/compartir-app.html?v=" + VERSION,
        controller: ControladorCompartir,
        controllerAs: "vm",
        bindings: {}
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { definicion: definicion, Controlador: ControladorCompartir, enlaces: enlaces, URL_APP: URL_APP, VERSION: VERSION };
    }
    if (raiz.angular) raiz.angular.module("Administracion").component("dtaCompartirApp", definicion);
})(typeof window !== "undefined" ? window : globalThis);
