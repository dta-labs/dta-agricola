/**
 * REQ-023 - Gestion de usuarios: perfil del productor y planes (logica pura).
 *
 * No conoce Angular, ni Firebase, ni el DOM: se puede probar entero con Node.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DTALogic = root.DTALogic || {};
        root.DTALogic.perfil = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var OPCIONES = {
        problemas: [
            "Monitoreo constante de mis cultivos",
            "Optimización del riego",
            "Automatización de la producción",
            "Automatizar la bitácora de campo",
            "Alertas de riesgos climáticos y de plagas",
            "Todos los anteriores",
            "Otros",
            "Ninguno en particular"
        ],
        inversion: ["Menos de 25 mil", "Entre 25 mil y 50 mil", "Más de 50 mil"],
        decision: ["Yo personalmente", "Un grupo de socios", "Yo no participo"],
        entrevista: ["Esta semana", "Este mes", "Por el momento no"],
        rol: ["Propietario", "Asesor", "Trabajador", "Invitado"]
    };

    var PLANES = [
        {
            id: "gratis",
            nombre: "Gratis",
            precio: "Sin costo",
            periodo: "",
            caracteristicas: [
                "1 usuario",
                "1 parcela",
                "Hasta 5 sensores de humedad del suelo",
                "Monitoreo satelital de humedad del suelo y vigor",
                "Alertas de humedad y heladas",
                "Estado climatológico",
                "Garantía de 3 meses"
            ]
        },
        {
            id: "basico",
            nombre: "Básico",
            precio: "500/mes ~ 5,000/año MXN",
            periodo: "mensual o anual",
            caracteristicas: [
                "Todo lo del plan Gratis",
                "Hasta 3 usuarios",
                "Hasta 3 parcelas",
                "Hasta 30 sensores de humedad del suelo",
                "Hasta 3 sistemas de automatización",
                "Monitoreo satelital con vapor de agua, estrés temprano y clorofila",
                "Garantía extendida de 6 meses"
            ]
        },
        {
            id: "avanzado",
            nombre: "Avanzado",
            precio: "700/mes ~ 7,000/año MXN",
            periodo: "mensual o anual",
            caracteristicas: [
                "Todo lo del plan Básico",
                "Hasta 5 parcelas",
                "Hasta 50 sensores de humedad del suelo",
                "Hasta 5 sistemas de automatización",
                "Monitoreo satelital total",
                "Análisis histórico de la evolución del cultivo (humedad del suelo y vigor)"
            ]
        }
    ];

    /** true si la cuenta se creo con Google (permite "Cambiar de usuario"). */
    function esDeGoogle(usuario) {
        if (!usuario || !Array.isArray(usuario.providerData)) return false;
        return usuario.providerData.some(function (proveedor) {
            return proveedor && String(proveedor.providerId || "").indexOf("google.com") >= 0;
        });
    }

    /**
     * Perfil que se muestra en el popup: lo guardado manda; si falta algo y la sesion
     * viene de Google, se completa con lo que devuelve su cuenta.
     */
    function perfilDesdeUsuario(usuario, guardado) {
        var previo = guardado || {};
        var nombreGoogle = String((usuario && usuario.displayName) || "").trim();
        var partes = nombreGoogle ? nombreGoogle.split(/\s+/) : [];
        var corte = Math.max(1, Math.floor(partes.length / 2));
        var nombresGoogle = partes.length ? partes.slice(0, corte).join(" ") : "";
        var apellidosGoogle = partes.length > 1 ? partes.slice(corte).join(" ") : "";
        var email = (usuario && usuario.email) || previo.email || "";

        if (!nombresGoogle) {
            nombresGoogle = String(email).split("@")[0] || "";
        }

        var perfil = {
            nombres: previo.nombres || nombresGoogle,
            apellidos: previo.apellidos || apellidosGoogle,
            fechaNacimiento: previo.fechaNacimiento || "",
            email: email,
            telefono: previo.telefono || (usuario && usuario.phoneNumber) || "",
            problemas: Array.isArray(previo.problemas) ? previo.problemas.slice() : [],
            otrosProblemas: previo.otrosProblemas || "",
            inversion: previo.inversion || "",
            decision: previo.decision || "",
            entrevista: previo.entrevista || "",
            rol: previo.rol || "",
            plan: previo.plan || "gratis",
            // Campos que ya existian y no deben perderse al guardar.
            direccion: previo.direccion || "",
            estado: previo.estado || "",
            zipCode: previo.zipCode || "",
            bankAccount: previo.bankAccount || ""
        };
        return perfil;
    }

    /**
     * Une las casillas marcadas con el texto de "Otros".
     * "Todos los anteriores" y "Ninguno en particular" son excluyentes.
     */
    function combinarProblemas(seleccion, otros) {
        var marcadas = Array.isArray(seleccion) ? seleccion.slice() : [];
        if (marcadas.indexOf("Todos los anteriores") >= 0) return ["Todos los anteriores"];
        if (marcadas.indexOf("Ninguno en particular") >= 0) return ["Ninguno en particular"];

        var resultado = marcadas.filter(function (valor) {
            return valor !== "Otros";
        });
        if (marcadas.indexOf("Otros") >= 0) {
            var texto = String(otros == null ? "" : otros).trim();
            resultado.push(texto ? "Otros: " + texto : "Otros");
        }
        return resultado;
    }

    /** Errores que impiden guardar el perfil (lista vacia = valido). */
    function validarPerfil(perfil) {
        var errores = [];
        var datos = perfil || {};

        if (!String(datos.nombres || "").trim()) {
            errores.push("El nombre es obligatorio.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(datos.email || ""))) {
            errores.push("El correo no es válido.");
        }
        var problemas = Array.isArray(datos.problemas) ? datos.problemas : [];
        if (problemas.indexOf("Otros") >= 0 && !String(datos.otrosProblemas || "").trim()) {
            errores.push("Describe el problema en \"Otros\".");
        }
        return errores;
    }

    /**
     * REQ-036: segunda URL para la foto de Google si la primera no carga.
     * Las fotos de googleusercontent terminan en "=s96-c": otro tamano es otra URL (otra peticion,
     * sin la respuesta fallida en cache). Devuelve null si no hay nada distinto que probar.
     */
    function fotoAlternativa(url) {
        var texto = String(url == null ? "" : url).trim();
        if (!/^https:\/\//.test(texto)) return null;
        if (!/googleusercontent\.com\//.test(texto)) return null;
        if (/=s\d+(-c)?$/.test(texto)) return texto.replace(/=s\d+(-c)?$/, "=s128-c");
        if (texto.indexOf("=") >= 0) return null;
        return texto + "=s128-c";
    }

    function planPorId(id) {
        for (var i = 0; i < PLANES.length; i += 1) {
            if (PLANES[i].id === id) return PLANES[i];
        }
        return PLANES[0];
    }

    return {
        OPCIONES: OPCIONES,
        PLANES: PLANES,
        esDeGoogle: esDeGoogle,
        perfilDesdeUsuario: perfilDesdeUsuario,
        combinarProblemas: combinarProblemas,
        validarPerfil: validarPerfil,
        planPorId: planPorId,
        fotoAlternativa: fotoAlternativa
    };
}));
