/**
 * REQ-057 - Reglas de los paneles de "Sistema" (puras: sin DOM ni Firebase).
 *
 * Antes eran expresiones repetidas en index.html (senal en %, GPS, comunicacion, seguridad, duracion,
 * botones encendidos). Se conservan exactamente los mismos criterios.
 * UMD (navegador: DTALogic.panel / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.panel = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var SENAL_MAXIMA = 30;          // la senal del modem llega en 0..30 (CSQ)
    var COORDENADA_VACIA = "0.00000";

    /** Senal del modem en % (0..100, entero). Sin dato: 0. */
    function porcentajeSenal(senal) {
        var n = Number(senal);
        if (!senal || !isFinite(n) || n <= 0) return 0;
        return Math.min(100, Math.round(n * 100 / SENAL_MAXIMA));
    }

    /** Comunicacion correcta: recepcion "Ok" y sin retraso ("-1"). */
    function comunicacionOk(log) {
        return !!log && log.reception === "Ok" && String(log.commDelay) === "-1";
    }

    /** GPS con posicion (el equipo manda "0.00000" cuando no tiene). */
    function gpsOk(log) {
        return !!log && log.latitude !== undefined && log.longitude !== undefined &&
            String(log.latitude) !== COORDENADA_VACIA && String(log.longitude) !== COORDENADA_VACIA;
    }

    /** Seguridad del pivote activa (llega como texto "true"). */
    function seguridadOk(log) {
        return !!log && String(log.safety) === "true";
    }

    /**
     * Que boton de movimiento esta "encendido".
     * status: el equipo esta en marcha; direction: true hacia adelante.
     */
    function botonesMovimiento(sistema) {
        var s = sistema || {};
        var enMarcha = !!s.status;
        return {
            retroceso: enMarcha && !s.direction,
            detener: !enMarcha,
            avance: enMarcha && !!s.direction
        };
    }

    function dosDigitos(n) {
        return String(n).padStart(2, "0");
    }

    /** Milisegundos -> "dd:hh:mm" (como getDayFromMs/getHourFromMs/getMinutesFromMs). */
    function duracionTexto(ms) {
        var total = parseInt(ms, 10);
        if (!isFinite(total) || total < 0) total = 0;
        var dias = Math.floor(total / 86400000);
        var horas = Math.floor((total % 86400000) / 3600000);
        var minutos = Math.floor((total % 3600000) / 60000);
        return dosDigitos(dias) + ":" + dosDigitos(horas) + ":" + dosDigitos(minutos);
    }

    /** Parcela en curso de un sistema con parcelas (pozo, estacionario). */
    function parcelaActual(sistema) {
        if (!sistema || !sistema.plots || sistema.position === undefined || sistema.position === null) return null;
        return sistema.plots["p" + sistema.position] || null;
    }

    /** Bateria en % desde el voltaje (2.8 V = 0 %, 3.3 V = 100 %), como texto entero: igual que voltageToPercent. */
    function porcentajeBateria(voltaje) {
        var minimo = 2.8, maximo = 3.3;
        return (Math.max(0, Math.min(100, ((voltaje - minimo) / (maximo - minimo)) * 100))).toFixed(0);
    }

    // ---------- REQ-064: estado de una parcela (o del motor, p7) del estacionario ----------
    //
    //   orden    = plots[pN].forcedStart: 1 encender, -1 apagar (sin orden: vacio/0)
    //   equipo   = log.activeSectors (lo que confirma el equipo): "[0,1,0,...]" o arreglo; 1 = encendido
    //
    //   "encendido"  verde    el equipo confirma encendido y no hay una orden pendiente de apagar
    //   "pendiente"  amarillo hay una orden (encender o apagar) que el equipo aun no confirma
    //   "apagado"    gris     el equipo confirma apagado y no hay una orden pendiente de encender

    function sectoresActivos(log) {
        var valor = log && log.activeSectors;
        if (Array.isArray(valor)) return valor;
        if (typeof valor === "string" && valor.trim()) {
            try {
                var lista = JSON.parse(valor);
                if (Array.isArray(lista)) return lista;
            } catch (e) { /* formato antiguo: se lee caracter a caracter */ }
            var digitos = valor.replace(/[^01]/g, "");
            return digitos.split("").map(Number);
        }
        return null;
    }

    function estadoParcela(sistema, clave) {
        var s = sistema || {};
        var parcela = s.plots && s.plots[clave];
        var numero = parseInt(String(clave || "").replace(/\D/g, ""), 10);
        if (!parcela || !isFinite(numero)) return "apagado";
        var orden = Number(parcela.forcedStart);
        var sectores = sectoresActivos(s.log);
        var confirmado = sectores ? Number(sectores[numero]) === 1 : null;
        if (orden === 1) return confirmado === true ? "encendido" : "pendiente";
        if (orden === -1) return confirmado === true ? "pendiente" : "apagado";
        return confirmado === true ? "encendido" : "apagado";
    }

    // ---------- REQ-088: marcador de equipo en el mapa (pin con icono, nombre y color del estado) ----------
    // Misma regla que el color de las tarjetas del listado (core.js -> getSystemBackgroundColor), en colores
    // solidos; ademas, una red de sensores cuyo gateway lleva mas de 24 h sin reportar se ve como sin conexion.

    var ESTADOS_EQUIPO = {
        encendido: { color: "#20b2aa", texto: "Funcionando" },
        apagado: { color: "#9e9e9e", texto: "Apagado" },
        pendiente: { color: "#fdd835", texto: "Esperando confirmación del equipo" },
        falla: { color: "#e53935", texto: "Falla eléctrica" },
        seguridad: { color: "#db7093", texto: "Falla de seguridad" },
        "sin-conexion": { color: "#616161", texto: "Comunicación inestable" },
        nevera: { color: "#204eb2", texto: "Nevera" }
    };

    var ICONOS_EQUIPO = {
        PC: "fa-dot-circle-o", PL: "fa-arrows-h", Pozo: "fa-tint", Pump: "fa-tint",
        Sensor: "fa-wifi", Estacionario: "fa-th", Nevera: "fa-snowflake-o"
    };

    function falso(v) { return v === false || v === "false"; }

    /** Estado del equipo: { estado, color, texto }. `lecturaVieja`: el gateway lleva mas de 24 h sin reportar. */
    function estadoDeEquipo(sistema, lecturaVieja) {
        var s = sistema || {};
        var log = s.log;
        var estado = "encendido";
        switch (s.type) {
            case "PC":
            case "PL":
                if (s.status == "OFF") estado = "apagado";
                else if (log && falso(log.voltage)) estado = "falla";
                else if (log && falso(log.safety)) estado = "seguridad";
                else if (log && String(log.commDelay) !== "-1") estado = "sin-conexion";   // igual que el listado
                else if (log && log.status == "OFF") estado = "pendiente";
                break;
            case "Estacionario":
            case "Pump":
            case "Pozo":
                estado = s.status == "OFF" ? "apagado" : "encendido";
                break;
            case "Sensor":
                estado = lecturaVieja ? "sin-conexion" : "encendido";
                if (lecturaVieja) return { estado: estado, color: ESTADOS_EQUIPO[estado].color, texto: "Sin reportar en más de 24 h" };
                break;
            case "Nevera":
                estado = "nevera";
                break;
        }
        return { estado: estado, color: ESTADOS_EQUIPO[estado].color, texto: ESTADOS_EQUIPO[estado].texto };
    }

    function escapar(texto) {
        return String(texto == null ? "" : texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    /** HTML del marcador: pin (gota) del color del estado con el icono del tipo, borde blanco, y el nombre al lado. */
    function htmlMarcadorEquipo(sistema, estado) {
        var s = sistema || {};
        var icono = ICONOS_EQUIPO[s.type] || "fa-map-marker";
        var claseOscura = estado.estado === "pendiente" ? " marcador-equipo-claro" : "";
        return '<div class="marcador-equipo' + claseOscura + '" style="--estado:' + estado.color + '" title="' +
            escapar((s.name || "Equipo") + " · " + estado.texto) + '">' +
            '<span class="marcador-equipo-pin"><i class="fa ' + icono + '" aria-hidden="true"></i></span>' +
            '<span class="marcador-equipo-nombre">' + escapar(s.name || "") + '</span></div>';
    }

    return {
        porcentajeSenal: porcentajeSenal,
        estadoDeEquipo: estadoDeEquipo,
        htmlMarcadorEquipo: htmlMarcadorEquipo,
        estadoParcela: estadoParcela,
        sectoresActivos: sectoresActivos,
        porcentajeBateria: porcentajeBateria,
        comunicacionOk: comunicacionOk,
        gpsOk: gpsOk,
        seguridadOk: seguridadOk,
        botonesMovimiento: botonesMovimiento,
        duracionTexto: duracionTexto,
        parcelaActual: parcelaActual
    };
}));
