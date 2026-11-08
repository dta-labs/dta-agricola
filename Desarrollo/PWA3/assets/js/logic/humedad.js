/**
 * REQ-052 - Estado de la humedad del suelo (puro: sin DOM ni Firebase).
 *
 * Extrae la regla que estaba dentro de core.js -> getSensorValue para usarla tambien en el mapa
 * (parcelas sombreadas por humedad). Mismos umbrales y mismos colores de fondo que la tarjeta del sensor:
 *   - WM (tensiometro, centibares): <= 10 saturado, <= 60 adecuado, > 60 seco.
 *   - Resto (% de humedad): <= h.minValue seco, >= h.maxValue saturado, entre medias adecuado
 *     (umbrales por defecto 25 y 60 si el sensor no los tiene).
 *
 * La lectura sale de `sistema.log.dataRaw` (JSON con 8 valores por sensor; el primero es la humedad).
 * UMD (navegador: DTALogic.humedad / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.humedad = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var VALORES_POR_SENSOR = 8;
    var TIPOS_CON_HUMEDAD = ["Ms", "SHT4", "WM", "NPKML", "NPK"];

    var ESTADOS = {
        seco: { estado: "seco", texto: "Seco", color: "#e53935", fondo: "#ff000080" },
        adecuado: { estado: "adecuado", texto: "Adecuado", color: "#43a047", fondo: "#00ff0080" },
        saturado: { estado: "saturado", texto: "Saturado", color: "#1e88e5", fondo: "#0000ff80" },
        sinDato: { estado: "sin-dato", texto: "Sin dato", color: "#9e9e9e", fondo: "#9e9e9e80" }
    };

    function entero(valor, porDefecto) {
        if (valor === undefined || valor === null || valor === "" || valor === "NaN") return porDefecto;
        var n = parseInt(valor, 10);
        return isFinite(n) ? n : porDefecto;
    }

    function copia(estado, valor, unidad) {
        return { estado: estado.estado, texto: estado.texto, color: estado.color, fondo: estado.fondo, valor: valor, unidad: unidad };
    }

    /** Estado de un sensor dado su valor de humedad. */
    function estadoHumedad(sensor, valor) {
        var tipo = sensor && sensor.type;
        var v = entero(valor, null);
        var unidad = tipo === "WM" ? "cb" : "%";
        if (v === null || v === -99) return copia(ESTADOS.sinDato, null, unidad);
        if (tipo === "WM") {
            if (v <= 10) return copia(ESTADOS.saturado, v, unidad);
            if (v <= 60) return copia(ESTADOS.adecuado, v, unidad);
            return copia(ESTADOS.seco, v, unidad);
        }
        var h = (sensor && sensor.h) || {};
        var minimo = entero(h.minValue, 25);
        var maximo = entero(h.maxValue, 60);
        if (v <= minimo) return copia(ESTADOS.seco, v, unidad);
        if (v >= maximo) return copia(ESTADOS.saturado, v, unidad);
        return copia(ESTADOS.adecuado, v, unidad);
    }

    function datosCrudos(sistema) {
        if (!sistema || !sistema.log || !sistema.log.dataRaw) return [];
        try {
            var datos = typeof sistema.log.dataRaw === "string" ? JSON.parse(sistema.log.dataRaw) : sistema.log.dataRaw;
            return Array.isArray(datos) ? datos : [];
        } catch (error) {
            return [];
        }
    }

    /** Lista ordenada de sensores de una red: [{ indice, clave: "S0", sensor }] (respeta sensorNumber). */
    function sensoresDeRed(sistema) {
        var lista = [];
        var sensores = sistema && sistema.sensors;
        if (!sensores) return lista;
        var total = entero(sensores.sensorNumber, 0);
        for (var i = 0; i < total; i += 1) {
            var s = sensores["S" + i];
            if (s) lista.push({ indice: i, clave: "S" + i, sensor: s });
        }
        return lista;
    }

    /** Estado de la humedad del sensor que ocupa la posicion `indice` en la red. */
    function estadoEnRed(sistema, indice) {
        var item = sensoresDeRed(sistema).filter(function (x) { return x.indice === indice; })[0];
        if (!item) return copia(ESTADOS.sinDato, null, "%");
        if (TIPOS_CON_HUMEDAD.indexOf(item.sensor.type) < 0) return copia(ESTADOS.sinDato, null, "%");
        return estadoHumedad(item.sensor, datosCrudos(sistema)[indice * VALORES_POR_SENSOR]);
    }

    /** Estado de la humedad de una parcela de estacionario: la de su sensor asociado (plot.sensor + plot.sensorId). */
    function estadoDeParcela(parcela, sistemas) {
        if (!parcela || !parcela.sensor || !parcela.sensorId || !sistemas) return copia(ESTADOS.sinDato, null, "%");
        var red = sistemas[parcela.sensor];
        var item = sensoresDeRed(red).filter(function (x) { return x.sensor.id === parcela.sensorId; })[0];
        if (!item) return copia(ESTADOS.sinDato, null, "%");
        return estadoEnRed(red, item.indice);
    }

    function numeroOnulo(valor) {
        if (valor === undefined || valor === null || valor === "" || valor === "NaN") return null;
        var n = Number(valor);
        return isFinite(n) ? n : null;
    }

    /**
     * REQ-074: valores crudos del sensor `indice` de una red (8 por sensor en log.dataRaw):
     * ms = humedad del suelo (cb o %), hr = humedad del ambiente (%), t = temperatura (°C), bateria (V).
     * `datos` opcional: el arreglo ya leido (para no volver a leer el JSON en cada tarjeta).
     */
    function valoresDeSensor(sistema, indice, datos) {
        var d = datos || datosCrudos(sistema);
        var base = indice * VALORES_POR_SENSOR;
        return { ms: numeroOnulo(d[base]), hr: numeroOnulo(d[base + 1]), t: numeroOnulo(d[base + 4]), bateria: numeroOnulo(d[base + 7]) };
    }

    /** Para la leyenda del mapa. */
    function leyenda() {
        return [ESTADOS.seco, ESTADOS.adecuado, ESTADOS.saturado, ESTADOS.sinDato].map(function (e) {
            return { texto: e.texto, color: e.color };
        });
    }

    return {
        estadoHumedad: estadoHumedad,
        datosCrudos: datosCrudos,
        valoresDeSensor: valoresDeSensor,
        sensoresDeRed: sensoresDeRed,
        estadoEnRed: estadoEnRed,
        estadoDeParcela: estadoDeParcela,
        leyenda: leyenda
    };
}));
