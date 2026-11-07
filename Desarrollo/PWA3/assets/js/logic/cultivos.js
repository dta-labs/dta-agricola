/**
 * REQ-040 - Reglas de las fichas tecnicas de cultivos (puras: sin DOM ni Firebase).
 *
 * Un cultivo en /cultivos tiene la forma:
 *   { culture, detail, price: "0.00", type?, plan: [ { day: "10~15", action, detail, type } ] }
 * `day` puede venir como "10~15" (margen de aplicacion), como numero o vacio.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.cultivos = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // Fuera de este rango el dia no se muestra (mismo criterio que la vista anterior).
    var DIA_MINIMO = -360;
    var DIA_MAXIMO = 36000;

    /** Precio 0 (como texto "0.00", "0" o numero). Sin precio = de pago, como antes. */
    function esGratuito(cultivo) {
        if (!cultivo || cultivo.price === undefined || cultivo.price === null || cultivo.price === "") return false;
        var precio = Number(String(cultivo.price).replace(",", "."));
        return isFinite(precio) && precio === 0;
    }

    /** Lista de cultivos para mostrar: acepta objeto o arreglo; sin nulos ni tipo "n". */
    function cultivosVisibles(lista) {
        if (!lista || typeof lista !== "object") return [];
        var valores = Array.isArray(lista) ? lista : Object.keys(lista).map(function (clave) { return lista[clave]; });
        return valores.filter(function (cultivo) {
            return cultivo && typeof cultivo === "object" && cultivo.culture && cultivo.type !== "n";
        });
    }

    /** "10~15" -> 10; 7 -> 7; "" / null / "abc" -> null */
    function diaDeInicio(valor) {
        if (typeof valor === "number") return isFinite(valor) ? valor : null;
        if (typeof valor !== "string" || !valor.trim()) return null;
        var numero = parseInt(valor.split("~")[0], 10);
        return isFinite(numero) ? numero : null;
    }

    function diaVisible(dia) {
        return dia !== null && dia >= DIA_MINIMO && dia <= DIA_MAXIMO;
    }

    /**
     * Ficha lista para mostrar. Devuelve una COPIA: no modifica el cultivo recibido.
     * Antes la vista convertia `day` sobre el objeto compartido y, al abrir la ficha por segunda
     * vez, todas las etapas quedaban en el dia 0 (REQ-040 F-1).
     */
    function prepararFicha(cultivo) {
        var origen = cultivo || {};
        var etapas = (Array.isArray(origen.plan) ? origen.plan : [])
            .filter(function (etapa) { return etapa && etapa.type !== "n"; })
            .map(function (etapa) {
                var dia = diaDeInicio(etapa.day);
                var rango = (etapa.day === undefined || etapa.day === null || etapa.day === "") ? null : String(etapa.day);
                return {
                    dia: dia,
                    mostrarDia: diaVisible(dia),
                    rango: rango,
                    accion: etapa.action || "",
                    detalle: etapa.detail || ""
                };
            });
        etapas.sort(function (a, b) {
            if (a.dia === null && b.dia === null) return 0;
            if (a.dia === null) return 1;
            if (b.dia === null) return -1;
            return a.dia - b.dia;
        });
        return { cultivo: origen.culture || "", detalle: origen.detail || "", etapas: etapas };
    }

    /**
     * REQ-052 - Fases fenologicas para el selector del sensor (comunes a la mayoria de cultivos).
     * El valor guardado sigue siendo texto (`phenologicalStage`), como cuando era un campo libre.
     */
    var FASES_FENOLOGICAS = [
        "Germinación / emergencia",
        "Desarrollo vegetativo",
        "Inicio de floración",
        "Floración",
        "Cuajado de fruto",
        "Desarrollo / llenado de fruto",
        "Maduración",
        "Cosecha",
        "Postcosecha / reposo"
    ];

    /** Lista para el selector; si lo guardado no esta en la lista (antes era texto libre), se conserva. */
    function fasesConActual(actual) {
        var lista = FASES_FENOLOGICAS.slice();
        var texto = typeof actual === "string" ? actual.trim() : "";
        if (texto && lista.indexOf(texto) < 0) lista.push(texto);
        return lista;
    }

    return {
        FASES_FENOLOGICAS: FASES_FENOLOGICAS,
        fasesConActual: fasesConActual,
        esGratuito: esGratuito,
        cultivosVisibles: cultivosVisibles,
        diaDeInicio: diaDeInicio,
        prepararFicha: prepararFicha
    };
}));
