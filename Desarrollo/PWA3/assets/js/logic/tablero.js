/**
 * REQ-114 - Tablero de resumen (pagina de entrada): indicadores, "Atiende primero", "Mis cultivos" y "Hoy".
 * REQ-155 - Rediseño por enfoques (roles): alertas separadas en Críticas / Por revisar (solo lo crítico va en rojo),
 *   4 indicadores (riego y equipos, suelo ponderado por temporada, pendientes, mínima de la noche), "Qué atender
 *   primero" por impacto con las confirmaciones agrupadas, "Lo que toca hoy" (lista de acciones), sugerencias solo
 *   ligadas a datos (maximo 3) y cultivos por prioridad y superficie (en reposo, el suelo seco no es urgente).
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

    var NOMBRES = { PC: "Pivote central", PL: "Pivote lineal", Estacionario: "Riego sectorial", Pozo: "Bombeo", Pump: "Bombeo", Sensor: "Red de sensores", Nevera: "Nevera", Invernadero: "Invernadero" };
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

    /**
     * Lecturas de humedad y temperatura de todos los sensores de las redes: [{ red, sensor, zona, helada, hectareas,
     * reposo }]. REQ-155: `reposo` = el cultivo del sensor esta en su reposo invernal (su suelo seco o su helada no
     * son urgentes); `hectareas` = superficie de su parcela (pondera el indicador de suelo).
     */
    function lecturas(sistemas, deps, ahora) {
        var salida = [];
        sistemas.filter(function (s) { return s.type === "Sensor"; }).forEach(function (red) {
            var datos = deps.humedad.datosCrudos(red);
            sensoresDe(red).forEach(function (x) {
                var v = deps.humedad.valoresDeSensor(red, x.indice, datos);
                var poligono = x.sensor.poligon;
                var ha = deps.geo && poligono && deps.geo.esPoligonoValido(poligono) ? deps.geo.areaHectareas(deps.geo.normalizarPoligono(poligono)) : 0;
                salida.push({
                    red: red, sensor: x.sensor,
                    zona: v.ms === null ? null : deps.medidor.escalaHumedadSuelo(x.sensor, v.ms).etiqueta,
                    helada: v.t !== null && deps.medidor.escalaTemperatura(v.t, x.sensor, "C").nivel === "frio",
                    hectareas: ha,
                    reposo: !!(x.sensor.culture && enReposo(x.sensor.culture, red.latitude, ahora || Date.now(), deps.frio))
                });
            });
        });
        return salida;
    }

    function nombreDeCultivo(texto) {
        // REQ-151: mientras la base tenga nombres mal escritos, el resumen los muestra corregidos
        var t = String(texto || "").trim()
            .replace(/jalape(\uFFFD+|\u00C3\u00B1|\?+)o/gi, "Jalapeño").replace(/\bmanazana(s?)\b/gi, "Manzana$1");
        return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
    }

    /** Clave para agrupar cultivos: sin mayusculas ni acentos ("Maiz" y "Maíz" son el mismo). */
    function claveDeCultivo(texto) {
        return String(texto || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function diaDe(ms) {
        var d = new Date(ms);
        return d.getFullYear() + dos(d.getMonth() + 1) + dos(d.getDate());
    }

    /**
     * REQ-138: el cultivo esta en su reposo invernal (temporada de frio, logic/frio.js)? En reposo la helada no es un
     * riesgo para el cultivo (el frio es lo que necesita): no se avisa.
     */
    function enReposo(cultivo, latitud, ahora, frio) {
        if (!frio) return false;
        var temporada = frio.temporadaDeCultivo(cultivo, latitud);
        return !!(temporada && frio.rangoDeTemporada(diaDe(ahora), temporada));
    }

    var GRAVEDAD = { helada: 3, seco: 2, reposo: 1.5, adecuado: 1, "sin-dato": 0 };
    var TEXTOS_CULTIVO = { helada: "Riesgo de helada", seco: "Algo seco", reposo: "En reposo", adecuado: "Adecuado", "sin-dato": "Sin sensor" };
    // REQ-155: orden de "Mis cultivos" (lo que pide accion arriba; en reposo, al final)
    var PRIORIDAD_CULTIVO = { helada: 4, seco: 3, adecuado: 2, "sin-dato": 1, reposo: 0 };

    /** "Operando (237°) · Velocidad 45 %" -> "Operando"; "5 sensores · 54 °F" -> "5 sensores". */
    function lineaCorta(linea) {
        return String(linea || "").split(" · ")[0].replace(/\s*\(.*\)\s*$/, "").trim();
    }

    function cultivos(sistemas, deps, medidas, resumenDe, ahora) {
        var grupos = {};
        function agregar(nombre, hectareas, fase, estado, sistema) {
            var n = nombreDeCultivo(nombre);
            if (!n) return;
            var clave = claveDeCultivo(n);
            var g = grupos[clave] = grupos[clave] || { nombre: n, hectareas: 0, fases: {}, estado: "sin-dato", equipos: [], reposo: false };
            if (/[^\x00-\x7f]/.test(n) && !/[^\x00-\x7f]/.test(g.nombre)) g.nombre = n;   // preferir la forma con acentos
            g.hectareas += hectareas || 0;
            if (fase) g.fases[fase] = (g.fases[fase] || 0) + 1;
            // REQ-138: en reposo invernal la helada no es un riesgo
            var reposo = enReposo(n, sistema && sistema.latitude, ahora, deps.frio);
            if (reposo) g.reposo = true;
            // REQ-155: en reposo ni la helada ni el suelo algo seco son urgentes (se anota, sin alarma)
            if (estado === "seco" && reposo) g.secoEnReposo = true;
            if ((estado === "helada" || estado === "seco") && reposo) estado = "reposo";
            if (GRAVEDAD[estado] > GRAVEDAD[g.estado]) g.estado = estado;
            // REQ-138: equipos donde esta el cultivo (para los que no tienen sensor)
            if (sistema && sistema.key && !g.equipos.some(function (e) { return e.clave === sistema.key; })) {
                var r = resumenDe(sistema) || {};
                g.equipos.push({ clave: sistema.key, nombre: sistema.name, linea: lineaCorta(r.linea), nivel: r.estado || "inactivo" });
            }
        }
        function area(poligono) {
            return deps.geo.esPoligonoValido(poligono) ? deps.geo.areaHectareas(deps.geo.normalizarPoligono(poligono)) : 0;
        }
        medidas.forEach(function (m) {
            if (!m.sensor.culture) return;
            agregar(m.sensor.culture, area(m.sensor.poligon), (m.sensor.phenologicalStage || "").trim(),
                m.helada ? "helada" : m.zona === null ? "sin-dato" : SECA[m.zona] ? "seco" : "adecuado", m.red);
        });
        sistemas.forEach(function (s) {
            if (s.type === "Estacionario") {
                Object.keys(s.plots || {}).filter(function (k) { return /^p[0-6]$/.test(k); }).forEach(function (k) {
                    var p = s.plots[k];
                    if (!p || !p.culture) return;
                    var e = deps.humedad.estadoDeParcela(p, null).estado;
                    agregar(p.culture, area(p.poligon), "", e === "seco" ? "seco" : e === "sin-dato" ? "sin-dato" : "adecuado", s);
                });
            }
            // REQ-144: invernadero: los cultivos de cada sensor (varios por sensor)
            if (s.type === "Invernadero") {
                cultivosDeInvernadero(s).forEach(function (c) { agregar(c.culture, 0, c.phenologicalStage, "sin-dato", s); });
            }
            if (s.type === "PC" && s.plans) {
                var radio = Number(s.length) || 0;
                Object.keys(s.plans).forEach(function (k) {
                    var plan = s.plans[k];
                    if (!plan || !plan.culture) return;
                    var arco = ((Number(plan.endAngle) - Number(plan.starAngle)) % 360 + 360) % 360 || 360;
                    agregar(plan.culture, Math.PI * radio * radio * arco / 360 / 10000, "", "sin-dato", s);
                });
            }
        });
        return Object.keys(grupos).map(function (k) {
            var g = grupos[k];
            var fases = Object.keys(g.fases).sort(function (a, b) { return g.fases[b] - g.fases[a]; });
            return {
                clave: k,
                nombre: g.nombre,
                // REQ-155: superficies pequeñas con 2 decimales (antes 0.04 ha se veia como "0 ha")
                hectareas: g.hectareas ? (g.hectareas < 1 ? Math.max(0.01, Math.round(g.hectareas * 100) / 100) : Math.round(g.hectareas * 10) / 10) : null,
                fase: fases[0] || (g.reposo ? "En reposo invernal" : ""),
                estado: g.estado,
                texto: g.estado === "reposo" && g.secoEnReposo ? "En reposo · suelo algo seco, sin urgencia" : TEXTOS_CULTIVO[g.estado],
                reposo: g.reposo,
                equipo: g.equipos[0] || null,             // REQ-138: equipo donde esta (el primero)
                otrosEquipos: Math.max(0, g.equipos.length - 1)
            };
        })
        // REQ-155: por prioridad operativa (helada, seco, sin dato...) y luego por superficie (mayor primero)
        .sort(function (a, b) {
            return PRIORIDAD_CULTIVO[b.estado] - PRIORIDAD_CULTIVO[a.estado] || (b.hectareas || 0) - (a.hectareas || 0) || a.nombre.localeCompare(b.nombre);
        });
    }

    /** REQ-138: claves de los equipos cuyos cultivos (sensores, parcelas o plan) estan todos en reposo invernal. */
    /** REQ-144: cultivos de los sensores de un invernadero ([{ culture, phenologicalStage }]; `cultures` o `culture`). */
    function cultivosDeInvernadero(s) {
        var salida = [];
        Object.keys(s.sensors || {}).filter(function (k) { return /^S\d+$/.test(k) && s.sensors[k] && s.sensors[k].id; }).forEach(function (k) {
            var sensor = s.sensors[k];
            var lista = Array.isArray(sensor.cultures) ? sensor.cultures
                : sensor.cultures && typeof sensor.cultures === "object" ? Object.keys(sensor.cultures).map(function (i) { return sensor.cultures[i]; })
                : [{ culture: sensor.culture, phenologicalStage: sensor.phenologicalStage }];
            lista.forEach(function (c) {
                var nombre = c && String(c.culture || "").trim();
                if (nombre) salida.push({ culture: nombre, phenologicalStage: String(c.phenologicalStage || "").trim() });
            });
        });
        return salida;
    }

    function sistemasConTodoEnReposo(sistemas, medidas, deps, ahora) {
        var claves = [];
        sistemas.forEach(function (s) {
            var nombres = [];
            if (s.type === "Sensor") medidas.filter(function (m) { return m.red === s; }).forEach(function (m) { if (m.sensor.culture) nombres.push(m.sensor.culture); });
            if (s.type === "Estacionario") Object.keys(s.plots || {}).forEach(function (k) { if (/^p[0-6]$/.test(k) && s.plots[k] && s.plots[k].culture) nombres.push(s.plots[k].culture); });
            if (s.type === "PC" && s.plans) Object.keys(s.plans).forEach(function (k) { if (s.plans[k] && s.plans[k].culture) nombres.push(s.plans[k].culture); });
            if (s.type === "Invernadero") cultivosDeInvernadero(s).forEach(function (c) { nombres.push(c.culture); });
            if (nombres.length && nombres.every(function (n) { return enReposo(n, s.latitude, ahora, deps.frio); })) claves.push(s.key);
        });
        return claves;
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
        if (heladas) lista.push({ icono: "ac_unit", titulo: "Prepárate para la helada",
            detalle: "Mínima de " + Math.round(noche.min) + " °C hacia las " + horaDe(noche.instante) + ": un riego ligero por la tarde ayuda a que el suelo guarde calor; evita regar de madrugada." });
        var secos = medidas.filter(function (m) { return SECA[m.zona] && !m.reposo; });   // REQ-155: en reposo no es urgente
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
        // REQ-160: asignar cultivos y dibujar parcelas son tareas de configuracion (configuracionPendiente), no del dia
        // REQ-155: maximo 3 y ligadas a datos; el consejo general solo si no hay ninguna
        lista = lista.slice(0, 3);
        if (!lista.length) lista.push(CONSEJOS[diaDelAnio(ahora) % CONSEJOS.length]);
        return lista;
    }

    /**
     * REQ-160: configuracion pendiente (datos que faltan para que los indicadores sean certeros). Va aparte del "rescate
     * de hoy": en el enfoque Administracion y plegada al final en Todo.
     */
    function configuracionPendiente(sistemas, medidas, agua, plagas) {
        var lista = [];
        var sinCultivo = medidas.filter(function (m) { return !String(m.sensor.culture || "").trim(); });
        if (sinCultivo.length) {
            lista.push({ icono: "local_florist", titulo: "Asigna el cultivo a tus sensores",
                detalle: plural(sinCultivo.length, "sensor no tiene", "sensores no tienen") + " cultivo: sin él no hay temporada, reposo ni humedad de referencia.",
                accion: { tipo: "equipo", clave: sinCultivo[0].red.key }, boton: "Ver " + sinCultivo[0].red.name });
        }
        var sinParcela = medidas.filter(function (m) { return String(m.sensor.culture || "").trim() && !(m.sensor.poligon && String(m.sensor.poligon).trim()); });
        if (sinParcela.length) {
            lista.push({ icono: "crop_free", titulo: "Dibuja tus parcelas",
                detalle: plural(sinParcela.length, "sensor no tiene", "sensores no tienen") + " parcela dibujada: así calculamos las hectáreas.",
                accion: { tipo: "equipo", clave: sinParcela[0].red.key }, boton: "Ver " + sinParcela[0].red.name });
        }
        if (agua && agua.sinCaudal) {
            lista.push({ icono: "waves", titulo: "Configura el caudal de tus equipos",
                detalle: plural(agua.sinCaudal, "equipo riega", "equipos riegan") + " sin caudal configurado: el consumo de agua queda incompleto.",
                accion: { tipo: "equipos" }, boton: "Ver equipos" });
        }
        if (plagas && plagas.nivel === "sin-vigilancia" && medidas.length) {
            lista.push({ icono: "bug_report", titulo: "Activa las alertas de plagas",
                detalle: "Ningún sensor vigila enfermedades: actívalas en la configuración de cada sensor.",
                accion: { tipo: "equipo", clave: medidas[0].red.key }, boton: "Ver " + medidas[0].red.name });
        }
        return lista;
    }

    // ---------- REQ-160: helada medida en los sensores, agrupada ----------

    /** Sensores bajo el minimo en el mensaje del resumen ("Helada en Sensor 1" = 1, "Helada en 3 sensores" = 3). */
    function sensoresEnHelada(mensaje) {
        var m = /^Helada en (\d+) sensores/.exec(mensaje || "");
        return m ? parseInt(m[1], 10) : 1;
    }

    // ---------- REQ-155: clasificacion de los avisos por impacto ----------
    // categoria: "critico" (falla real o riesgo inmediato: rojo), "agronomia" (suelo seco de un cultivo activo),
    // "comunicacion" (sin reportar) y "confirmacion" (esperando confirmacion). Solo "critico" grita en rojo.
    var CATEGORIAS = {
        critico: { orden: 0, nivel: "emergencia" },
        agronomia: { orden: 1, nivel: "atencion" },
        comunicacion: { orden: 2, nivel: "revision" },
        confirmacion: { orden: 3, nivel: "revision" }
    };

    function categoriaDe(r, s, enReposoTodo) {
        var m = String(r.mensaje || "");
        if (r.estado === "emergencia") {
            // helada de sensores cuyos cultivos estan todos en reposo: no es urgente
            if (s.type === "Sensor" && /^Helada/.test(m) && enReposoTodo) return null;
            return "critico";
        }
        if (r.estado !== "atencion") return null;
        if (/confirmaci/i.test(m)) return "confirmacion";
        if (/comunicaci|Sin reportar/i.test(m)) return "comunicacion";
        if (s.type === "Sensor" && enReposoTodo) return null;          // suelo seco en reposo: sin urgencia
        return "agronomia";
    }

    /** Acción concreta para "Lo que toca hoy" a partir de un aviso. */
    function accionDe(a) {
        if (a.tipo === "helada-medida") return "Activar la protección contra helada en " + a.nombres.length + " equipos (" + plural(a.sensores, "sensor", "sensores") + " bajo el mínimo)";
        if (a.grupo) {
            var nombres = a.nombres.length === 1 ? a.nombres[0] : a.nombres.length + " equipos";
            return a.categoria === "confirmacion" ? "Confirmar el riego en " + nombres : "Revisar la conexión de " + nombres;
        }
        if (a.tipo === "helada") return "Verificar la mínima nocturna (" + a.minimo + " °C hacia las " + a.hora + ")";
        if (/^Helada en /.test(a.mensaje || "")) return "Activar la protección contra helada en " + a.nombre;
        if (a.categoria === "agronomia") return "Programar riego en " + a.nombre;
        if (/^(Acción inmediata|Requiere atención)/.test(a.mensaje || "")) return "Atender " + a.nombre;
        return "Revisar " + a.mensaje.charAt(0).toLowerCase() + a.mensaje.slice(1) + " en " + a.nombre;
    }

    // ---------- REQ-156: consumo de agua y riesgo de plagas ----------

    /**
     * Caudal configurado de un equipo (settings.caudal) en m³/h, o null. La ventana dice "m³/s" pero la dosis lo usa
     * como litros por segundo: valores menores que 1 se toman como m³/s y el resto como L/s (un pivote da 20-120 L/s).
     */
    function caudalM3h(valor) {
        var n = Number(String(valor === undefined || valor === null ? "" : valor).replace(",", "."));
        if (!isFinite(n) || n <= 0) return null;
        return n < 1 ? n * 3600 : n * 3.6;
    }

    /** Agua en curso: { m3h (estimado + medido), activos, sinCaudal, medidos } (null m3h si no hay como saberlo). */
    function aguaEnCurso(sistemas, resumenDe, deps) {
        var total = 0, conDato = 0, activos = 0, sinCaudal = 0, medidos = 0;
        sistemas.forEach(function (s) {
            var r = resumenDe(s) || {};
            if (regando(s, r)) {
                activos += 1;
                var q = caudalM3h(s.caudal);
                if (q === null && s.type === "Estacionario") {
                    // sin caudal del equipo: el de las valvulas abiertas
                    (r.valvulas || []).filter(function (v) { return !v.motor && v.estado === "encendido"; }).forEach(function (v) {
                        var qv = caudalM3h(s.plots && s.plots[v.clave] && s.plots[v.clave].caudal);
                        if (qv !== null) q = (q || 0) + qv;
                    });
                }
                if (q === null) sinCaudal += 1; else { total += q; conDato += 1; }
            }
            // caudalimetros (sensores Fl de neveras e invernaderos, L/min): medido
            if ((s.type === "Nevera" || s.type === "Invernadero") && deps.humedad) {
                var datos = deps.humedad.datosCrudos(s);
                sensoresDe(s).forEach(function (x) {
                    if (x.sensor.type !== "Fl") return;
                    var lmin = Number(datos[x.indice * 3]);
                    if (isFinite(lmin) && lmin > 0) { total += lmin * 0.06; medidos += 1; }
                });
            }
        });
        return { m3h: conDato || medidos ? Math.round(total) : (activos ? null : 0), activos: activos, sinCaudal: sinCaudal, medidos: medidos };
    }

    var NIVEL_PLAGA = { alta: 3, media: 2, baja: 1 };
    var TEXTO_PLAGA = { 3: "Alto", 2: "Medio", 1: "Bajo" };

    /**
     * Riesgo de plagas: avisos "Plagas" (disease-risk, Cloud Functions) de las ultimas 48 h y sensores que las
     * vigilan (sensor.alerts con alguna enfermedad activada).
     */
    function riesgoDePlagas(sistemas, notificaciones, ahora) {
        var vigilados = 0;
        sistemas.filter(function (s) { return s.type === "Sensor"; }).forEach(function (s) {
            sensoresDe(s).forEach(function (x) {
                var a = x.sensor.alerts;
                if (a && typeof a === "object" && Object.keys(a).some(function (k) { return a[k] === true; })) vigilados += 1;
            });
        });
        var recientes = (notificaciones || []).filter(function (n) {
            return n && n.tipo === "plagas" && isFinite(n.fecha) && ahora - n.fecha <= 48 * 3600000 && ahora - n.fecha >= -3600000;
        });
        var nivel = recientes.reduce(function (m, n) { return Math.max(m, NIVEL_PLAGA[n.nivel] || 1); }, 0);
        var peor = recientes.filter(function (n) { return (NIVEL_PLAGA[n.nivel] || 1) === nivel; })
            .sort(function (a, b) { return b.fecha - a.fecha; })[0];
        if (nivel) {
            return { nivel: nivel === 3 ? "alto" : nivel === 2 ? "medio" : "bajo", texto: TEXTO_PLAGA[nivel], avisos: recientes.length,
                nota: (peor.enfermedad ? peor.enfermedad + (peor.probabilidad ? " · " + peor.probabilidad + " %" : "") : plural(recientes.length, "aviso", "avisos") + " en 48 h"),
                vigilados: vigilados };
        }
        if (vigilados) return { nivel: "sin-riesgo", texto: "Sin riesgo", avisos: 0, nota: plural(vigilados, "sensor vigila", "sensores vigilan"), vigilados: vigilados };
        return { nivel: "sin-vigilancia", texto: "—", avisos: 0, nota: "Activa las alertas de plagas en tus sensores", vigilados: 0 };
    }

    /** Tablero completo. */
    function tablero(sistemasObj, deps, opciones) {
        var o = opciones || {};
        var sistemas = lista(sistemasObj);
        var resumenDe = o.resumenDe || function (s) { return deps.resumen.resumenDeEquipo(s, deps, {}); };
        var ahora = o.ahora || Date.now();
        var medidas = lecturas(sistemas, deps, ahora);
        var listaCultivos = cultivos(sistemas, deps, medidas, resumenDe, ahora);
        var sistemasEnReposo = sistemasConTodoEnReposo(sistemas, medidas, deps, ahora);

        var bien = 0, enRiego = 0, avisos = [];
        sistemas.forEach(function (s) {
            var r = resumenDe(s) || {};
            if (r.estado === "ok") bien += 1;
            if (regando(s, r)) enRiego += 1;
            var categoria = categoriaDe(r, s, sistemasEnReposo.indexOf(s.key) >= 0);
            if (!categoria) return;
            avisos.push({
                clave: s.key, categoria: categoria, nivel: CATEGORIAS[categoria].nivel, nombre: s.name, mensaje: r.mensaje,
                titulo: s.name + " · " + r.mensaje,
                detalle: (NOMBRES[s.type] || "Equipo") + (r.linea ? " · " + r.linea : "")
            });
        });

        var conHumedad = medidas.filter(function (m) { return m.zona !== null; });
        var adecuadas = conHumedad.filter(function (m) { return ADECUADA[m.zona]; }).length;
        // REQ-155: humedad optima ponderada: solo sectores activos (fuera del reposo) y por superficie (1 si no hay parcela)
        var activos = conHumedad.filter(function (m) { return !m.reposo; });
        var peso = function (m) { return m.hectareas > 0 ? m.hectareas : 1; };
        var pesoTotal = activos.reduce(function (t, m) { return t + peso(m); }, 0);
        var pesoOptimo = activos.filter(function (m) { return ADECUADA[m.zona]; }).reduce(function (t, m) { return t + peso(m); }, 0);

        var noche = o.pronostico && isFinite(o.pronostico.min) ? o.pronostico : null;
        var umbral = isFinite(o.umbralHelada) ? o.umbralHelada : 2;
        // REQ-138: la helada importa si hay algun cultivo fuera de su reposo invernal (o no hay cultivos registrados).
        var heladaRelevante = !listaCultivos.length || listaCultivos.some(function (c) { return !c.reposo; });
        var riesgoHelada = !!(noche && noche.min <= umbral && heladaRelevante);
        if (riesgoHelada) {
            avisos.push({
                clave: null, categoria: "critico", nivel: "emergencia", tipo: "helada",
                minimo: Math.round(noche.min), hora: horaDe(noche.instante),
                titulo: "Helada esta noche · " + Math.round(noche.min) + " °C",
                detalle: "Mínima hacia las " + horaDe(noche.instante) + " · Protege tus cultivos"
            });
        }

        // REQ-160: la helada medida en varios equipos es UN aviso por impacto (equipos, sensores y hectareas bajo el
        // minimo), no una linea por sensor
        var heladas = avisos.filter(function (a) { return a.categoria === "critico" && /^Helada en /.test(a.mensaje || ""); });
        if (heladas.length > 1) {
            var claves = heladas.map(function (a) { return a.clave; });
            var sensores = heladas.reduce(function (t, a) { return t + sensoresEnHelada(a.mensaje); }, 0);
            var ha = medidas.filter(function (m) { return m.helada && !m.reposo && claves.indexOf(m.red.key) >= 0; })
                .reduce(function (t, m) { return t + (m.hectareas || 0); }, 0);
            var nombresHelada = heladas.map(function (a) { return a.nombre; });
            avisos = avisos.filter(function (a) { return heladas.indexOf(a) < 0; });
            avisos.push({
                clave: null, categoria: "critico", nivel: "emergencia", tipo: "helada-medida", grupo: true,
                nombres: nombresHelada, claves: claves, sensores: sensores,
                hectareas: ha ? Math.round(ha * 10) / 10 : null,
                titulo: "Helada en " + heladas.length + " equipos · " + plural(sensores, "sensor", "sensores") + " bajo el mínimo",
                detalle: (ha ? (Math.round(ha * 10) / 10) + " ha bajo el umbral · " : "") + nombresHelada.slice(0, 3).join(", ") +
                    (nombresHelada.length > 3 ? " y " + (nombresHelada.length - 3) + " más" : "")
            });
        }

        // Agrupar confirmaciones y faltas de comunicacion: un aviso por tipo ("3 equipos esperando confirmacion")
        var atiende = [];
        var grupos = {};
        avisos.forEach(function (a) {
            if (a.categoria !== "confirmacion" && a.categoria !== "comunicacion") { atiende.push(a); return; }
            (grupos[a.categoria] = grupos[a.categoria] || []).push(a);
        });
        Object.keys(grupos).forEach(function (cat) {
            var g = grupos[cat];
            if (g.length === 1) { atiende.push(g[0]); return; }
            var texto = cat === "confirmacion" ? "esperando confirmación" : "sin comunicación";
            atiende.push({
                clave: null, categoria: cat, nivel: "revision", grupo: true,
                nombres: g.map(function (a) { return a.nombre; }), claves: g.map(function (a) { return a.clave; }),
                titulo: g.length + " equipos " + texto,
                detalle: g.map(function (a) { return a.nombre; }).slice(0, 3).join(", ") + (g.length > 3 ? " y " + (g.length - 3) + " más" : "")
            });
        });
        atiende.sort(function (a, b) {
            // dentro de lo critico: fallas de equipo, helada medida y luego la pronosticada
            var peso = function (x) { return x.tipo === "helada" ? 2 : x.tipo === "helada-medida" ? 1 : 0; };
            return CATEGORIAS[a.categoria].orden - CATEGORIAS[b.categoria].orden || peso(a) - peso(b);
        });

        var criticas = avisos.filter(function (a) { return a.categoria === "critico"; });
        var agronomia = avisos.filter(function (a) { return a.categoria === "agronomia"; });
        var revision = avisos.filter(function (a) { return a.categoria === "confirmacion" || a.categoria === "comunicacion"; });

        // "Lo que toca hoy": una accion por aviso (agrupados), maximo 6
        var tocaHoy = atiende.slice(0, 6).map(function (a) {
            var grupoUnico = a.categoria === "confirmacion" || a.categoria === "comunicacion";
            var texto = accionDe(grupoUnico && !a.grupo ? { grupo: true, categoria: a.categoria, nombres: [a.nombre] } : a);
            return { id: (a.clave || a.tipo || a.categoria) + "|" + texto, texto: texto, clave: a.clave, nivel: a.nivel,
                icono: a.tipo === "helada" || a.tipo === "helada-medida" || /^Helada en /.test(a.mensaje || "") ? "ac_unit" : a.categoria === "critico" ? "build" : a.categoria === "agronomia" ? "opacity" : a.categoria === "confirmacion" ? "task_alt" : "wifi_off" };
        });

        var vacio = !!o.sinEquipos && !sistemas.length;
        var agua = aguaEnCurso(sistemas, resumenDe, deps);
        var plagas = riesgoDePlagas(sistemas, o.notificaciones, ahora);
        var sugerencias = vacio ? sugerenciasDeInicio(!!o.instalada) : sugerenciasDelDia(sistemas, medidas, resumenDe, heladaRelevante ? noche : null, umbral, ahora);

        // Banner de alertas: rojo solo con criticas; ambar con avisos agronomicos; neutro si solo hay pendientes
        var plural2 = function (n, uno, varios) { return n ? plural(n, uno, varios) : ""; };
        var semaforo = criticas.length
            ? { nivel: "emergencia", titulo: plural(criticas.length, "alerta crítica", "alertas críticas"),
                // REQ-160: en el orden de "Que atender primero" (la helada agrupada, no un sensor suelto)
                detalle: [atiende.filter(function (a) { return a.categoria === "critico"; }).map(function (a) { return a.titulo; }).slice(0, 3).join(" · "), plural2(agronomia.length + revision.length, "más por revisar", "más por revisar")].filter(Boolean).join(" · ") }
            : agronomia.length
                ? { nivel: "atencion", titulo: "Sin fallas críticas", detalle: [plural(agronomia.length, "aviso de suelo", "avisos de suelo"), plural2(revision.length, "pendiente de revisión", "pendientes de revisión")].filter(Boolean).join(" · ") }
                : revision.length
                    ? { nivel: "revision", titulo: "Sin fallas críticas", detalle: plural(revision.length, "equipo pendiente de revisión", "equipos pendientes de revisión") }
                    : { nivel: "ok", titulo: "Todo en orden", detalle: plural(sistemas.length, "equipo sin alertas", "equipos sin alertas") };

        return {
            semaforo: semaforo,
            alertas: { criticas: criticas.length, agronomia: agronomia.length, revision: revision.length },
            kpis: {
                equiposBien: bien, total: sistemas.length, regando: enRiego,
                fallasCriticas: criticas.filter(function (a) { return a.clave; }).length,
                sueloAdecuado: conHumedad.length ? Math.round(adecuadas * 100 / conHumedad.length) : null,
                humedadOptima: pesoTotal ? Math.round(pesoOptimo * 100 / pesoTotal) : null,
                sectoresActivos: activos.length,
                sectoresOptimos: activos.filter(function (m) { return ADECUADA[m.zona]; }).length,
                sectoresEnReposo: conHumedad.length - activos.length,
                pendientes: tocaHoy.length,
                nocheMin: noche ? Math.round(noche.min) : null,
                riesgoHelada: riesgoHelada,
                agua: agua,                                                                      // REQ-156
                plagas: plagas,                                                                  // REQ-156
                heladaSinRiesgo: !!(noche && noche.min <= umbral && !heladaRelevante)   // helada, pero todo en reposo
            },
            atiende: atiende,
            tocaHoy: tocaHoy,
            cultivos: listaCultivos,
            reposo: { heladaRelevante: heladaRelevante, sistemas: sistemasEnReposo },   // REQ-138 (para "Hoy")
            vacio: vacio,
            sugerencias: sugerencias,
            configuracion: vacio ? [] : configuracionPendiente(sistemas, medidas, agua, plagas)   // REQ-160
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
        return { id: (sistema.key || nombre) + "|" + instante, sistema: sistema.key || "", instante: instante, hora: horaDe(instante), texto: texto, nivel: nivel };
    }

    function mismoDia(a, b) {
        var x = new Date(a), y = new Date(b);
        return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
    }

    /** Linea del dia: eventos y notificaciones de hoy (mas reciente arriba) y lo que viene (helada). */
    function lineaDeHoy(eventos, notificaciones, pronostico, ahora, umbralHelada, reposo) {
        var ya = ahora || Date.now();
        // REQ-138: sin avisos de helada para equipos con todos sus cultivos en reposo (ni el "Proximo" si ningun cultivo
        // la sufre)
        var rp = reposo || { heladaRelevante: true, sistemas: [] };
        var esHelada = function (n) { return n.tipo === "helada" || n.tipo === "temperatura"; };
        var sistemaDeEvento = function (e) { return e.sistema || String(e.id || "").split("|")[0]; };
        // REQ-160: la helada (eventos "X: Helada en ..." y avisos de helada) se agrupa en UNA linea: cuantos equipos y
        // sensores, y entre que horas. La de equipos en reposo se omite (no es riesgo para el cultivo).
        var helada = { equipos: {}, sensores: 0, desde: null, hasta: null };
        var anotarHelada = function (sistema, instante, sensores) {
            if (rp.sistemas.indexOf(sistema) >= 0) return;
            helada.equipos[sistema || "?"] = true;
            helada.sensores += sensores;
            helada.desde = helada.desde === null ? instante : Math.min(helada.desde, instante);
            helada.hasta = helada.hasta === null ? instante : Math.max(helada.hasta, instante);
        };
        var items = [];
        (eventos || []).filter(function (e) { return mismoDia(e.instante, ya); }).forEach(function (e) {
            var m = /: (Helada en .*)$/.exec(e.texto || "");
            if (m) { anotarHelada(sistemaDeEvento(e), e.instante, sensoresEnHelada(m[1])); return; }
            items.push({ instante: e.instante, hora: horaDe(e.instante), texto: e.texto, nivel: e.nivel });
        });
        (notificaciones || []).filter(function (n) { return mismoDia(n.fecha, ya); }).forEach(function (n) {
            if (esHelada(n)) { anotarHelada(n.sistema, n.fecha, 1); return; }
            items.push({ instante: n.fecha, hora: horaDe(n.fecha), texto: n.titulo + (n.mensaje ? " · " + n.mensaje : ""),
                nivel: n.nivel === "critica" ? "emergencia" : (n.nivel === "alta" || n.nivel === "media") ? "atencion" : "ok" });
        });
        var equiposHelada = Object.keys(helada.equipos).length;
        if (equiposHelada) {
            var rango = helada.desde === helada.hasta ? "" : " · " + horaDe(helada.desde) + "–" + horaDe(helada.hasta);
            items.push({ instante: helada.hasta, hora: horaDe(helada.hasta), nivel: "emergencia",
                texto: "Helada en " + plural(equiposHelada, "equipo", "equipos") + " (" + plural(helada.sensores, "aviso", "avisos") + ")" + rango });
        }
        items.sort(function (a, b) { return b.instante - a.instante; });
        var umbral = isFinite(umbralHelada) ? umbralHelada : 2;
        if (rp.heladaRelevante && pronostico && isFinite(pronostico.min) && pronostico.min <= umbral && pronostico.instante > ya) {
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

    return { caudalM3h: caudalM3h, tablero: tablero, eventoDeCambio: eventoDeCambio, lineaDeHoy: lineaDeHoy, minimaDeLaNoche: minimaDeLaNoche, nombreDeCultivo: nombreDeCultivo, CONSEJOS: CONSEJOS };
}));
