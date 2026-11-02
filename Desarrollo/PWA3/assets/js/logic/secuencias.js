/**
 * REQ-003 - Secuencia de fechas de inicio de las parcelas de un plan de riego.
 *
 * UMD. Depende de DTALogic.fechas (navegador) o de ./fechas (Node).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./fechas"));
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.secuencias = factory(root.DTALogic.fechas);
    }
}(typeof self !== "undefined" ? self : this, function (fechas) {
    "use strict";

    function dosDigitos(n) { return String(n).padStart(2, "0"); }

    /**
     * Dado el inicio y la duracion (min) de cada parcela, devuelve el inicio de cada una
     * ("YYYY-MM-DD HH:mm" local) mas el fin de la ultima.
     *
     * DEFECTO CONSERVADO (documentado): las intermedias se formatean en LOCAL y la ultima con
     * toISOString() (UTC). Se conserva para no cambiar el comportamiento; se corrige en REQ-007.
     */
    function generarSecuenciaParcelas(fecha_inicio, hora_inicio, tiempos) {
        var resultados = [];
        var inicio = fechas.parseFechaHora(fecha_inicio, hora_inicio);
        tiempos.forEach(function (minutos) {
            if (minutos > 0) {
                var year = inicio.getFullYear();
                var month = dosDigitos(inicio.getMonth() + 1);
                var day = dosDigitos(inicio.getDate());
                var hour = dosDigitos(inicio.getHours());
                var min = dosDigitos(inicio.getMinutes());
                resultados.push(year + "-" + month + "-" + day + " " + hour + ":" + min);
                inicio = new Date(inicio.getTime() + minutos * 60000);
            }
        });
        // D-03 (REQ-007): el cierre se escribe en hora LOCAL, igual que los inicios. Antes se usaba
        // toISOString() (UTC), lo que desplazaba 6 h la programacion en Mexico.
        resultados.push(
            inicio.getFullYear() + "-" +
            dosDigitos(inicio.getMonth() + 1) + "-" +
            dosDigitos(inicio.getDate()) + " " +
            dosDigitos(inicio.getHours()) + ":" +
            dosDigitos(inicio.getMinutes())
        );
        return resultados;
    }

    return { generarSecuenciaParcelas: generarSecuenciaParcelas };
}));
