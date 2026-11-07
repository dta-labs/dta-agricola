/**
 * REQ-056 - Tabla de velocidades del pivote (puro: sin DOM ni Firebase).
 *
 * /configuraciones/<marca> guarda filas { timer, wather, degree }:
 *   timer  = temporizador (%) del panel del pivote
 *   wather = lamina de agua aplicada (pulgadas)
 *   degree = horas por vuelta completa
 * UMD (navegador: DTALogic.pivote / Node: module.exports).
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.pivote = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var MM_POR_PULGADA = 25.4;

    var MARCAS = {
        "valley": { clave: "valley", nombre: "Valley" },
        "valley cams": { clave: "valley", nombre: "Valley" },
        "zimmatic": { clave: "growsmart", nombre: "Zimmatic / Growsmart" },
        "rintec hydrus (zimmatic)": { clave: "growsmart", nombre: "Zimmatic / Growsmart" },
        "growsmart": { clave: "growsmart", nombre: "Zimmatic / Growsmart" },
        "lindsay": { clave: "lindsay", nombre: "Lindsay" }
    };

    /** Marca guardada en el equipo -> { clave para /configuraciones, nombre para mostrar } o null. */
    function marcaDeConfiguracion(marca) {
        var texto = typeof marca === "string" ? marca.trim().toLowerCase() : "";
        if (!texto) return null;
        return MARCAS[texto] || { clave: texto, nombre: marca.trim() };
    }

    function numero(valor) {
        if (valor === null || valor === undefined || valor === "") return null;
        var n = Number(String(valor).replace(",", "."));
        return isFinite(n) ? n : null;
    }

    /** Filas listas para mostrar, ordenadas por temporizador. Acepta arreglo u objeto de RTDB. */
    function filasDeConfiguracion(datos) {
        if (!datos || typeof datos !== "object") return [];
        var lista = Array.isArray(datos) ? datos : Object.keys(datos).map(function (k) { return datos[k]; });
        return lista
            .filter(function (f) { return f && numero(f.timer) !== null; })
            .map(function (f) {
                var pulgadas = numero(f.wather);
                return {
                    timer: numero(f.timer),
                    pulgadas: pulgadas,
                    milimetros: pulgadas === null ? null : Math.round(pulgadas * MM_POR_PULGADA * 10) / 10,
                    horas: numero(f.degree)
                };
            })
            .sort(function (a, b) { return a.timer - b.timer; });
    }

    // ---------- REQ-059: plan de riego del pivote (sectores por angulo) ----------
    //
    // Formato guardado en actualSystem.plans["pN"] (lo lee el equipo; R-01 de REQ-034):
    //   { starAngle: "0", endAngle: "90", value: "60", endGun: "true"|"false", culture, sensor }
    // "Nuevo plan" guardaba texto y "Planificacion" numeros; se guarda siempre texto, como al crear.
    // Nuevo campo opcional `soil` (antes el selector de suelo existia pero no se guardaba).

    var SUELOS = [
        { valor: "1", nombre: "Arcilloso limoso" }, { valor: "2", nombre: "Arcilloso arenoso" },
        { valor: "3", nombre: "Franco arcilloso" }, { valor: "4", nombre: "Franco arcillo limoso" },
        { valor: "5", nombre: "Franco arcillo arenoso" }, { valor: "6", nombre: "Franco" },
        { valor: "7", nombre: "Franco limoso" }, { valor: "8", nombre: "Franco arenoso" },
        { valor: "9", nombre: "Limoso" }, { valor: "10", nombre: "Areno franco" }, { valor: "11", nombre: "Arenoso" }
    ];

    function entero(valor, porDefecto) {
        var n = numero(valor);
        return n === null ? porDefecto : n;
    }

    function clavesDePlanes(planes) {
        if (!planes || typeof planes !== "object") return [];
        return Object.keys(planes).filter(function (k) { return /^p\d+$/.test(k) && planes[k]; })
            .sort(function (a, b) { return Number(a.slice(1)) - Number(b.slice(1)); });
    }

    /** Formulario para un plan nuevo: empieza donde termina el ultimo plan (como antes). */
    function planNuevo(planes) {
        var claves = clavesDePlanes(planes);
        var ultimo = claves.length ? planes[claves[claves.length - 1]] : null;
        return {
            inicio: ultimo ? entero(ultimo.endAngle, 0) : 0,
            fin: 360,
            velocidad: 0,
            pistola: false,
            cultivo: "",
            sensor: "",
            suelo: ""
        };
    }

    /** Formulario a partir de lo guardado (texto o numero). */
    function planDesdeGuardado(plan) {
        var p = plan || {};
        return {
            inicio: entero(p.starAngle, 0),
            fin: entero(p.endAngle, 360),
            velocidad: entero(p.value, 0),
            pistola: p.endGun === true || String(p.endGun) === "true",
            cultivo: p.culture || "",
            sensor: p.sensor || "",
            suelo: p.soil ? String(p.soil) : ""
        };
    }

    /**
     * Errores por campo. maxVelocidad: limite del equipo (actualSystem.maxVelocity, texto o numero).
     * Antes "Nuevo plan" comparaba TEXTOS ("50" <= "100" es falso) y guardaba la velocidad maxima.
     */
    function erroresDelPlan(form, maxVelocidad, planes, indiceEditado) {
        var f = form || {};
        var errores = {};
        var inicio = numero(f.inicio);
        var fin = numero(f.fin);
        var velocidad = numero(f.velocidad);
        var maximo = numero(maxVelocidad);
        if (maximo === null || maximo <= 0 || maximo > 100) maximo = 100;
        if (inicio === null || inicio < 0 || inicio > 360) errores.inicio = "Entre 0 y 360 grados.";
        if (fin === null || fin < 0 || fin > 360) errores.fin = "Entre 0 y 360 grados.";
        if (!errores.inicio && !errores.fin && inicio === fin) errores.fin = "Debe ser distinto del ángulo inicial.";
        // REQ-060: no puede solaparse con otro sector del mismo pivote.
        if (!errores.inicio && !errores.fin && planes) {
            var solape = errorDeSolape(f, planes, indiceEditado);
            if (solape) errores.sector = solape;
        }
        if (velocidad === null || velocidad < 0) errores.velocidad = "Indica un valor de 0 o más.";
        else if (velocidad > maximo) errores.velocidad = "El máximo de este equipo es " + maximo + "%.";
        return errores;
    }

    // ---------- REQ-060: los sectores del plan no pueden solaparse ----------

    /** Sector en tramos sobre [0, 360): si cruza 0° (300 -> 30) son dos tramos. */
    function tramos(inicio, fin) {
        var a = ((inicio % 360) + 360) % 360;
        var b = fin === 360 ? 360 : ((fin % 360) + 360) % 360;
        if (a === b) return [];
        if (a < b) return [[a, b]];
        return [[a, 360], [0, b]];
    }

    /** Primer tramo en comun entre dos sectores (tocarse en un borde no cuenta) o null. */
    function interseccion(sectorA, sectorB) {
        var ta = tramos(sectorA[0], sectorA[1]);
        var tb = tramos(sectorB[0], sectorB[1]);
        for (var i = 0; i < ta.length; i += 1) {
            for (var j = 0; j < tb.length; j += 1) {
                var desde = Math.max(ta[i][0], tb[j][0]);
                var hasta = Math.min(ta[i][1], tb[j][1]);
                if (hasta - desde > 0) return [desde, hasta];
            }
        }
        return null;
    }

    function numeroDeSector(clave) {
        return Number(String(clave).slice(1)) + 1;
    }

    /**
     * Sectores guardados que se solapan entre si: [{ a: "p0", b: "p1", desde, hasta, texto }].
     * Sirve para avisar en la lista de planes de los solapes que ya existian.
     */
    function solapamientos(planes) {
        var claves = clavesDePlanes(planes);
        var lista = [];
        for (var i = 0; i < claves.length; i += 1) {
            for (var j = i + 1; j < claves.length; j += 1) {
                var pa = planes[claves[i]], pb = planes[claves[j]];
                var comun = interseccion([numero(pa.starAngle), numero(pa.endAngle)], [numero(pb.starAngle), numero(pb.endAngle)]);
                if (comun) {
                    lista.push({
                        a: claves[i], b: claves[j], desde: comun[0], hasta: comun[1],
                        texto: "Los sectores " + numeroDeSector(claves[i]) + " y " + numeroDeSector(claves[j]) +
                            " se solapan entre " + comun[0] + "° y " + comun[1] + "°."
                    });
                }
            }
        }
        return lista;
    }

    /** Error si el sector del formulario se solapa con otro plan (se excluye el que se esta editando). */
    function errorDeSolape(form, planes, indiceEditado) {
        var inicio = numero(form && form.inicio);
        var fin = numero(form && form.fin);
        if (inicio === null || fin === null) return null;
        var claves = clavesDePlanes(planes);
        for (var i = 0; i < claves.length; i += 1) {
            if (claves[i] === indiceEditado) continue;
            var otro = planes[claves[i]];
            var comun = interseccion([inicio, fin], [numero(otro.starAngle), numero(otro.endAngle)]);
            if (comun) {
                return "Se solapa con el sector " + numeroDeSector(claves[i]) + " (" + numero(otro.starAngle) + "° a " +
                    numero(otro.endAngle) + "°) entre " + comun[0] + "° y " + comun[1] + "°.";
            }
        }
        return null;
    }

    /** Objeto a guardar en actualSystem.plans (todo texto, como al crear). */
    function planParaGuardar(form) {
        var f = form || {};
        var plan = {
            starAngle: String(numero(f.inicio)),
            endAngle: String(numero(f.fin)),
            value: String(numero(f.velocidad)),
            endGun: f.pistola ? "true" : "false",
            culture: f.cultivo || "",
            sensor: f.sensor || ""
        };
        if (f.suelo) plan.soil = String(f.suelo);
        return plan;
    }

    /** Clave para un plan nuevo: "p" + cantidad de planes. */
    function claveNueva(planes) {
        return "p" + clavesDePlanes(planes).length;
    }

    return {
        marcaDeConfiguracion: marcaDeConfiguracion,
        filasDeConfiguracion: filasDeConfiguracion,
        SUELOS: SUELOS,
        planNuevo: planNuevo,
        solapamientos: solapamientos,
        planDesdeGuardado: planDesdeGuardado,
        erroresDelPlan: erroresDelPlan,
        planParaGuardar: planParaGuardar,
        claveNueva: claveNueva
    };
}));
