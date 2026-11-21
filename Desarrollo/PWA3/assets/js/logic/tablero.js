/**
 * REQ-114 - Tablero de resumen (pagina de entrada): indicadores, "Atiende primero", "Mis cultivos" y "Hoy".
 * Puro: recibe los sistemas y las reglas (logic/), sin DOM ni Firebase. UMD (DTALogic.tablero / Node).
 *
 * deps: { resumen, panel, humedad, medidor, geo }
 * opciones: { resumenDe(sistema) (cache de core), pronostico: { min (°C), instante (ms) }, umbralHelada (°C),
 *             sinEquipos (el usuario no tiene equipos registrados), instalada (la app ya esta instalada), ahora (ms) }
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.tablero = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var ORDEN = { emergencia: 0, atencion: 1 };
    var NOMBRES = { PC: "Pivote central", PL: "Pivote lineal", Estacionario: "Riego sectorial", Pozo: "Bombeo", Pump: "Bombeo", Sensor: "Red de sensores", Nevera: "Nevera" };
    var ADECUADA = { "Humedad adecuada": true, "Muy húmedo": true };
    var SECA = { "Suelo seco": true, "Suelo muy seco": true, "Estrés moderado": true };

    function dos(n) { return String(n).padStart(2, "0"); }
    function horaDe(ms) { var d = new Date(ms); return dos(d.getHours()) + ":" + dos(d.getMinutes()); }
    function plural(n, uno, varios) { return n + " " + (n === 1 ? uno : varios); }

    function lista(sistemas) {
        return Object.keys(sistemas || {}).map(function (k) { return sistemas[k]; })
            .filter(function (s) { return s && typeof s === "object" && s.name; });
    }

    function sensoresDe(s) {
        return Object.keys(s.sensors || {}).filter(function (k) { return /^S\d+$/.test(k) && s.sensors[k] && s.sensors[k].id; })
            .map(function (k) { return { clave: k, indice: parseInt(k.slice(1), 10), sensor: s.sensors[k] }; });
    }

    function regando(s, r) {
        if (s.type === "PC" || s.type === "PL") return r.estado === "ok" && /^Operando/.test(r.linea || "");
        if (s.type === "Estacionario") return (r.valvulas || []).some(function (v) { return !v.motor && v.estado === "encendido"; });
        if (s.type === "Pozo" || s.type === "Pump") return r.estado === "ok" && s.status !== "OFF";
        return false;
    }

    /** Lecturas de humedad y temperatura de todos los sensores de las redes: [{ red, sensor, zona, helada }]. */
    function lecturas(sistemas, deps) {
        var salida = [];
        sistemas.filter(function (s) { return s.type === "Sensor"; }).forEach(function (red) {
            var datos = deps.humedad.datosCrudos(red);
            sensoresDe(red).forEach(function (x) {
                var v = deps.humedad.valoresDeSensor(red, x.indice, datos);
                salida.push({
                    red: red, sensor: x.sensor,
                    zona: v.ms === null ? null : deps.medidor.escalaHumedadSuelo(x.sensor, v.ms).etiqueta,
                    helada: v.t !== null && deps.medidor.escalaTemperatura(v.t, x.sensor, "C").nivel === "frio"
                });
            });
        });
        return salida;
    }

    function nombreDeCultivo(texto) {
        var t = String(texto || "").trim();
        return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
    }

    var GRAVEDAD = { helada: 3, seco: 2, adecuado: 1, "sin-dato": 0 };
    var TEXTOS_CULTIVO = { helada: "Riesgo de helada", seco: "Algo seco", adecuado: "Adecuado", "sin-dato": "Sin sensor" };

    function cultivos(sistemas, deps, medidas) {
        var grupos = {};
        function agregar(nombre, hectareas, fase, estado) {
            var n = nombreDeCultivo(nombre);
            if (!n) return;
            var clave = n.toLowerCase();
            var g = grupos[clave] = grupos[clave] || { nombre: n, hectareas: 0, fases: {}, estado: "sin-dato" };
            g.hectareas += hectareas || 0;
            if (fase) g.fases[fase] = (g.fases[fase] || 0) + 1;
            if (GRAVEDAD[estado] > GRAVEDAD[g.estado]) g.estado = estado;
        }
        function area(poligono) {
            return deps.geo.esPoligonoValido(poligono) ? deps.geo.areaHectareas(deps.geo.normalizarPoligono(poligono)) : 0;
        }
        medidas.forEach(function (m) {
            if (!m.sensor.culture) return;
            agregar(m.sensor.culture, area(m.sensor.poligon), (m.sensor.phenologicalStage || "").trim(),
                m.helada ? "helada" : m.zona === null ? "sin-dato" : SECA[m.zona] ? "seco" : "adecuado");
        });
        sistemas.forEach(function (s) {
            if (s.type === "Estacionario") {
                Object.keys(s.plots || {}).filter(function (k) { return /^p[0-6]$/.test(k); }).forEach(function (k) {
                    var p = s.plots[k];
                    if (!p || !p.culture) return;
                    var e = deps.humedad.estadoDeParcela(p, null).estado;
                    agregar(p.culture, area(p.poligon), "", e === "seco" ? "seco" : e === "sin-dato" ? "sin-dato" : "adecuado");
                });
            }
            if (s.type === "PC" && s.plans) {
                var radio = Number(s.length) || 0;
                Object.keys(s.plans).forEach(function (k) {
                    var plan = s.plans[k];
                    if (!plan || !plan.culture) return;
                    var arco = ((Number(plan.endAngle) - Number(plan.starAngle)) % 360 + 360) % 360 || 360;
                    agregar(plan.culture, Math.PI * radio * radio * arco / 360 / 10000, "", "sin-dato");
                });
            }
        });
        return Object.keys(grupos).map(function (k) {
            var g = grupos[k];
            var fases = Object.keys(g.fases).sort(function (a, b) { return g.fases[b] - g.fases[a]; });
            return {
                nombre: g.nombre,
                hectareas: g.hectareas ? Math.round(g.hectareas * 10) / 10 : null,
                fase: fases[0] || "",
                estado: g.estado,
                texto: TEXTOS_CULTIVO[g.estado]
            };
        }).sort(function (a, b) { return GRAVEDAD[b.estado] - GRAVEDAD[a.estado] || a.nombre.localeCompare(b.nombre); });
    }

    // ---------- REQ-115: sugerencias del dia ----------

    /** Consejos generales: uno por dia (rota con el dia del año). */
    var CONSEJOS = [
        { icono: "schedule", titulo: "Riega temprano", detalle: "Entre las 5 y las 9 h se pierde menos agua por evaporación y viento." },
        { icono: "build", titulo: "Revisa filtros y boquillas", detalle: "Una revisión semanal evita tapones y riegos disparejos." },
        { icono: "compare_arrows", titulo: "Compara antes y después", detalle: "Mira la humedad antes y 24 h después del riego para ajustar el tiempo." },
        { icono: "eco", titulo: "Actualiza la etapa del cultivo", detalle: "Las alertas de humedad y temperatura se ajustan mejor con la etapa al día." },
        { icono: "notifications_active", titulo: "Activa las notificaciones", detalle: "Te enteras al momento de fallas, heladas y suelo seco." },
        { icono: "speed", titulo: "Ajusta la velocidad del pivote", detalle: "Menor velocidad, más lámina de riego: ajústala a la humedad del suelo." },
        { icono: "invert_colors", titulo: "Riega por zonas", detalle: "Usa la humedad de cada sensor para regar solo donde hace falta." }
    ];

    function diaDelAnio(ms) {
        var d = new Date(ms), inicio = new Date(d.getFullYear(), 0, 0);
        return Math.floor((d - inicio) / 86400000);
    }

    /** Sugerencias sin equipos: protagonistas, para empezar. */
    function sugerenciasDeInicio(instalada) {
        var lista = [
            { icono: "add_circle", titulo: "Agrega tu primer equipo", detalle: "Registra tu pivote, bomba, riego sectorial o red de sensores con su número de serie.", accion: { tipo: "agregar" }, boton: "Agregar equipo" },
            { icono: "shopping_cart", titulo: "¿Aún no tienes un equipo DTA?", detalle: "Conoce los controladores de riego y las redes de sensores de humedad.", accion: { tipo: "url", url: "https://dtaamerica.com/dta-agricola" }, boton: "Ver equipos" }
        ];
        if (!instalada) lista.push({ icono: "get_app", titulo: "Instala la app en tu teléfono", detalle: "En el menú del navegador elige \"Agregar a pantalla de inicio\" para abrirla como una app." });
        return lista;
    }

    /** Sugerencias del dia a partir de los datos (maximo 3): lo accionable primero, luego un consejo del dia. */
    function sugerenciasDelDia(sistemas, medidas, resumenDe, noche, umbral, ahora) {
        var lista = [];
        var heladas = noche && noche.min <= umbral;
        if (heladas) lista.push({ icono: "ac_unit", titulo: "Prepárate para la helada", detalle: "Un riego ligero por la tarde ayuda a que el suelo guarde calor durante la noche." });
        var secos = medidas.filter(function (m) { return SECA[m.zona]; });
        if (secos.length && !heladas) {
            lista.push({ icono: "opacity", titulo: "Programa el riego temprano",
                detalle: plural(secos.length, "sensor marca", "sensores marcan") + " suelo seco: regar temprano aprovecha mejor el agua.",
                accion: { tipo: "equipo", clave: secos[0].red.key }, boton: "Ver " + secos[0].red.name });
        }
        var sinSenal = sistemas.filter(function (s) { var r = resumenDe(s) || {}; return /comunicaci/i.test(r.mensaje || ""); });
        if (sinSenal.length) {
            lista.push({ icono: "wifi_off", titulo: "Revisa la conexión de " + sinSenal[0].name,
                detalle: "No reporta desde hace rato: verifica la alimentación y la señal" + (sinSenal.length > 1 ? " (y " + plural(sinSenal.length - 1, "equipo más", "equipos más") + ")." : "."),
                accion: { tipo: "equipo", clave: sinSenal[0].key }, boton: "Ver equipo" });
        }
        var sinCultivo = medidas.filter(function (m) { return !String(m.sensor.culture || "").trim(); });
        if (sinCultivo.length) {
            lista.push({ icono: "local_florist", titulo: "Asigna el cultivo a tus sensores",
                detalle: plural(sinCultivo.length, "sensor no tiene", "sensores no tienen") + " cultivo: asígnalo para verlo en \"Mis cultivos\".",
                accion: { tipo: "equipo", clave: sinCultivo[0].red.key }, boton: "Ver " + sinCultivo[0].red.name });
        }
        var sinParcela = medidas.filter(function (m) { return String(m.sensor.culture || "").trim() && !(m.sensor.poligon && String(m.sensor.poligon).trim()); });
        if (sinParcela.length) {
            lista.push({ icono: "crop_free", titulo: "Dibuja tus parcelas",
                detalle: plural(sinParcela.length, "sensor no tiene", "sensores no tienen") + " parcela dibujada: así calculamos las hectáreas.",
                accion: { tipo: "equipo", clave: sinParcela[0].red.key }, boton: "Ver " + sinParcela[0].red.name });
        }
        lista = lista.slice(0, 2);
        lista.push(CONSEJOS[diaDelAnio(ahora) % CONSEJOS.length]);
        return lista;
    }

    /** Tablero completo. */
    function tablero(sistemasObj, deps, opciones) {
        var o = opciones || {};
        var sistemas = lista(sistemasObj);
        var resumenDe = o.resumenDe || function (s) { return deps.resumen.resumenDeEquipo(s, deps, {}); };
        var bien = 0, enRiego = 0, atiende = [];
        sistemas.forEach(function (s) {
            var r = resumenDe(s) || {};
            if (r.estado === "ok") bien += 1;
            if (regando(s, r)) enRiego += 1;
            if (ORDEN[r.estado] !== undefined) {
                atiende.push({
                    clave: s.key, nivel: r.estado,
                    titulo: s.name + " · " + r.mensaje,
                    detalle: (NOMBRES[s.type] || "Equipo") + (r.linea ? " · " + r.linea : "")
                });
            }
        });
        var medidas = lecturas(sistemas, deps);
        var conHumedad = medidas.filter(function (m) { return m.zona !== null; });
        var adecuadas = conHumedad.filter(function (m) { return ADECUADA[m.zona]; }).length;

        var noche = o.pronostico && isFinite(o.pronostico.min) ? o.pronostico : null;
        var umbral = isFinite(o.umbralHelada) ? o.umbralHelada : 2;
        if (noche && noche.min <= umbral) {
            atiende.push({
                clave: null, nivel: noche.min <= 0 ? "emergencia" : "atencion",
                titulo: "Helada esta noche · " + Math.round(noche.min) + " °C",
                detalle: "Mínima hacia las " + horaDe(noche.instante) + " · Protege tus cultivos"
            });
        }
        atiende.sort(function (a, b) { return ORDEN[a.nivel] - ORDEN[b.nivel]; });

        var ahora = o.ahora || Date.now();
        var vacio = !!o.sinEquipos && !sistemas.length;
        var sugerencias = vacio ? sugerenciasDeInicio(!!o.instalada) : sugerenciasDelDia(sistemas, medidas, resumenDe, noche, umbral, ahora);

        var urgentes = atiende.filter(function (a) { return a.nivel === "emergencia"; }).length;
        var semaforo = !atiende.length
            ? { nivel: "ok", titulo: "Todo en orden", detalle: plural(sistemas.length, "equipo sin alertas", "equipos sin alertas") }
            : {
                nivel: urgentes ? "emergencia" : "atencion",
                titulo: (atiende.length === 1 ? "1 cosa requiere" : atiende.length + " cosas requieren") + " tu atención",
                detalle: [urgentes ? plural(urgentes, "urgente", "urgentes") : "", (atiende.length - urgentes) ? (atiende.length - urgentes) + " por revisar hoy" : ""]
                    .filter(Boolean).join(" · ")
            };

        return {
            semaforo: semaforo,
            kpis: {
                equiposBien: bien, total: sistemas.length, regando: enRiego,
                sueloAdecuado: conHumedad.length ? Math.round(adecuadas * 100 / conHumedad.length) : null,
                nocheMin: noche ? Math.round(noche.min) : null
            },
            atiende: atiende,
            cultivos: cultivos(sistemas, deps, medidas),
            vacio: vacio,
            sugerencias: sugerencias
        };
    }

    // ---------- "Hoy": eventos del dia ----------

    /**
     * Evento al cambiar el resumen de un equipo (null si no hay cambio que contar). `antes` null = primera vez
     * (no es un evento: es el estado al abrir la app).
     */
    function eventoDeCambio(sistema, antes, ahora, instante) {
        if (!antes || !ahora) return null;
        if (antes.estado === ahora.estado && antes.linea === ahora.linea) return null;
        var nombre = sistema.name || "Equipo";
        var texto, nivel = ahora.estado;
        if (ahora.estado === "emergencia" || ahora.estado === "atencion") texto = nombre + ": " + ahora.mensaje;
        else if (antes.estado === "emergencia" || antes.estado === "atencion") { texto = nombre + ": se normalizó"; nivel = "ok"; }
        else if (/^Operando|^Regando|^Bombeando/.test(ahora.linea || "") && !/^Operando|^Regando|^Bombeando/.test(antes.linea || "")) texto = nombre + ": inició el riego";
        else if (/^Operando|^Regando|^Bombeando/.test(antes.linea || "") && !/^Operando|^Regando|^Bombeando/.test(ahora.linea || "")) texto = nombre + ": terminó el riego";
        else if (/^Regando/.test(ahora.linea || "")) texto = nombre + ": " + ahora.linea.charAt(0).toLowerCase() + ahora.linea.slice(1);
        else return null;
        return { id: (sistema.key || nombre) + "|" + instante, instante: instante, hora: horaDe(instante), texto: texto, nivel: nivel };
    }

    function mismoDia(a, b) {
        var x = new Date(a), y = new Date(b);
        return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
    }

    /** Linea del dia: eventos y notificaciones de hoy (mas reciente arriba) y lo que viene (helada). */
    function lineaDeHoy(eventos, notificaciones, pronostico, ahora, umbralHelada) {
        var ya = ahora || Date.now();
        var items = (eventos || []).filter(function (e) { return mismoDia(e.instante, ya); }).map(function (e) {
            return { instante: e.instante, hora: horaDe(e.instante), texto: e.texto, nivel: e.nivel };
        });
        (notificaciones || []).filter(function (n) { return mismoDia(n.fecha, ya); }).forEach(function (n) {
            items.push({ instante: n.fecha, hora: horaDe(n.fecha), texto: n.titulo + (n.mensaje ? " · " + n.mensaje : ""),
                nivel: n.nivel === "critica" ? "emergencia" : (n.nivel === "alta" || n.nivel === "media") ? "atencion" : "ok" });
        });
        items.sort(function (a, b) { return b.instante - a.instante; });
        var umbral = isFinite(umbralHelada) ? umbralHelada : 2;
        if (pronostico && isFinite(pronostico.min) && pronostico.min <= umbral && pronostico.instante > ya) {
            items.unshift({ instante: pronostico.instante, hora: horaDe(pronostico.instante), texto: "Próximo: riesgo de helada (" + Math.round(pronostico.min) + " °C)", nivel: "proximo" });
        }
        return items.slice(0, 12);
    }

    /** Minima de la noche desde el pronostico horario de Open-Meteo: de ahora a las 9 h del dia siguiente. */
    function minimaDeLaNoche(horas, temperaturas, ahora) {
        var ya = ahora || Date.now();
        var fin = new Date(ya); fin.setDate(fin.getDate() + (fin.getHours() >= 9 ? 1 : 0)); fin.setHours(9, 0, 0, 0);
        var mejor = null;
        (horas || []).forEach(function (h, i) {
            var t = Number(temperaturas[i]), ms = typeof h === "number" ? h : Date.parse(h);
            if (!isFinite(t) || !isFinite(ms) || ms < ya - 3600000 || ms > fin.getTime()) return;
            if (!mejor || t < mejor.min) mejor = { min: t, instante: ms };
        });
        return mejor;
    }

    return { tablero: tablero, eventoDeCambio: eventoDeCambio, lineaDeHoy: lineaDeHoy, minimaDeLaNoche: minimaDeLaNoche, nombreDeCultivo: nombreDeCultivo, CONSEJOS: CONSEJOS };
}));
