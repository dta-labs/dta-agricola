var subscriptionJSON = null;
var userTokenList = [];
var authUser = null;
var map = null;
var canvas = L.canvas();
var svg = L.svg();
var marker = {};
var shape = {};
var indicator = {};
var poligons = {};
var milatitud;
var milongitud;
var miaccuracy;
var charts = [];

/**
 * Puente hacia los modulos de logica (assets/js/logic/*).
 * Esos scripts deben cargarse ANTES de core.js en index.html. Si faltan, falla de forma
 * explicita en la primera llamada: nunca en silencio.
 */
function __modulo(nombre) {
    if (typeof DTALogic === "undefined" || !DTALogic[nombre]) {
        throw new Error("Modulo de logica no cargado: " + nombre +
            ". Revisa el orden de los <script> en index.html.");
    }
    return DTALogic[nombre];
}

/** Acceso al repositorio de datos creado en firebaseComm.js. Falla claro si falta. */
function __repo() {
    if (typeof repoDTA === "undefined" || !repoDTA) {
        throw new Error("Repositorio no inicializado: revisa el orden de los <script> "
            + "(services/repositorio.js y services/adaptadorFirebase.js antes de firebaseComm.js).");
    }
    return repoDTA;
}

/** Acceso al servicio de autenticacion creado en firebaseComm.js. */
function __auth() {
    if (typeof authDTA === "undefined" || !authDTA) {
        throw new Error("Servicio de autenticacion no inicializado: revisa el orden de los <script>.");
    }
    return authDTA;
}

/** Acceso al servicio de dominio de equipos creado en firebaseComm.js. */
function __equipos() {
    if (typeof equiposDTA === "undefined" || !equiposDTA) {
        throw new Error("Servicio de equipos no inicializado: revisa el orden de los <script>.");
    }
    return equiposDTA;
}

// Marca de version: si no ves esto en consola, el navegador sirve un core.js viejo.
console.log("[app] core.js 26.11.07.012");

// #region Controlador Angular

var app = angular.module("Administracion", ["ngRoute"]);

app.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            template: "<p ng-init='showListado()' style='display: none;'>listado</p>"
        })
        .when("/listado", {
            template: "<p ng-init='showListado()' style='display: none;'>listado</p>"
        })
        .when("/sistema", {
            template: "<p ng-init='showSistema()' style='display: none;'>sistema</p>"
        })
        .when("/mapas", {
            template: "<p ng-init='showMapas()' style='display: none;'>mapas</p>"
        })
        .when("/servicios", {
            template: "<p ng-init='showServicios()' style='display: none;'>servicios</p>"
        })
        .when("/estadisticas", {
            template: "<p ng-init='showEstadisticas()' style='display: none;'>estadisticas</p>"
        })
        .when("/ayuda", {
            template: "<p ng-init='showAyuda()' style='display: none;'>ayuda</p>"
        })
        .when("/login", {
            template: "<p ng-init='showLogin()' style='display: none;'>servicios</p>"
        });
});

app.controller("ControladorPrincipal", function ($scope, $timeout) {

    // #region Variables
    
    $scope.selectedWindow = 'intro';
    $scope.systems = {};
    // $scope.systemsFails = {};
    $scope.showMore = false;
    // $scope.statisticSelectedSystem = {};
    let sendCommand = {};
    $scope.limitRegisters = 10;
    $scope.logs = {};
    let logRequestSequence = 0;
    let historyRequestId = 0;
    const latestLogRequestBySystem = {};
    $scope.historyLoadingOption = null;
    // $scope.logDetail = {};
    $scope.users = {};
    $scope.meteo = [];
    const OPENWEATHER_ICON_URL = "https://openweathermap.org/img/w";
    const historicalWeatherCache = new Map();
    $scope.as_config = false;
    $scope.as_adjust = false;
    $scope.as_more = false;
    $scope.as_hist = false;
    $scope.as_users = false;
    $scope.isPlanning = false;
    $scope.listOfCultures = {};   // nunca undefined: los <select ng-options> revientan con undefined
    $scope.tiposSuelos = [
        {"id": "1", "type": "Arcilloso limoso"},
        {"id": "2", "type": "Arcilloso arenoso"},
        {"id": "3", "type": "Franco arcilloso"},
        {"id": "4", "type": "Franco arcillo limoso"},
        {"id": "5", "type": "Franco arcillo arenoso"},
        {"id": "6", "type": "Franco"},
        {"id": "7", "type": "Franco limoso"},
        {"id": "8", "type": "Franco arenoso"},
        {"id": "9", "type": "Limoso"},
        {"id": "10", "type": "Areno Franco"},
        {"id": "11", "type": "Arenoso"}
    ];
    $scope.programaEstacionario = {
        nombre: '',
        fecha_inicio: '',
        fecha_fin: '',
        hora_inicio: '',
        cada: 1,
        periodo: 0,
        t: [0, 0, 0, 0, 0, 0, 0]
    };
    $scope.chartItems = 24;
    // Variable para controlar el tipo de gráfico seleccionado: 'moisture', 'humidity' o 'temperature'
    $scope.chartType = 'moisture';
    $scope.tempUnit = "F";
    
    // Método para cambiar el tipo de gráfico seleccionado
    $scope.setChartType = (type) => {
        $scope.chartType = type;
    }
    $scope.sensorNetworks = [];
    $scope.sensorsList = [];
    $scope.showSensorMapView = true;

    $scope.toggleSensorMapView = () => {
        $scope.showSensorMapView = !$scope.showSensorMapView;

        // Leaflet necesita recalcular el contenedor después de volver a mostrarlo.
        if ($scope.showSensorMapView) {
            $timeout(() => {
                if (map) map.invalidateSize();
            });
        }
    };

    // #endregion Variables

    // #region NAVEGACION

    $scope.showListado = () => {
        $scope.showWindow('listado');
    }

    $scope.showSistema = () => {
        $scope.showWindow('sistema');
    }

    $scope.showMapas = () => {
        $scope.showWindow('mapas');
    }

    $scope.showServicios = () => {
        $scope.showWindow('servicios');
    }

    $scope.showEstadisticas = () => {
        $scope.showWindow('estadisticas');
    }

    $scope.showAyuda = () => {
        $scope.abrirAyuda();   // REQ-050: la ruta #!/ayuda abre el modal
    }

    $scope.showLogin = () => {
        $scope.login();
    }

    $scope.showWindow = windowsName => {
        $scope.showMore = false;
        if (!$scope.authUser) {
            $scope.selectedWindow = 'login';
            showContent();
            return;
        }
        $scope.selectedWindow = windowsName;
        if (windowsName == "listado") {
            systemsETL();
            const navBar = document.getElementById("top-navbar");
            if (navBar) {
                navBar.style.backgroundColor = "#00000000"; 
                navBar.style.color = "#000"; 
            }
        }
        // window.scrollTo(0, 0);
        showContent();
    }

    systemsETL = () => {
        if ($scope.systems) {
            for (let locationKey in $scope.systems) {
                $scope.systems[locationKey].status = $scope.systems[locationKey].status == true || $scope.systems[locationKey].status == "ON" ? "ON" : "OFF";
                $scope.systems[locationKey].sensorSecurity = $scope.systems[locationKey].sensorSecurity == true || $scope.systems[locationKey].sensorSecurity == "ON" ? "ON" : "OFF";
                $scope.systems[locationKey].sensorVoltage = $scope.systems[locationKey].sensorVoltage == true || $scope.systems[locationKey].sensorVoltage == "ON" ? "ON" : "OFF";
                $scope.systems[locationKey].sensorPosition = $scope.systems[locationKey].sensorPosition == true || $scope.systems[locationKey].sensorPosition == "ON" ? "ON" : "OFF";
                $scope.systems[locationKey].direction = $scope.systems[locationKey].direction == true || $scope.systems[locationKey].direction == "FF" ? "FF" : "RR";
            }
        }
    }

    showContent = () => {
        // document.getElementById("intro").style.display = "none";
        const contenido = document.getElementById("contenido");
        if (contenido) contenido.style.display = "block";
        // $scope.$apply();
    }

    // #endregion NAVEGACION

    // #region USER

    $scope.updateUserInfo = () => {
        let profile = {
            "direccion": document.getElementById("inputAddress").value,
            "estado": document.getElementById("inputLocation").value,
            "zipCode": document.getElementById("inputZip").value,
            "bankAccount": document.getElementById("inputCBancaria").value
        };
        updateUserInfo(convertDotToDash($scope.authUser.email), profile);
        swal({
            title: "Perfil de usuario",
            text: "Sus datos personales han sido actualiados",
            icon: "warning",
            button: true,
            dangerMode: true,
        });

    }

    // REQ-019: un solo observador y sin revertir una sesion ya establecida.
    // REQ-035: pero si el usuario PIDE salir, el evento nulo se respeta.
    let observandoSesion = false;
    let huboSesionEnEstaCarga = false;
    let cierreDeSesionPedido = false;

    const reglasLogin = () => (typeof DTALogic !== "undefined" && DTALogic.login) ? DTALogic.login : null;

    listenUserStatus = () => {
        if (observandoSesion) return;
        observandoSesion = true;
        console.log("[auth] registrando observador de sesion");
        __auth().observar(sesion => {
            if (sesion.autenticado) {
                huboSesionEnEstaCarga = true;
                cierreDeSesionPedido = false;
                console.log("[sesion] autenticado:", sesion.usuario && sesion.usuario.email);
                // REQ-035 C-5: el callback de Firebase esta fuera del ciclo de Angular.
                $scope.$evalAsync(() => {
                    $scope.fotoUsuarioFallo = false;
                    $scope.authUser = sesion.usuario;
                    authUser = $scope.authUser;
                    getUserData();
                    $scope.showWindow('listado');
                });
                return;
            }

            // Un evento nulo despues de una sesion valida es transitorio (el popup se esta
            // cerrando o expiro una peticion anterior): NO debe devolver al login ni borrar nada.
            // REQ-035 C-4: salvo que el usuario haya pedido salir.
            const ignorar = reglasLogin()
                ? reglasLogin().debeIgnorarSesionNula({ huboSesion: huboSesionEnEstaCarga, cierrePedido: cierreDeSesionPedido })
                : (huboSesionEnEstaCarga && !cierreDeSesionPedido);
            if (ignorar) {
                console.warn("[auth] evento nulo ignorado: la sesion ya estaba establecida");
                return;
            }

            console.log("[auth] sin sesion: se muestra el login");
            huboSesionEnEstaCarga = false;
            cierreDeSesionPedido = false;
            removeFirebaseListeners();
            $scope.$evalAsync(() => {
                $scope.authUser = null;
                authUser = null;
                $scope.tipoUsuario = 0;
                $scope.showWindow('login');
            });
        });
    };

    getUserData = () => {
        // loadUserData($scope.authUser.email).then(result => {
        loadUserLocations($scope.authUser.email).then(result => {
            $scope.userLocations = result;
            if (typeof syncFirebaseMessagingIfAuthorized === "function") {
                syncFirebaseMessagingIfAuthorized($scope.authUser.email);
            }
            if (result[convertDotToDash($scope.authUser.email)]) {
                $scope.userProfile = result[convertDotToDash($scope.authUser.email)].profile;
                loadSystems();
            }
            $scope.showWindow('listado');
            $scope.$apply();
        }).catch(error => {
            // REQ-017: sin esto, un fallo de permisos dejaba la app colgada en el login.
            console.error("[login] no se pudieron leer los datos del usuario:", error);
            $scope.userLocations = {};
            $scope.showWindow('listado');
            try { $scope.$apply(); } catch (ignorado) { /* ya en digest */ }
            if (typeof swal === "function") {
                swal({
                    title: "No se pudieron cargar tus datos",
                    text: (error && error.message) || String(error),
                    icon: "warning"
                });
            }
        });
    }

    $scope.login = () => {
        // if (!ui) {
        //     initializeFirebaseUI();
        // }
        $scope.showWindow("login");
    }

    /**
     * REQ-035: UNA sola salida. Cierra la sesion de Firebase, cancela los listeners de RTDB,
     * limpia la sesion local (conserva preferencias del dispositivo) y muestra el login.
     * Todos los botones "Salir" llaman a esta funcion.
     */
    $scope.salir = () => {
        cierreDeSesionPedido = true;
        console.log("[auth] cierre de sesion pedido por el usuario");
        try { removeFirebaseListeners(); } catch (error) { console.warn("[auth] listeners:", error); }
        limpiarSesionLocal();
        return __auth().cerrarSesion().then(() => {
            $scope.$evalAsync(() => {
                $scope.authUser = null;
                authUser = null;
                $scope.tipoUsuario = 0;
                $scope.showWindow('login');
            });
        }).catch(error => {
            cierreDeSesionPedido = false;
            console.error("[auth] no se pudo cerrar la sesion:", error);
            if (typeof swal === "function") {
                swal({ title: "No se pudo cerrar la sesión", text: (error && error.message) || String(error), icon: "warning" });
            }
        });
    };

    // Compatibilidad: el nombre antiguo apunta a la salida unica.
    $scope.logout = () => $scope.salir();

    $scope.isSystemOfRole = (role) => {
        let userRole = "";
        if ($scope.actualSystem && $scope.userLocations && $scope.authUser && $scope.userLocations[convertDotToDash($scope.authUser.email)] && $scope.userLocations[convertDotToDash($scope.authUser.email)].systems) {
            userRole = $scope.userLocations[convertDotToDash($scope.authUser.email)].systems[$scope.actualSystem.key];
        }
        let result = (userRole == role) ? true : false;
        return result;
    }

    // #endregion USER

    /**
     * REQ-019: limpia solo lo de la sesion, conservando las preferencias del dispositivo.
     * Antes se hacia localStorage.clear(), que borraba tambien notificaciones y sonido.
     */
    const limpiarSesionLocal = () => {
        const preferencias = {};
        ["notificacionesHabilitadas", "sonidoHabilitado"].forEach(clave => {
            preferencias[clave] = localStorage.getItem(clave);
        });
        localStorage.clear();
        Object.keys(preferencias).forEach(clave => {
            if (preferencias[clave] !== null) localStorage.setItem(clave, preferencias[clave]);
        });
    };

    // #region DEVICES

    const removeFirebaseListeners = () => {
        // REQ-013: las suscripciones de equipos las posee el servicio; aqui solo se delega.
        __equipos().detenerTodo();
    };

    const listenLatestSystemLog = (locationKey, logDirectory) => {
        // REQ-013: el servicio no re-suscribe si la ruta no cambio.
        __equipos().escucharUltimoLog(locationKey, logDirectory, logs => {
            if (!logs.val() || !$scope.systems[locationKey]) return;
            processSystemLogSnapshot(locationKey, logs, false);
        }, error => {
            console.error(`Error al escuchar los datos de ${locationKey}:`, error);
        });
    };

    loadSystems = () => {
        if (!$scope.authUser) return;
        const usuario = $scope.userLocations[convertDotToDash($scope.authUser.email)];
        const userSystems = usuario && usuario.systems;
        if (!userSystems) { $scope.systems = []; return; }

        // REQ-013: el servicio sostiene las suscripciones; aqui se hace el trabajo de vista.
        __equipos().cargar(Object.keys(userSystems), {
            alCambiarSistema: (sistema, locationKey) => {
                $scope.systems[locationKey] = sistema;
                loadSystemUsers(locationKey);
                getMetorologicalData(locationKey);
                const dir = __modulo("equipos").carpetaDeLogs(sistema.type);
                $scope.loadSystemLog(locationKey, 1, `/${dir}`);
                listenLatestSystemLog(locationKey, dir);
                if ($scope.actualSystem && locationKey === $scope.actualSystem.key) {
                    $scope.selectSystem(sistema);
                }
                $scope.$evalAsync();
            },
            alError: (locationKey, error) => {
                console.error(`Error al escuchar los datos de ${locationKey}:`, error);
            },
        });
        $scope.$apply();
    }

    loadSystemUsers = (locationKey) => {
        __equipos().escucharUsuarios(locationKey, users => {
            if (users.val()) {
                $scope.users[locationKey] = users.val();
            }
        });
    }

    $scope.loadSystemLog = (locationKey, registers, set = "/logs", requestId = null, updateCurrentLog = true, dateRange = null) => {
        requestId = requestId === null ? ++logRequestSequence : requestId;
        latestLogRequestBySystem[locationKey] = requestId;
        const consulta = dateRange
            ? __repo().leerLogsPorRango(locationKey, set, dateRange.start, dateRange.end)
            : __repo().leerLogs(locationKey, set, registers);
        return consulta.then(logs => {
            // Una respuesta de un periodo anterior no debe reemplazar la ultima
            // seleccion del usuario si hizo clic de nuevo antes de que terminara.
            if (requestId !== latestLogRequestBySystem[locationKey]) return;
            if (logs.val()) {
                $scope.logs[locationKey] = logs.val();
                $scope.logsArray = {};
                $scope.logsArray = Object.values($scope.logs);
                // Las consultas históricas alimentan las gráficas, pero no deben
                // sustituir el registro en vivo ni reconstruir un popup abierto.
                if (updateCurrentLog) {
                    processSystemLogSnapshot(locationKey, logs, true);
                }
                invertLog();
            }
        });
    }

    const processSystemLogSnapshot = (locationKey, logs, updateHistory) => {
        const system = $scope.systems[locationKey];
        const logValues = Object.values(logs.val() || {});
        if (!system || !logValues.length) return;

        const log = logValues[logValues.length - 1];
        let position = parseInt(log.position || 0);
        position -= parseInt(system.magneticDesv || "0");
        position -= parseInt(system.posManualAdj || "0");
        log.position = position;
        log.statusTime = calcStatusTime(log.date, log.update);
        system.log = log;

        processingSensors(locationKey);
        if (map && marker[locationKey]) {
            refreshSensorMapContent(system);
        }
        findCommErrors();
        const positionElement = document.getElementById('pos_' + locationKey);
        if (positionElement) {
            positionElement.style.transform = 'rotate(' + position + 'deg)';
        }
        updateCompass(system);
        hideSpinner(locationKey, log.state);
        processingAlerts(locationKey);
        updateNeveraDataRaw(locationKey);
        if (updateHistory) setDeviceSpecificData();
        $scope.$evalAsync();
    };

    const updateNeveraDataRaw = locationKey => {
        const system = $scope.systems[locationKey];
        if (system?.type !== "Nevera" || $scope.actualSystem?.key !== locationKey || !system.log?.dataRaw) return;

        try {
            $scope.actualSystemDataRaw = JSON.parse(system.log.dataRaw);
        } catch (error) {
            console.error(`dataRaw inválido en la nevera ${locationKey}:`, error);
        }
    };

    processingAlerts = (locationKey) => {
        const sistema = $scope.systems[locationKey];
        if (!sistema || !sistema.log) return;

        // REQ-013: el servicio decide y deduplica; aqui solo se muestran los efectos.
        const evaluacion = __equipos().evaluarAlertas(sistema, sistema.log.date);
        evaluacion.alarmas.forEach(alarma => {
            const mensaje = __modulo("equipos").mensajeDeAlarma(alarma, sistema.name);
            M.toast({ html: mensaje });
            console.log(mensaje);
        });
        if (evaluacion.sonar) activarAlarma();
    }

    processingSensors = (locationKey) => {
        // if ($scope.systems[locationKey].type == "Sensor") {
        //     let log = $scope.systems[locationKey].log;
        //     log.dataRaw = normalize(JSON.parse(log.dataRaw), locationKey);
        //     log.voltages = JSON.parse(log.voltages);
        // }
    }

    normalize = (arr, key) => {
        for (idx = 0; idx < arr.length; idx++) {
            val = arr[idx];
            if (val != -99) {
                let index = "S" + idx;
                let system = $scope.systems[key];
                let min = parseFloat(system.sensors[index].minValue);
                let max = parseFloat(system.sensors[index].maxValue);
                let result = ((val - min) / (max - min)) * 100;
                arr[idx] = 100 - (result > 100 ? 100 : result);
            }
        }
        return arr;
    }

    showAlert = (locationKey, log) => {
        let name = $scope.systems[locationKey].name;
        if ((log.safety == "false" || log.voltage == "false") && $scope.systems[locationKey].status == "ON") {
            let alarms = localStorage.getItem("alarms");
            if (!alarms || !alarms[name] || (alarms && alarms[name] && alarms[name] != log.date)) {
                localStorage.setItem(name, log.date);
                let txt = log.voltage == "false" ? "electricidad" : "seguridad";
                let htmlMsg = '<b>' + name + ': Falla de ' + txt + '!</b>';
                M.toast({ html: htmlMsg });
                let alertSound = document.getElementById("alertSound");
                alertSound.play();
                setTimeout(function () {
                    alertSound.pause();
                }, 5000);
            }
        }
    }

    findCommErrors = () => {
        // REQ-013: la regla vive en logic/equipos.js; aqui solo se aplica a la vista.
        __equipos().marcarRetrasos(undefined, $scope.systems).forEach(resultado => {
            const sistema = $scope.systems[resultado.clave];
            if (sistema && sistema.log) sistema.log.commDelay = resultado.etiqueta;
        });
    }

    calcStatusTime = (date, update) => {
        // Extraido a assets/js/logic/estado.js (REQ-004). Delegacion 1:1.
        return __modulo("estado").calcStatusTime(date, update);
    }

    getTimeDiference = (date, update = null) => {
        // Extraido a assets/js/logic/estado.js (REQ-004). Delegacion 1:1.
        return __modulo("estado").getTimeDiference(date, update);
    }

    sendAlertSMS = (celular, name, cmd) => {
        let msg = `DTA-Agrícola: Alerta ${name} ${cmd}!!!`;
        sendSMS_XMLHttp(celular, msg);
    }

    $scope.setProgramacionRiego = (ciclic, schedule) => {
        $scope.actualSystem.autoreverse = ciclic;
        $scope.actualSystem.isScheduled = schedule;
        $scope.setMachineSettings();
    }

    $scope.showSelectdSystem = (systemKey) => {
        showSpinner();
        $scope.selectSystem($scope.systems[systemKey]);
    }

    $scope.selectSystem = (system) => {
        document.getElementById("top-navbar").style.backgroundColor = $scope.getSystemBackgroundColor(system);
        document.getElementById("top-navbar").style.color = $scope.getSystemTextColor(system);
        setDeviceData(system);
        setActualSystemPlans();
        $scope.actualizarListaCultivos();
        let dir = "/" + __modulo("equipos").carpetaDeLogs(system.type);
        let items = __modulo("equipos").registrosIniciales(system.type, $scope.limitRegisters);
        if (system.type == "Nevera") {
            $scope.setChartType('humidity');
            $scope.selectedTimeOption = 'DIA';
            $scope.limitRegisters = 300;
            $scope.chartItems = 300;
            items = 300;
        }
        $scope.loadSystemLog(system.key, items, dir);
        // invertLog();
        // $scope.actualSystem.posicionActual = parseInt($scope.actualSystem.log.position ? $scope.actualSystem.log.position : "0") + parseInt($scope.actualSystem.summerHour ? $scope.actualSystem.summerHour : "0");
        // showPlanRiegoPie();
        hideTheSpinner();
        $scope.showWindow('sistema');
        updateCompass();
        initializeSystemMap($scope.actualSystem);
        getMetorologicalData($scope.actualSystem.key);
        setDeviceSpecificData();
        $scope.getSensorNetworks();
    }

    $scope.selectedTimeOption = 'SEMANA'; // "DIA", "SEMANA" (por defecto), "MES", "CICLO" (último ciclo de riego), "AÑO" (último año)

    $scope.reloadSystemLog = (systemKey, option = 'DIA', chartId = null, chartLabel = null) => {
        $scope.selectedTimeOption = option;
        $scope.limitRegisters = option == 'DIA' ? 300 : option == 'SEMANA' ? 7 : option == 'MES' ? 30 : option == 'CICLO' ? 180 : 365;
        $scope.chartItems = $scope.limitRegisters;
        const requestId = ++logRequestSequence;
        historyRequestId = requestId;
        // Las neveras conservan sus lecturas intradía en /logs; /dayLogs se
        // utiliza para el detalle diario de las redes de sensores.
        // REQ-013: la regla del historico vive en logic/equipos.js.
        const source = "/" + __modulo("equipos").carpetaDeHistorico($scope.actualSystem?.type, option);
        let dateRange = null;
        if ($scope.actualSystem?.type === "Nevera") {
            const now = new Date();
            const formatDate = date => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
            const start = new Date(now);
            if (option === "DIA") start.setHours(0, 0, 0, 0);
            if (option === "MES") start.setDate(1);
            if (option === "CICLO") start.setMonth(start.getMonth() - 6);
            dateRange = { start: formatDate(start), end: formatDate(now) };
        }
        $scope.historyLoadingOption = option;

        return $scope.loadSystemLog(systemKey, $scope.limitRegisters, source, requestId, false, dateRange)
            .then(() => {
                if (requestId === historyRequestId &&
                    requestId === latestLogRequestBySystem[systemKey] &&
                    chartId !== null) {
                    // Esperar a que Angular refleje los nuevos registros antes de
                    // reemplazar la instancia visible de Chart.js.
                    $timeout(() => $scope.setChart(chartId, chartLabel || ('myChartH' + chartId)));
                }
            })
            .catch(error => console.error('Error al cargar el historial:', error))
            .finally(() => {
                if (requestId === historyRequestId) {
                    $scope.$evalAsync(() => {
                        $scope.historyLoadingOption = null;
                    });
                }
            });
    }

    const renderColdRoomSensorChart = (attempt = 0) => {
        const canvas = document.getElementById("coldRoomSensorChart");
        if ((!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) && attempt < 10) {
            $timeout(() => renderColdRoomSensorChart(attempt + 1), 50);
            return;
        }
        if (canvas && $scope.coldRoomChartAvailable) {
            $scope.setChart($scope.coldRoomChartIndex, "coldRoomSensorChart");
        }
    };

    $scope.openColdRoomSensorChart = (sensor, sensorKey) => {
        if (!sensor) return;
        const keyMatch = /^S([0-9])$/.exec(String(sensorKey));
        const numericMatch = /^([0-9])$/.exec(String(sensorKey));
        let index = keyMatch ? Number(keyMatch[1]) : numericMatch ? Number(numericMatch[1]) : -1;
        if ($scope.actualSystem?.sensors?.[`S${index}`] !== sensor) {
            index = Array.from({ length: 10 }, (_, i) => i)
                .find(i => $scope.actualSystem?.sensors?.[`S${i}`] === sensor);
        }
        if (!Number.isInteger(index) || index < 0 || index > 9) return;

        $scope.coldRoomChartSensor = sensor;
        $scope.coldRoomChartIndex = index;
        const isSensorNetwork = $scope.actualSystem?.type === "Sensor";
        $scope.coldRoomChartAvailable = isSensorNetwork
            ? ["Ms", "SHT4", "WM"].includes(sensor.type)
            : (!sensor.type || sensor.type === "SHT2");
        $scope.setChartType(isSensorNetwork ? "moisture" : "temperature");

        const modalElement = document.getElementById("modalColdRoomSensorChart");
        if (modalElement && window.M && M.Modal) {
            const modal = M.Modal.getInstance(modalElement) || M.Modal.init(modalElement);
            modal.open();
        }

        if ($scope.coldRoomChartAvailable) {
            $timeout(() => {
                $scope.reloadSystemLog(
                    $scope.actualSystem.key,
                    isSensorNetwork ? "CICLO" : "DIA",
                    index,
                    "coldRoomSensorChart"
                );
            }, 300);
        }
    };

    $scope.setColdRoomChartType = chartType => {
        if ($scope.coldRoomChartIndex === null || $scope.coldRoomChartIndex === undefined) return;
        $scope.setChartType(chartType);
        $timeout(() => $scope.setChart($scope.coldRoomChartIndex, "coldRoomSensorChart"));
    };

    $scope.reloadColdRoomSensorChart = option => {
        if ($scope.coldRoomChartIndex === null || $scope.coldRoomChartIndex === undefined) return;
        return $scope.reloadSystemLog(
            $scope.actualSystem.key,
            option,
            $scope.coldRoomChartIndex,
            "coldRoomSensorChart"
        );
    };

    setDeviceData = system => {
        system.caudal = parseInt(system.caudal);
        system.delayTime = parseInt(system.delayTime);
        system.latitude = parseFloat(system.latitude);
        system.longitude = parseFloat(system.longitude);
        system.length = parseInt(system.length);
        system.plansLength = parseInt(system.plansLength);
        system.velocity = parseInt(system.velocity);
        system.zona = parseInt(system.zona);
        system.sensorPresion = parseInt(system.sensorPresion);
        $scope.actualSystem = system;
        $scope.actualSystem.status = $scope.actualSystem.status == "ON" || $scope.actualSystem.status == true ? true : false;
        $scope.actualSystem.sensorSecurity = $scope.actualSystem.sensorSecurity == "ON" || $scope.actualSystem.sensorSecurity == true ? true : false;
        $scope.actualSystem.sensorVoltage = $scope.actualSystem.sensorVoltage == "ON" || $scope.actualSystem.sensorVoltage == true ? true : false;
        $scope.actualSystem.sensorPosition = $scope.actualSystem.sensorPosition == "ON" || $scope.actualSystem.sensorPosition == true ? true : false;
        $scope.actualSystem.autoreverse = $scope.actualSystem.autoreverse == "ON" || $scope.actualSystem.autoreverse == true ? true : false;
        $scope.actualSystem.direction = $scope.actualSystem.direction == "FF" || $scope.actualSystem.direction == true ? true : false;
    }

    const setDeviceSpecificData = () => {
        switch ($scope.actualSystem.type) {
            case "Sensor":
                // $scope.chartItems = 24;
                // showChart();
                break;
            case "PC":
                $scope.showSystemTable($scope.actualSystem.brand);
                break;
            case "PL":
                $scope.showSystemTable($scope.actualSystem.brand);
                break;
        }
    }

    setActualSystemPlans = () => {
        $scope.actualSystemPlans = [];
        let length = parseInt($scope.actualSystem.plansLength);
        for (let i = 0; i < length; i++) {
            let idx = "p" + i;
            $scope.actualSystemPlans.push($scope.actualSystem.plans[idx]);
        }
    }

    invertLog = () => {
        $scope.invertedRegisters = [];
        if ($scope.actualSystem && $scope.logs[$scope.actualSystem.key]) {
            registers = $scope.logs[$scope.actualSystem.key];
            registersArr = Object.values(registers);
            $scope.invertedRegisters = registersArr.reverse();
        }
    }

    const updateCompass = (system = $scope.actualSystem) => {
        if (!system || system.type !== "PC" || !system.log) return;

        const listCompass = document.getElementById('pos_' + system.key);
        if (listCompass) {
            listCompass.style.transform = `rotate(${system.log.position || 0}deg)`;
        }

        // La vista del mapa solo representa el sistema seleccionado. Al recibir
        // un log nuevo, reconstruir su brazo con las coordenadas más recientes.
        if (map && $scope.actualSystem?.key === system.key) {
            showPCPosition(system);
        }
    };

    // REQ-032: cache por ubicacion. Varios sistemas de la misma finca comparten coordenadas,
    // asi que pedir el tiempo por sistema repetia peticiones identicas a OpenWeather.
    const cacheMeteo = (typeof DTALogic !== "undefined" && DTALogic.meteo)
        ? DTALogic.meteo.crearCache()
        : null;

    getMetorologicalData = (key) => {
        const sistema = $scope.systems[key];
        if (!sistema || !sistema.latitude || !sistema.longitude) return;

        $scope.meteo[key] = $scope.meteo[key] || {};

        const pedir = () => new Promise((resolver, rechazar) => {
            $.ajax({
                url: `https://api.openweathermap.org/data/2.5/weather?lat=${sistema.latitude}&lon=${sistema.longitude}&appid=${OPENWEATHER_API_KEY}`,
                success: resolver,
                error: (xhr, estado, error) => rechazar(new Error(error || estado || "sin respuesta")),
            });
        });

        const clave = cacheMeteo
            ? DTALogic.meteo.claveDeCache(sistema.latitude, sistema.longitude)
            : null;

        const consulta = (cacheMeteo && clave) ? cacheMeteo.obtener(clave, pedir) : pedir();

        consulta.then((resultado) => {
            $scope.meteo[key] = resultado;

            if (resultado && resultado.weather && resultado.weather["0"]) {
                resultado.weather.iconUrl = `${OPENWEATHER_ICON_URL}/${resultado.weather["0"].icon}.png`;
            }

            $scope.$applyAsync();
        }).catch((error) => {
            console.warn(`[meteo] no se pudo cargar el tiempo de ${key}:`, error && error.message);
        });
    };

    $scope.stopSystem = () => {
        if ($scope.actualSystem.status) {
            swal({
                title: "Control de riego",
                text: "¿Desea detener el riego?",
                icon: "warning",
                // buttons: true,
                buttons: {
                    cancel: "Cancelar",
                    confirm: {
                      text: "Detener",
                      value: true,
                      visible: true,
                      className: "btn-confirmar",
                      closeModal: true
                    }
                },
                dangerMode: true,
            })
                .then((confirm) => {
                    if (confirm) {
                        $scope.actualSystem.status = false;
                        stopStationarySystem();
                        $scope.setMachineState();
                        hideHourglass();
                        $scope.setMachineSettings($scope.actualSystem);
                        swal("Orden confirmada!", {
                            icon: "success",
                        });
                    } else {
                        swal("No se inició el riego!");
                    }
                });
        }
    }

    stopStationarySystem = () => {
        if ($scope.actualSystem.plots) {
            for (plot in $scope.actualSystem.plots) {
                $scope.actualSystem.plots[plot].irrigationPlan = 0;
                $scope.actualSystem.plots[plot].forcedStart = -1;
            }
        }
    }

    $scope.setActualSystemStatus = () => {
        swal({
            title: "Control del pozo",
            text: "¿Desea " + ($scope.actualSystem.status ? "iniciar" : "detener") + " el pozo?",
            icon: "warning",
            // buttons: true,
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: $scope.actualSystem.status ? "Iniciar" : "Detener",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            }
        })
            .then((confirm) => {
                if (confirm) {
                    if (!$scope.actualSystem.status) {
                        for (let i = 0; i < $scope.actualSystem.length; i++) {
                            let idx = "p" + i;
                            $scope.actualSystem.plots[idx].forcedStart = -1;
                        }
                    }
                    $scope.setMachineState();
                    $scope.setMachineSettings($scope.actualSystem);
                    swal("El pozo se ha " + ($scope.actualSystem.status ? "iniciado" : "detenido") + " correctamente!", {
                        icon: "success",
                    });
                } else {
                    $scope.actualSystem.status = !$scope.actualSystem.status;
                    $scope.$apply();
                    swal("No se cambió el estado del pozo!");
                }
            });
}

    $scope.playForward = () => {
        if (!$scope.actualSystem.direction || !$scope.actualSystem.status) {
            swal({
                title: "Control de riego",
                text: "¿Desea iniciar el riego?",
                icon: "warning",
                // buttons: true,
                buttons: {
                    cancel: "Cancelar",
                    confirm: {
                      text: "Iniciar",
                      value: true,
                      visible: true,
                      className: "btn-confirmar",
                      closeModal: true
                    }
                }
            })
                .then((confirm) => {
                    if (confirm) {
                        $scope.actualSystem.position = $scope.actualSystem.type == "Estacionario" && !$scope.actualSystem.autoreverse && !$scope.actualSystem.isScheduled ? -1 : $scope.actualSystem.position ? $scope.actualSystem.position : 0;
                        $scope.actualSystem.status = true;
                        $scope.actualSystem.direction = true;
                        $scope.setMachineState();
                        $scope.setMachineSettings($scope.actualSystem);
                        swal("El riego ha iniciado correctamente!", {
                            icon: "success",
                        });
                    } else {
                        swal("No se inició el riego!");
                    }
                });
        }
    }

    $scope.playBackward = () => {
        if ($scope.actualSystem.direction || !$scope.actualSystem.status) {
            swal({
                title: "Control de riego",
                text: "¿Desea iniciar el riego?",
                icon: "warning",
                // buttons: true,
                buttons: {
                    cancel: "Cancelar",
                    confirm: {
                      text: "Iniciar",
                      value: true,
                      visible: true,
                      className: "btn-confirmar",
                      closeModal: true
                    }
                }
            })
                .then((confirm) => {
                    if (confirm) {
                        $scope.actualSystem.status = true;
                        $scope.actualSystem.direction = false;
                        $scope.setMachineState();
                        $scope.setMachineSettings($scope.actualSystem);
                        swal("El riego ha iniciado correctamente!", {
                            icon: "success",
                        });
                    } else {
                        swal("No se inició el riego!");
                    }
                });
        }
    }

    $scope.stopStationaryProgram = () => {
        swal({
            title: "Programa de riego",
            text: "¿Desea detener la programación del riego?",
            icon: "warning",
            // buttons: true,
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Confirmar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        }).then((confirm) => {
                if (confirm) {
                    stopStationaryProgram();
                    $scope.setMachineSettings($scope.actualSystem);
                    // REQ-009b: el mensaje se calcula en la logica de riego, la vista solo lo pinta.
                    const mensaje = __modulo("riego").mensajeDeResultado(programa);
                    if (mensaje.detalle) {
                        swal(mensaje.titulo, mensaje.detalle, { icon: mensaje.icono });
                    } else {
                        swal(mensaje.titulo, { icon: mensaje.icono });
                    }
                } else {
                    swal("No se detuvo el programa!");
                }
            });
    }

    stopStationaryProgram = () => {
        for (let i = 0; i < 7; i++) {
            $scope.actualSystem.plots[`p${i}`].forcedStart = -1;
            $scope.actualSystem.plots[`p${i}`].irrigationPlan = 0;
            $scope.actualSystem.plots[`p${i}`].schedule = [];
        }
        let a = 0;
    }

    $scope.startStationaryProgram = (p) => {
        // let p = $scope.programaEstacionario;
        if ($scope.actualSystem.type != "Estacionario" || !p.nombre || !p.fecha_inicio || !p.hora_inicio || !p.fecha_fin  || (!p.t[0] && !p.t[1] && !p.t[2] && !p.t[3] && !p.t[4] && !p.t[5] && !p.t[6])) {
            swal("Por favor, completa los datos marcados con *");
            return;
        }
        swal({
            title: "Programa de riego",
            text: "¿Desea iniciar con la programación del riego? Esta acción eliminará la programación anterior",
            icon: "warning",
            // buttons: true,
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Confirmar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        }).then((confirm) => {
                if (confirm) {
                    stopStationaryProgram();
                    $scope.setMachineSettings($scope.actualSystem);
                    const programa = createStationaryProgram(p);
                    if (!p.id) p.id = programa.id;
                    $scope.saveIrrigationPlan(p);
                    $scope.setMachineSettings($scope.actualSystem);
                    swal("Programa de riego iniciado correctamente!", {
                        icon: "success",
                    });
                } else {
                    swal("No se inicializó el programa!");
                }
            });
    }

    $scope.newStationaryProgram = () => {
        $scope.programaEstacionario  = {
            nombre: '',
            fecha_inicio: '',
            fecha_fin: '',
            hora_inicio: '',
            cada: 1,
            periodo: "0",   // REQ-050: texto, como las opciones (con 0 numerico el selector salia vacio)
            t: [0, 0, 0, 0, 0, 0, 0]
        };
        $scope.erroresPrograma = {};
        $scope.confirmarBorradoPrograma = false;
    }

    $scope.editStationaryProgram = (programa) => {
        $scope.programaEstacionario = __modulo("riego").normalizarPrograma(programa);
        $scope.erroresPrograma = {};
        $scope.confirmarBorradoPrograma = false;
    }

    $scope.saveIrrigationPlan = (p) => {
        if (!$scope.actualSystem.irrigationPlan) $scope.actualSystem.irrigationPlan = {};
        $scope.actualSystem.irrigationPlan[p.id] = p;
        $scope.setMachineSettings($scope.actualSystem);
    }

    $scope.deleteStationaryProgram = (programa) => {
        let p = programa;
        delete $scope.actualSystem.irrigationPlan[p.id];
        $scope.setMachineSettings($scope.actualSystem);
    }

    createStationaryProgram = (p) => {
        // Logica extraida a assets/js/logic/riego.js (REQ-006). Aqui solo se aplica a $scope.
        const resultado = __modulo("riego").programar(p, { generarId: generarIdUnico });
        if (resultado.aviso) console.warn("[riego] " + resultado.aviso);
        resultado.entradas.forEach((entrada) => {
            const parcela = $scope.actualSystem.plots["p" + entrada.parcela];
            if (!parcela.schedule) parcela.schedule = [];
            parcela.schedule.push({
                id: entrada.id, nombre: entrada.nombre, date: entrada.date,
                t: entrada.t, time: entrada.time, value: entrada.value
            });
            parcela.forcedStart = 1;
            parcela.irrigationPlan = 1;
        });
        return { id: resultado.id, aviso: resultado.aviso };
    }

    generarIdUnico = () => {
        // Extraido a assets/js/logic/ids.js (REQ-004). Delegacion 1:1.
        return __modulo("ids").generarIdUnico();
    }

    function generarSecuenciaParcelas(fecha_inicio, hora_inicio, tiempos) {
        // Extraido a assets/js/logic/secuencias.js (REQ-001..003). Delegacion 1:1.
        return __modulo("secuencias").generarSecuenciaParcelas(fecha_inicio, hora_inicio, tiempos);
    }

    function parseFechaHora2(fechaStr) {
        // Extraido a assets/js/logic/fechas.js (REQ-001..003). Delegacion 1:1.
        return __modulo("fechas").parseFechaHora2(fechaStr);
    }

    function parseFechaHora(fechaStr, horaStr) {
        // Extraido a assets/js/logic/fechas.js (REQ-001..003). Delegacion 1:1.
        return __modulo("fechas").parseFechaHora(fechaStr, horaStr);
    }

    function menorIgual(f1, f2) {
        // Extraido a assets/js/logic/fechas.js (REQ-001..003). Delegacion 1:1.
        return __modulo("fechas").menorIgual(f1, f2);
    }

    $scope.getLogDataRaw = () => {
        return JSON.parse($scope.actualSystem.log.dataRaw);
    }

    $scope.voltageToPercent = (V) => {
        const Vmin = 2.8, Vmax = 3.3;
        return (Math.max(0, Math.min(100, ((V - Vmin) / (Vmax - Vmin)) * 100))).toFixed(0);
    }

    let sensorPanelRawSource = null;
    let sensorPanelRawData = [];

    const getSensorPanelRawData = () => {
        const source = $scope.actualSystem?.log?.dataRaw;
        if (source === sensorPanelRawSource) return sensorPanelRawData;

        sensorPanelRawSource = source;
        try {
            sensorPanelRawData = source ? JSON.parse(source) : [];
        } catch (error) {
            console.error("dataRaw inválido en el panel de sensores:", error);
            sensorPanelRawData = [];
        }
        return sensorPanelRawData;
    };

    const getValidSensorNumber = value => {
        const number = Number(value);
        return value !== null && value !== "" &&
            String(value).toUpperCase() !== "NAN" &&
            Number.isFinite(number) && number !== -99
            ? number
            : null;
    };

    $scope.getSensorPanelValue = (sensorKey, metric, sensor) => {
        const match = /^S(\d+)$/.exec(String(sensorKey));
        if (!match) {
            if (metric === "batteryIcon") return "battery-unknown";
            return metric === "tileColor" ? "#0000003d" : "--";
        }

        const baseIndex = Number(match[1]) * 8;
        const data = getSensorPanelRawData();
        const offsets = { soilMoisture: 0, soilStatus: 0, tileColor: 0, humidity: 1, temperature: 4, battery: 7 };
        const value = getValidSensorNumber(data[baseIndex + offsets[metric]]);

        if (metric === "batteryIcon") {
            const voltage = getValidSensorNumber(data[baseIndex + offsets.battery]);
            if (voltage === null) return "battery-unknown";
            const percent = Number($scope.voltageToPercent(voltage));
            return percent > 75 ? "battery-full" :
                percent > 50 ? "battery-three-quarters" :
                percent > 25 ? "battery-half" : "battery-empty";
        }
        if (value === null) return metric === "tileColor" ? "#0000003d" : "--";

        switch (metric) {
            case "tileColor": {
                const min = getValidSensorNumber(sensor?.h?.minValue) ?? 25;
                const max = getValidSensorNumber(sensor?.h?.maxValue) ?? 60;
                const color = sensor?.type === "WM"
                    ? (value <= 10 ? "#0000ff" : value <= 60 ? "#00ff00" : "#ff0000")
                    : (value <= min ? "#ff0000" : value >= max ? "#0000ff" : "#00ff00");
                return `${color}3d`;
            }
            case "soilStatus": {
                const min = getValidSensorNumber(sensor?.h?.minValue) ?? 25;
                const max = getValidSensorNumber(sensor?.h?.maxValue) ?? 60;
                return sensor?.type === "WM"
                    ? (value <= 10 ? "Saturado" : value <= 60 ? "Adecuado" : "Seco")
                    : (value <= min ? "Seco" : value >= max ? "Saturado" : "Adecuado");
            }
            case "soilMoisture":
                return `${value.toFixed(0)}${sensor?.type === "WM" ? "cb" : "%"}`;
            case "humidity":
                return `${value.toFixed(0)}%Hr`;
            case "temperature":
                return $scope.actualSystem?.tempUnit === "C"
                    ? `${value.toFixed(0)}°C`
                    : `${(value * 9 / 5 + 32).toFixed(0)}°F`;
            case "battery":
                return `${$scope.voltageToPercent(value)}%`;
            default:
                return "--";
        }
    };

    $scope.signalToPercent = (si) => {
        const Simin = 6, Simax = 31;
        return (Math.max(0, Math.min(100, ((si - Simin) / (Simax - Simin)) * 100))).toFixed(0);
    }

    $scope.setMachineState = () => {                                       // New *******************
            $scope.setMachineSettings($scope.actualSystem);
            sendCommand[$scope.actualSystem.key] = $scope.actualSystem.status ? "ON" : "OFF";
            if ($scope.actualSystem.type == "Estacionario" && !$scope.actualSystem.autoreverse && $scope.actualSystem.isScheduled) {
                $scope.actualSystem.status ? showHourglass($scope.actualSystem.key) : hideHourglass($scope.actualSystem.key);
            } else {
                showSpinner();
            }
    }

    $scope.setMachineConfig = () => {
        swal({
            title: "Ajustes",
            text: "¿Desea confirmar los cambios realizados?",
            icon: "warning",
            // buttons: true,
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Confirmar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
                    if ($scope.actualSystem.type == "Sensor") $scope.actualSystem.operationMode = $scope.actualSystem.sleepingTime;
                    $scope.setMachineSettings($scope.actualSystem);
                    swal("Sistema actualizado correctamente!", {
                        icon: "success",
                    });
                } else {
                    swal("No se realizó la actualización!");
                }
            });

    }

    const showSpinner = () => {
        document.getElementById("spinner").style.display = "flex";
    }

    const hideSpinner = (locationKey, status) => {
        if (sendCommand[locationKey] == status) {
            hideTheSpinner();
        }
    }

    const showHourglass = (key) => {
        if (document.getElementById("hourglass_" + key)) {
            document.getElementById("hourglass_" + key).style.display = "block";
        }
    }

    const hideHourglass = (key) => {
        if (document.getElementById("hourglass_" + key)) {
            document.getElementById("hourglass_" + key).style.display = "none";
        }
    }

    const hideTheSpinner = () => {
        const spiner = document.getElementById("spinner");
        if (spiner) spiner.style.display = "none";
    }

    $scope.setMachineSettings = (system = $scope.actualSystem) => {
        // Serializar una copia para no convertir temporalmente los booleanos que
        // utiliza la vista en los textos que espera Firebase (ON/OFF y FF/RR).
        const settings = angular.copy(system);
        settings.status = settings.status ? "ON" : "OFF";
        settings.sensorSecurity = settings.sensorSecurity ? "ON" : "OFF";
        settings.sensorVoltage = settings.sensorVoltage ? "ON" : "OFF";
        settings.sensorPosition = settings.sensorPosition ? "ON" : "OFF";
        settings.isScheduled = settings.autoreverse ? false : settings.isScheduled;
        settings.autoreverse = settings.autoreverse ? "ON" : "OFF";
        settings.direction = settings.direction ? "FF" : "RR";
        settings.operationMode = settings.operationMode ? settings.operationMode : "";
        settings.isScheduled = settings.isScheduled ? settings.isScheduled : "";
        settings.caudal = "" + (settings.caudal && !isNaN(settings.caudal) ? settings.caudal : "");
        settings.delayTime = "" + (settings.delayTime && !isNaN(settings.delayTime) ? settings.delayTime : "");
        settings.length = "" + (settings.length && !isNaN(settings.length) ? settings.length : "");
        settings.latitude = "" + (settings.latitude && !isNaN(settings.latitude) ? settings.latitude : "");
        settings.longitude = "" + (settings.longitude && !isNaN(settings.longitude) ? settings.longitude : "");
        settings.plansLength = "" + (settings.plansLength && !isNaN(settings.plansLength) ? settings.plansLength : "");
        settings.velocity = "" + (settings.velocity && !isNaN(settings.velocity) ? settings.velocity : "");
        settings.maxVelocity = "" + (settings.maxVelocity <= 100 ? settings.maxVelocity : 100);
        settings.sensorPresion = "" + (settings.sensorPresion && !isNaN(settings.sensorPresion) ? settings.sensorPresion : "");
        // system.irrigation = document.querySelector('input[name=groupRiego]:checked').getAttribute("data");
        if (settings.type == "Estacionario") { verifyPlots(settings); }
        const updatePromise = setMachineSettings(settings);
        // updateAudit($scope.authUser, system);
        $scope.$evalAsync();
        return updatePromise;
        //sendSMS_XMLHttp($scope.campoActual.cell, cmd);
        // sendSMS_XMLHttp("+526251208106", cmd);
    }

    const verifyPlots = (system) => {
        if (system.plots) {
            for (plot in system.plots) {
                for (pol in system.plots[plot].poligon) {
                    system.plots[plot].poligon[pol][0] = system.plots[plot].poligon[pol][0] ? "" + system.plots[plot].poligon[pol][0] : "";
                    system.plots[plot].poligon[pol][1] = system.plots[plot].poligon[pol][1] ? "" + system.plots[plot].poligon[pol][1] : "";
                }
            }
        }
    }

    $scope.setMyPossition = () => {
        // getLocation();
    }

    $scope.showMoreSettings = () => {
        $scope.showMore = true;
        document.getElementById("riegoSelector").click();
        document.getElementById("sistemaSelector").click();
    }

    $scope.actualSystemWindows = (win) => {
        $scope.as_config = win == "as_config" ? !$scope.as_config : false;
        $scope.as_adjust = win == "as_adjust" ? !$scope.as_adjust : false;
        $scope.as_more = win == "as_more" ? !$scope.as_more : false;
        $scope.as_hist = win == "as_hist" ? !$scope.as_hist : false;
        $scope.as_users = win == "as_users" ? !$scope.as_users : false;
        window.scrollTo(0, 1000);
    }

    $scope.convertStrToJSON = (str) => {
        // return str ? JSON.parse(str.replace(/""/g, '"","",""')) : null;
        if (!str.startsWith('["') && !str.endsWith('"]')) {
            str = str.slice(1, -1); // elimina una comilla de cada lado
        }
        return str ? JSON.parse(str) : null;
    }

    // #endregion DEVICES

    // #region CONFIGURACIONES

    // REQ-056: tabla de velocidades del pivote. Antes fallaba sin marca (type.toLowerCase sobre undefined)
    // y no avisaba si la lectura fallaba; "Nuevo plan" ni siquiera la cargaba.
    $scope.pivoteTabla = { estado: "vacia", marca: "", filas: [], valorActual: null };
    $scope.showSystemTable = (type, valorActual) => {
        const pivote = __modulo("pivote");
        const marca = pivote.marcaDeConfiguracion(type);
        $scope.pivoteTabla = {
            estado: marca ? "cargando" : "sin-marca",
            marca: marca ? marca.nombre : "",
            filas: [],
            valorActual: valorActual === undefined || valorActual === null || valorActual === "" ? null : Number(valorActual)
        };
        if (!marca) return;
        $scope.systemConfig = {};
        __repo().leerConfiguracion(marca.clave).then(config => {
            const datos = config && typeof config.val === "function" ? config.val() : null;
            $scope.$evalAsync(() => {
                $scope.systemConfig = datos;          // lo usa showSystemVelocity
                $scope.systemConfigType = marca.clave;
                $scope.pivoteTabla.filas = pivote.filasDeConfiguracion(datos);
                $scope.pivoteTabla.estado = $scope.pivoteTabla.filas.length ? "lista" : "vacia";
            });
        }).catch(error => {
            console.warn("[pivote] no se pudo leer la tabla de velocidades:", error);
            $scope.$evalAsync(() => { $scope.pivoteTabla.estado = "error"; });
        });
    }

    $scope.showSystemVelocity = (percent) => {
        let result = 0;
        let sc = $scope.systemConfig;
        for (let idx = 0; idx < sc.length; idx++) {
            if (sc[idx].timer == percent) {
                result = sc[idx].wather;
            }
        }
        return result;
    }

    $scope.createNewDevice = () => {
        getLocation();
        $scope.newDevice = {
            "active": true,
            "booleanStatus": false,
            "installation": new Date(),
            "irrigation": "0",
            "key": "",
            "latitude": milatitud,
            "longitude": milongitud,
            "name": "",
            "password": "",
            "status": "OFF",
            "summerHour": "0",
            "type": "",
            "zona": ((new Date()).getTimezoneOffset() / 60) * -1
        };
        $scope.showWindow('listado');
    }

    // REQ-052: los lectores de QR de equipo y sensor pasaron al componente <dta-lector-codigo>
    // (QR, codigos de barras y NFC).

    $scope.setNewDeviceParams = () => {
        switch ($scope.newDevice.type) {
            case "PC":
            case "PL":
                newPivot();
                break;
            case "Estacionario":
                newStationary();
                break;
            case "Pozo":
                newPump();
                break;
            case "Sensor":
                newSensor();
                break;
        }
    }

    newPivot = () => {
        Object.assign($scope.newDevice, {
            "autoreverse": "OFF",
            "brand": "",
            "caudal": "0",
            "direction": "FF",
            "fertilization": "OFF",
            "length": "",
            "plansLength": "1",
            "plans": {
                "p0": {
                    "endAngle": "360",
                    "starAngle": "0",
                    "type": "velocity",
                    "value": "0"
                }
            },
            "startDate": " ",
            "sensorPresion": "0",
            "velocity": "0"
        });
    }

    let newPlot = {
        "caudal": "0",
        "culture": " ",
        "forcedStart": -1,
        "irrigationConfig": {
            "incrementPercent": 50,
            "isAdjustFrecuency": true,
            "isAdjustIncrement": true,
            "isAdjustReduction": true,
            "isStopByRainDay": true,
            "isStopByRainProbability": true,
            "isStopByRainWeek": true,
            "isStopByTemp": true,
            "isStopByWind": true,
            "reductionPercent": -30,
            "reductionTemp": 25,
            "stopByRainDay": 3,
            "stopByRainProbability": 80,
            "stopByRainWeek": 25,
            "stopByTemp": 20,
            "stopByWind": 100
        },
        "irrigationPlan":  0,
        "name": " ",
        "poligon": [],
        "schedule": {},
        "soil": "",
        "startDate": " ",
        "value": "86400000",
        "valve": "F"
    };

    newStationary = () => {
        Object.assign($scope.newDevice, {
            "autoreverse": "OFF",
            "caudal": "0",
            "plots": {
                "p0": newPlot,
                "p1": newPlot,
                "p2": newPlot,
                "p3": newPlot,
                "p4": newPlot,
                "p5": newPlot,
                "p6": newPlot,
                "p7": newPlot
            },
            "position": "0",
            "sensorPresion": "0"
        });
    }

    newPump = () => {
        Object.assign($scope.newDevice, {
            "caudal": "0",
            "sensorPresion": "0"
        });
    }

    newSensor = () => {
        Object.assign($scope.newDevice, {
            "sensors": {
                "operation": "mean",
                "sensorNumber": "1",
                "S0": {
                    "id": "0x0",
                    "minValue": "0",
                    "latitude": "0",
                    "longitude": "0",
                    "maxValue": "0",
                    "type": "SHT"
                }
            },
            "sensingScheme": {
                "F1_dry_value": 15,
                "F1_wet_value": 30,
                "F2_dry_value": 15,
                "F2_wet_value": 30,
                "F3_dry_value": 15,
                "F3_wet_value": 30,
                "F4_dry_value": 15,
                "F4_wet_value": 30,
                "F5_dry_value": 15,
                "F5_wet_value": 30
            },
            "sensingMode": "1",
            "operationMode": "10",
            "sleepingTime": "10",
            "sensingProcess": false
        });
    }

    $scope.starSearchSensor = () => {
        $scope.actualSystem.operationMode = "0";
        $scope.setMachineSettings($scope.actualSystem);
    }

    $scope.stopSearchSensor = () => {
        $scope.actualSystem.operationMode = "3";
        $scope.setMachineSettings($scope.actualSystem);
    }

    $scope.updateSensingScheme = () => {
        swal({
            title: "",
            text: "Actualizar esquema de sensado",
            icon: "warning",
            // buttons: true,
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Actualizar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
                    delete $scope.actualSystem.caudal;
                    delete $scope.actualSystem.delayTime;
                    delete $scope.actualSystem.direction;
                    delete $scope.actualSystem.length;
                    delete $scope.actualSystem.plansLength;
                    delete $scope.actualSystem.sensorPresion;
                    delete $scope.actualSystem.velocity;
                    delete $scope.actualSystem.log;
                    $scope.actualSystem.operationMode = $scope.actualSystem.sleepingTime;
                    // $scope.actualSystem.operationMode = sleepingTimeToOperationMode($scope.actualSystem.sleepingTime);
                    updateNewDevice($scope.actualSystem);
                    document.getElementById("modalConfig").style.display = "none";
                    swal("Esquema actualizado correctamente!", {
                        icon: "success",
                    });
                } else {
                    swal("Actualización cancelada!");
                }
            });
    }

    sleepingTimeToOperationMode = (st) => {
        st = parseInt(st);
        let op;
        switch (st) {
            case 15:
            case 30:
            case 45:
            case 60:
                op = parseInt(st / 15);
                break;
            case 90:
            case 120:
                op = parseInt(st / 18);
                break;
            case 480:
                op = 7;
                break;
            case 720:
                op = 8;
                break;
            case 1440:
                op = 9;
                break;
        }
        return op;
    }

    $scope.updateNewDevice = async () => {
        if ($scope.newDevice.key && $scope.newDevice.name && $scope.newDevice.type && $scope.newDevice.zona) {
            try {
                await updateNewDevice($scope.newDevice);
                await updateDeviceUsers(convertDotToDash($scope.authUser.email), $scope.newDevice.key, $scope.authUser.displayName, "propietario");
                location.reload();
            } catch (error) {
                console.error("No fue posible actualizar el equipo:", error);
                swal("No fue posible actualizar el equipo.", {
                    icon: "error",
                });
            }
        }
    }

    $scope.addNewUserToDevice = () => {
        updateDeviceUsers(convertDotToDash($scope.newUserEmail), $scope.actualSystem.key, $scope.newUserName, $scope.newUserRole);
    }

    $scope.addNewSensorToNet = () => {
        let s = $scope.newSensor;
        if (s.id && ($scope.actualSystem.type == 'Sensor' && s.latitude && s.longitude || $scope.actualSystem.type == 'Nevera')) {
            swal({
                title: "",
                text: "Agrear nuevo sensor",
                icon: "warning",
                // buttons: true,
                buttons: {
                    cancel: "Cancelar",
                    confirm: {
                    text: "Agregar",
                    value: true,
                    visible: true,
                    className: "btn-confirmar",
                    closeModal: true
                    }
                },
                dangerMode: true,
            })
            .then((confirm) => {
                if (confirm) {
                    let sensorNumber = 1;
                    let idx = "S0";
                    if ($scope.actualSystem.sensors) {
                        sensorNumber = parseInt($scope.actualSystem.sensors.sensorNumber);
                        idx = "S" + sensorNumber;
                        sensorNumber += 1;
                    } else {
                        $scope.actualSystem["sensors"] = {};
                        $scope.actualSystem.sensors["sensorNumber"] = 1;
                    }
                    $scope.actualSystem.sensors[idx] = $scope.newSensor;
                    $scope.actualSystem.sensors.sensorNumber = sensorNumber;
                    // updateSensorNet($scope.actualSystem.key, $scope.actualSystem.sensors);
                    $scope.setMachineSettings($scope.actualSystem);
                    //location.reload();
                    document.getElementById("modalNuevoSensor").style.display = "none";
                    swal("Asignación completada!", {
                        icon: "success",
                    })
                    . then (() => {
                        initializeSystemMap($scope.actualSystem);
                        // $scope.selectSystem($scope.actualSystem);
                    });
                } else {
                    swal("Asignación cancelada!");
                }
            });
        } else {
            swal("Completa la información del sensor!");
        }
    }

    $scope.deleteActualSensor = () => {
        swal({
            title: "",
            text: "Eliminar sensor",
            icon: "warning",
            // buttons: ["Cancelar", true],
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Eliminar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
                    // document.getElementById("modalEditSensor").style.display = "none";
                    // $scope.actualSensor.alias ="";
                    // $scope.actualSensor.id ="0x0";
                    // $scope.actualSensor.culture ="";
                    // $scope.actualSensor.latitude ="";
                    // $scope.actualSensor.longitude ="";
                    // if ($scope.actualSensor.t) delete $scope.actualSensor.t;
                    // if ($scope.actualSensor.h) delete $scope.actualSensor.h;
                    deleteActualSensor();
                    $scope.setMachineSettings($scope.actualSystem);
                    swal("Eliminación completada!", {
                        icon: "success",
                    });
                } else {
                    swal("Eliminación cancelada!");
                }
            });
    }

    function deleteActualSensor() {
        const sensors = $scope.actualSystem.sensors;
        const actualSensor = $scope.actualSensor;
        const newSensors = {};
        let validCount = 0;
        for (let i = 0; i < sensors.sensorNumber; i++) {
            const key = `S${i}`;
            if (sensors[key].id === actualSensor.id) continue;
            const newKey = `S${validCount}`;
            newSensors[newKey] = sensors[key];
            validCount++;
        }
        newSensors.sensorNumber = validCount;
        if (sensors.operation) newSensors.operation = sensors.operation;
        $scope.actualSystem.sensors = newSensors;
    }

    $scope.editActualSensor = () => {
        swal({
            title: "",
            text: "Editar sensor",
            icon: "warning",
            // buttons: ["Cancelar", true],
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Editar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        })
        .then((confirm) => {
            if (confirm) {
                document.getElementById("modalEditSensor").style.display = "none";
                $scope.setMachineSettings($scope.actualSystem);
                swal("Edición completada!", {
                    icon: "success",
                });
            } else {
                swal("Edición cancelada!");
            }
        });
    }

    $scope.editSensor = (sensor) => {
        $scope.actualSensor = sensor;
    }

    $scope.deleteUser = (key, user) => {
        let deviceUserList = $scope.users[key];
        for (idx in deviceUserList) {
            if (deviceUserList[idx].alias == user) {
                deleteUser(key, idx);
            }
        }
    }

    $scope.reload = () => {
        document.location.reload();
    }

    // #endregion CONFIGURACIONES

    // #region PLAN DE RIEGO

    $scope.setNewPlan = (starAngle, endAngle, value, endGun, culture, sensor) => {
        if (!$scope.actualSystem.plans) {
            $scope.actualSystem["plans"] = {};
        }
        // REQ-059: ya no lee el DOM (el formulario es <dta-plan-pivote>); solo lo usa deletePlan para el
        // plan por defecto. Comparacion NUMERICA: antes "50" <= "100" (texto) era falso y guardaba la maxima.
        if (starAngle != endAngle) {
            let length = Object.keys($scope.actualSystem.plans).length;
            let index = `p${length}`;
            let finalValue = (Number(value) <= Number($scope.actualSystem.maxVelocity)) ? value : $scope.actualSystem.maxVelocity;
            let newPlan = {
                starAngle: "" + starAngle,
                endAngle: "" + endAngle,
                value: "" + finalValue,
                endGun: endGun,
                culture: culture,
                sensor: sensor
            }
            swal({
                title: "Plan de riego",
                text: "¿Desea confirmar los cambios realizados?",
                icon: "warning",
                // buttons: true,
                buttons: {
                    cancel: "Cancelar",
                    confirm: {
                      text: "Confirmar",
                      value: true,
                      visible: true,
                      className: "btn-confirmar",
                      closeModal: true
                    }
                },
                dangerMode: true,
            })
                .then((confirm) => {
                    if (confirm) {
                        $scope.actualSystem.plans[index] = newPlan;
                        $scope.actualSystem.plansLength = length + 1;
                        // showPlanRiegoPie();
                        $scope.setMachineSettings($scope.actualSystem);
                        swal("Plan de riego actualizado correctamente!", {
                            icon: "success",
                        });
                    } else {
                        swal("No se realizó la actualización!");
                    }
                });
        }
    }

    $scope.selectProgram = (programId) => {
        selectProgram(programId);
    }

    selectProgram = (programId) => {
        let plot = document.getElementById("planEstacionarioId").value;
        $scope.actualSystem.plots[plot]["irrigationPlan"] =  programId;
        $scope.setMachineSettings($scope.actualSystem);
        // $scope.$apply();
    }

    // REQ-059: la fila elegida en la tabla de velocidades pasa al plan que se esta editando.
    $scope.setTimer = (value) => {
        if ($scope.planPivote && $scope.planPivote.plan) $scope.planPivote.plan.velocidad = Number(value);
        if ($scope.pivoteTabla) $scope.pivoteTabla.valorActual = Number(value);
    }

    // REQ-059: "Nuevo plan" y "Planificacion" del pivote son ahora un solo componente <dta-plan-pivote>.
    $scope.planPivote = null;
    $scope.redesDeSensores = [];
    $scope.abrirPlanPivote = (indice) => {
        const pivote = __modulo("pivote");
        const planes = $scope.actualSystem.plans;
        const clave = (indice === null || indice === undefined || indice === "") ? null
            : (("" + indice).indexOf("p") === 0 ? "" + indice : "p" + indice);
        $scope.actualizarListaCultivos();
        $scope.redesDeSensores = Object.keys($scope.systems || {})
            .map(k => $scope.systems[k]).filter(s => s && s.type == "Sensor");
        $scope.planPivote = {
            indice: clave,
            plan: clave && planes && planes[clave] ? pivote.planDesdeGuardado(planes[clave]) : pivote.planNuevo(planes)
        };
        abrirModal("modalPlanPivote");
    };

    // REQ-060: sectores ya guardados que se solapan (para avisar en la lista de planes).
    // Se usa en un ng-repeat: debe devolver la MISMA lista mientras los planes no cambien. Si devuelve
    // una lista nueva en cada digest, Angular entra en bucle ($rootScope:infdig) y la pantalla deja de
    // responder (paso en la compilacion 26.11.07.005).
    let solapesEnCache = { clave: null, lista: [] };
    $scope.solapamientosPivote = () => {
        const planes = $scope.actualSystem ? $scope.actualSystem.plans : null;
        const clave = JSON.stringify(planes || null);
        if (clave !== solapesEnCache.clave) {
            solapesEnCache = { clave: clave, lista: planes ? __modulo("pivote").solapamientos(planes) : [] };
        }
        return solapesEnCache.lista;
    };

    $scope.verVelocidadesPivote = (velocidad) => {
        $scope.showSystemTable($scope.actualSystem.brand, velocidad);
        abrirModal("systemConfigModal");
    };

    // Guardar (con la confirmacion de siempre). El plan ya viene validado por el componente.
    $scope.guardarPlanPivote = (plan, indice) => {
        swal({
            title: "Plan de riego",
            text: "¿Desea confirmar los cambios realizados?",
            icon: "warning",
            buttons: {
                cancel: "Cancelar",
                confirm: { text: "Confirmar", value: true, visible: true, className: "btn-confirmar", closeModal: true }
            },
            dangerMode: true,
        }).then((confirm) => {
            if (!confirm) {
                swal("No se realizó la actualización!");
                return;
            }
            const sistema = $scope.actualSystem;
            if (!sistema.plans || typeof sistema.plans !== "object") sistema.plans = {};
            const clave = indice || __modulo("pivote").claveNueva(sistema.plans);
            sistema.plans[clave] = plan;
            sistema.plansLength = Object.keys(sistema.plans).length;
            $scope.setMachineSettings(sistema);
            swal("Plan de riego actualizado correctamente!", { icon: "success" });
        });
    };

    $scope.setEditPlanEstacionario = (index) => {
        $scope.editedPlan = index;
        if (index == "p7") {
            $scope.actualSystem.length = 8;
            if (!$scope.actualSystem.plots[index]) {
                $scope.actualSystem.plots[index] = newPlot;
            }
        }
        let asEpPlot = $scope.actualSystem.plots[index];
        asEpPlot["startDate"] = asEpPlot["startDate"] ? asEpPlot["startDate"] : " ";
        // REQ-061 E1: los valores por defecto del riego a demanda los ponian unos ng-init que solo se
        // ejecutaban al cargar la pagina (sobre un objeto vacio): nunca llegaban a una parcela real.
        asEpPlot.irrigationConfig = __modulo("parcela").normalizarConfiguracion(asEpPlot.irrigationConfig);
        $scope.actualizarListaCultivos();
        // $scope.sensorsList = $scope.getSensors();
        $scope.editedCulture = $scope.actualSystem.plots[index].culture ? $scope.actualSystem.plots[index].culture : "";
        M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'));
        document.getElementById("planEstacionarioId").value = index;
        document.getElementById("editName").value = $scope.actualSystem.plots[index].name ? $scope.actualSystem.plots[index].name : "";
        document.getElementById("startDate").value = $scope.actualSystem.plots[index].startDate ? dateTimeToString($scope.actualSystem.plots[index].startDate.substr(0,16)) : "";
        document.getElementById("editPlotCaudal").value = $scope.actualSystem.plots[index].caudal ? $scope.actualSystem.plots[index].caudal : "0";
        // REQ-051: el poligono se edita en el mapa (<dta-mapa-selector>), no en un <textarea>.
        $scope.edicionParcela = { poligono: __modulo("geo").normalizarPoligono($scope.actualSystem.plots[index].poligon) };
        document.getElementById("editEqSensor").selectedIndex = $scope.actualSystem.plots[index].sensor ? $scope.actualSystem.plots[index].sensor : "";
        document.getElementById("editSoil").selectedIndex = $scope.actualSystem.plots[index].soil ? $scope.actualSystem.plots[index].soil : "";
        // document.getElementById("editDay").value = $scope.getDayFromMs($scope.actualSystem.plots[index].value);
        // document.getElementById("editHour").value = $scope.getHourFromMs($scope.actualSystem.plots[index].value);
        // document.getElementById("editMinutes").value = $scope.getMinutesFromMs($scope.actualSystem.plots[index].value);
        document.getElementById("editType").value = $scope.actualSystem.plots[index].valve ? $scope.actualSystem.plots[index].valve : "F";
    }

    $scope.getSensorNetworks = () => {
        $scope.sensorNetworks = [];
        for (let idx in $scope.systems) {
            if ($scope.systems[idx].type == "Sensor") {
                $scope.sensorNetworks.push($scope.systems[idx]);
            }
        }
        $scope.sensorNetworks;
    }

    $scope.getSensors = () => {
        let sensorId = $scope.actualSystem.plots[$scope.editedPlan].sensor;
        if (!sensorId) return;
        $scope.sensorsList = [];
        $scope.actualSystem.plots[$scope.editedPlan][sensorId] = $scope.actualSystem.plots[$scope.editedPlan][sensorId] || null;
        let sensorsList = [];
        let sensorNetwork = $scope.systems[sensorId];
        let count = 0;
        for (let idx in sensorNetwork.sensors) {
            sensorsList.push(sensorNetwork.sensors[idx]);
            count++;
            if (count == sensorNetwork.sensors.sensorNumber) break;
        }
        $scope.sensorsList = sensorsList;
    }

    $scope.getSensorImage = (sensorType) => {
        return sensorType == 'NPKML' ? 'assets/images/sNPKML.png' :
            sensorType == 'NPK' ? 'assets/images/sNPK.png' : 
            sensorType == 'WM' ? 'assets/images/sWM.png' : 
            sensorType == 'SHT4' ? 'assets/images/sVWC.png' : 
            sensorType == 'Tr' ? 'assets/images/sTemp.png' : 
            sensorType == 'Psi' ? 'assets/images/sPSI.png' : 
            sensorType == 'Fl' ? 'assets/images/sCaudal.png' :
            sensorType == 'SHT2' ? 'assets/images/sSHT_2.png' :
            sensorType == 'Irms' ? 'assets/images/sIrms.png' :
            sensorType == 'Contact' ? 'assets/images/sContacto.jpeg' : '';
    }

    $scope.getSensorName = (sensorType) => {
        return sensorType == 'NPKML' ? 'Perfil' :
        sensorType == 'NPK' ? 'Nutrientes' : 
        sensorType == 'WM' ? 'Tensiómetro' : 
        sensorType == 'SHT4' ? 'WVC' : 
        sensorType == 'Tr' ? 'Temperatura' : 
        sensorType == 'Psi' ? 'Presión' : 
        sensorType == 'Fl' ? 'Caudal' : '';
    }

    $scope.getSensorName = (sensor, sensorId) => {
        if (!sensor) return "";
        let sensorList = $scope.systems[sensor].sensors;
        let count = 0;
        for (let idx in sensorList) {
            if (sensorList[idx].id == sensorId) return sensorList[idx].alias;
            count++;
            if (count == sensorList.sensorNumber) break;
        }
        return "";
    }

    $scope.updateSelectedSensor = () => {
        // $scope.actualSystem.plots[$scope.editedPlan].sensorId = parseInt($scope.actualSystem.plots[$scope.editedPlan].sensorId);
        // $scope.actualSystem.plots[$scope.editedPlan].sensor = parseInt($scope.actualSystem.plots[$scope.editedPlan].sensor);
        $scope.setMachineSettings($scope.actualSystem);
    }

    $scope.createPlanEstacionario = () => {
        let aux = document.getElementById("schDate").value.split("T");
        let date = aux[0];
        let time = aux[1];
        let cultureList = document.getElementById("selectPlotCulture");
        let nombreCultivo = cultureList.options[cultureList.selectedIndex].text;
        nombreCultivo = nombreCultivo == "Seleccionar nuevo cultivo" ? ($scope.editedCulture != "" ? $scope.editedCulture : "") : nombreCultivo;
        if (date && time && nombreCultivo) {
            $scope.dataEditionPlanEstacionario();
            $scope.confirmPlanEstacionario();
        }
    }

    $scope.editPlanEstacionario = () => {
        $scope.dataEditionPlanEstacionario();
        $scope.confirmPlanEstacionario();
    }

    $scope.confirmPlanEstacionario = () => {
        swal({
            title: "Plan de riego",
            text: "¿Desea confirmar los cambios realizados?",
            icon: "warning",
            // buttons: ["Cancelar", true],
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Confirmar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
                    $scope.setMachineSettings($scope.actualSystem);
                    $scope.$apply();
                    swal("Plan de riego actualizado correctamente!", {
                        icon: "success",
                    });
                } else {
                    swal("No se realizó la actualización!");
                }
            });
    }

    $scope.addNewDateToSchedule = () => {
        let delay = $scope.getMsFromDay(document.getElementById("setDay").value);
        delay += $scope.getMsFromHour(document.getElementById("setHour").value);
        delay += $scope.getMsFromMinutes(document.getElementById("setMinutes").value);
        let aux = document.getElementById("schDate").value.split("T");
        let date = aux[0];
        let time = aux[1];
        if (date && time) {
            let data = {
                "t": "",
                "date": date,
                "time": time,
                "value": delay
            }
            if (!$scope.actualSystem.plots[$scope.editedPlan].schedule) {
                $scope.actualSystem.plots[$scope.editedPlan].schedule = [];
            }
            $scope.actualSystem.plots[$scope.editedPlan].schedule.push(data);
            $scope.setMachineSettings($scope.actualSystem);
            document.getElementById("schDate").value = null;
        }
    }

    $scope.deleteSchedule = (index = "") => {
        swal({
            title: "Eliminar riego",
            text: "¿Seguro desea eliminar este riego?",
            icon: "error",
            // buttons: ["Cancelar", true],
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Eliminar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
                    // $scope.$apply();
                    if ($scope.actualSystem.plots[$scope.editedPlan].schedule) {
                        let idx = index != "" || index == 0? index : document.getElementById("editScheduleIndex").value;
                        delete $scope.actualSystem.plots[$scope.editedPlan].schedule[idx];
                        let data = [].concat($scope.actualSystem.plots[$scope.editedPlan].schedule);
                        $scope.actualSystem.plots[$scope.editedPlan].schedule = [];
                        data.forEach((item) => {
                            $scope.actualSystem.plots[$scope.editedPlan].schedule.push(item);
                        });
                        $scope.setMachineSettings($scope.actualSystem);
                        swal("Plan de riego actualizado correctamente!", {
                            icon: "success",
                        });
                        M.Modal.getInstance(document.querySelector('#modalEditFechaRiego')).close();
                    }
                } else {
                    swal("No se realizó la actualización!");
                }
            });
    }

    $scope.initEstationaryVars = () => {
        $scope.planSetSensor = ''; 
        $scope.actualEqSensor = $scope.actualSystem.plots[$scope.editedPlan].sensor;
        $scope.actualSoil = $scope.actualSystem.plots[$scope.editedPlan].soil;
        $scope.actualValve = $scope.actualSystem.plots[$scope.editedPlan].valve;
        let a = 0;
    }

    // REQ-061 E1: "Aceptar" en Configurar parcela guardaba tambien los campos del modal "Editar fecha"
    // (vacios) y dejaba en 0 la duracion del PRIMER riego programado (schedule[0].value = 0).
    // Ahora guardar la parcela no toca los riegos; la fecha editada se guarda con guardarFechaRiego().
    $scope.dataEditionPlanEstacionario = () => {
        updatePoligon();
        validateIrrigationconfig();
        $scope.actualSystem.plots[$scope.editedPlan].caudal = document.getElementById("editPlotCaudal").value;
        $scope.actualSystem.plots[$scope.editedPlan].valve = document.getElementById("editType").value;
        $scope.setMachineSettings($scope.actualSystem);
    }

    // Guardar el riego programado que se edito en "Editar fecha de riego".
    $scope.guardarFechaRiego = () => {
        const plot = $scope.actualSystem.plots[$scope.editedPlan];
        const indice = document.getElementById("editScheduleIndex").value;
        if (!plot || !plot.schedule || indice === "" || !plot.schedule[parseInt(indice)]) return;
        const riego = plot.schedule[parseInt(indice)];
        riego.value = __modulo("parcela").msDesdeDuracion({
            dias: document.getElementById("editDay").value,
            horas: document.getElementById("editHour").value,
            minutos: document.getElementById("editMinutes").value
        });
        const aux = document.getElementById("scheduleDate").value.split("T");
        riego.date = aux[0] ? aux[0] : riego.date;
        riego.time = aux[1] ? aux[1] : riego.time;
        $scope.setMachineSettings($scope.actualSystem);
    }

    updatePoligon = () => {
        const geo = __modulo("geo");
        const poligono = geo.normalizarPoligono($scope.edicionParcela && $scope.edicionParcela.poligono);
        $scope.actualSystem.plots[$scope.editedPlan].poligon = geo.esPoligonoValido(poligono) ? poligono : "";
    }

    // REQ-061 E1: mismos valores por defecto y limites, pero un 0 escrito se respeta
    // (antes `!valor ? defecto`: 0 °C de paro -> 20 °C, 0 % de reduccion -> -30 %, 0 mm -> 3 mm...).
    validateIrrigationconfig = () => {
        const plot = $scope.actualSystem.plots[$scope.editedPlan];
        plot.irrigationConfig = __modulo("parcela").normalizarConfiguracion(plot.irrigationConfig);
    }
    
    $scope.startPlotIrrigation = () => {
        let text = "";
        if ($scope.editedPlan == "p7") {
            text = "¿Desea iniciar el pozo?";
        } else {
            text = "¿Desea iniciar el riego de " + ($scope.actualSystem.plots[$scope.editedPlan].name ? $scope.actualSystem.plots[$scope.editedPlan].name : "la Sección " + (parseInt($scope.editedPlan.slice(-1)) + 1)) + "?";
        }  
        swal({
            title: "Plan de riego",
            text: text,
            icon: "warning",
            // buttons: ["Cancelar", true],
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Iniciar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
              }
            // dangerMode: true,
        })
        .then((confirm) => {
            if (confirm) {
                $scope.actualSystem.status = true;
                let plot = $scope.actualSystem.plots[$scope.editedPlan];
                plot["forcedStart"] = 1;
                // validateIrrigationCapacity();
                $scope.setMachineSettings($scope.actualSystem);
                initializeSystemMap($scope.actualSystem);
                $scope.$apply();
                swal("Riego iniciado!", {
                    icon: "success",
                });
            } else {
                swal("Acción cancelada!");
            }
        });
    }

    $scope.stopPlotIrrigation = () => {
        let text = "";
        if ($scope.editedPlan == "p7") {
            text = "¿Desea detener el pozo?";
        } else {
            text = "¿Desea detener el riego de " + ($scope.actualSystem.plots[$scope.editedPlan].name ? $scope.actualSystem.plots[$scope.editedPlan].name : "la Sección " + (parseInt($scope.editedPlan.slice(-1)) + 1)) + "?";
        }  
        swal({
            title: "Plan de riego",
            text: text,
            icon: "warning",
            // buttons: ["Cancelar", true],
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Detener",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
              }
            // dangerMode: true,
        })
        .then((confirm) => {
            if (confirm) {
                let plot = $scope.actualSystem.plots[$scope.editedPlan];
                plot["forcedStart"] = -1;
                setStatusOFF();
                $scope.setMachineSettings($scope.actualSystem);
                initializeSystemMap($scope.actualSystem);
                $scope.$apply();
                swal("Riego detenido!", {
                    icon: "success",
                });
            } else {
                swal("Acción cancelada!");
            }
        });
    }

    setStatusOFF = () => {
        actualStatus = 0;
        for (plot in $scope.actualSystem.plots) {
            actualStatus |= $scope.actualSystem.plots[plot].forcedStart == 1 ? 1 : 0;
        }
        $scope.actualSystem.status = actualStatus;
    }

    $scope.getSystemTextColor = (system) => {
        let color = "#d3d3d3e0";
        if (system) {
            switch (system.type) {
                case 'PC':
                case 'PL':
                    color = system.status == 'OFF' ? "#000" :                                                          // Apagado
                            system.log && (system.log.voltage == 'false' || system.log.voltage == false ) ? "#fff" :   // Falla elétrica
                            system.log && (system.log.safety  == 'false' ||  system.log.safety == false)  ? '#000' :   // Falla de seguridad
                            system.log && (system.log.commDelay != '-1') ? '#fff' :                                    // Comunicación inestable
                            system.log && (system.log.status == 'OFF') ? 'yellow' : "#fff";                                                                                    // Encendido
                    break;
                case 'Estacionario':
                case 'Pump':
                case 'Sensor':
                    color = "#000";
                    break;
                case 'Nevera':
                    color = "#fff";
                    break;
            }
        }
        return color;
    }

    $scope.getSystemBackgroundColor = (system) => {
        let color = "#d3d3d3e0";
        if (system) {
            switch (system.type) {
                case 'PC':
                case 'PL':
                    color = system.status == 'OFF' ? "#d3d3d3e0" :                                                          // Apagado
                            system.log && (system.log.voltage == 'false' || system.log.voltage == false ) ? "#ff0000c0" :   // Falla elétrica
                            system.log && (system.log.safety  == 'false' ||  system.log.safety == false)  ? '#db7093c0' :   // Falla de seguridad
                            system.log && (system.log.commDelay != '-1') ? '#808080e0' :                                    // Comunicación inestable
                            system.log && (system.log.status == 'OFF') ? 'yellow' : "#20b2aab0";                                                                                    // Encendido
                    break;
                case 'Estacionario':
                case 'Pump':
                    color = system.status == 'OFF' ? "#d3d3d3e0" : "#20b2aab0";
                    break;
                case 'Sensor':
                    color = "#20b2aab0";
                    break;
                case 'Nevera':
                    color = "#204eb2b0";
                    break;
            }
        }
        return color;
    }

    $scope.getSystemColor = (system) => {
        return $scope.getSystemBackgroundColor(system) == "#d3d3d3e0" ? 'grey' : 'white';
    }

    // REQ-064: codigo de colores de parcelas y motor del estacionario (logic/panel.js -> estadoParcela):
    //   gris = apagado confirmado, amarillo = orden de encender/apagar sin confirmar en los logs,
    //   verde = encendido confirmado. Mismo estado en el panel, el listado y el borde de la parcela en el mapa.
    const COLORES_PARCELA = { apagado: "lightgray", pendiente: "yellow", encendido: "springgreen" };
    // En el listado el encendido es blanco: contrasta con el fondo de la tarjeta (decision del usuario).
    const COLORES_PARCELA_LISTADO = { apagado: "gray", pendiente: "yellow", encendido: "white" };

    $scope.getPlotColor = (system, index) => {
        const paleta = $scope.selectedWindow == "listado" ? COLORES_PARCELA_LISTADO : COLORES_PARCELA;
        return paleta[__modulo("panel").estadoParcela(system, index)];
    }

    $scope.isPlotActive = (system, index) => {
        let active = false;
        if (index && system && system.plots) {
            // let dateTime = getDateAndTime();
            let plot = system.plots[index];
            if (plot) {
                if (plot.forcedStart && plot.forcedStart == 1) {
                    active = true;
                // } else if (plot.schedule) {
                //     plot.schedule.forEach ((sch, index) => {
                //         let newTime = $scope.msToTime(sch.value).split(":");
                //         if (sch.value > 0 && ((sch.date == dateTime.date) && (dateTime.time <= sch.time || sch.time <= sumTimes(dateTime.time, "" + newTime[1] + ":" + newTime[2])))) {
                //             active = true;
                //         }
                //     });
                }
            }
        }
        return active;
    }

    $scope.deleteEditedPlan = () => {
        $scope.deletePlan($scope.editedPlan);
    }

    $scope.deletePlan = (index) => {
        if (index) {
            delete $scope.actualSystem.plans[index];
        } else {
            $scope.actualSystem.plans = "";
        }
        $scope.setNewPlan(0, 360, 0, false);
    }

    $scope.clearPlanEstacionario = () => {
        swal({
            title: "Eliminar parcela",
            text: "Todos los dato de la parcela serán eliminados. ¿Seguro desea continuar?",
            icon: "error",
            // buttons: ["Cancelar", true],
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Eliminar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
                    $scope.actualSystem.plots[$scope.editedPlan] = newPlot;
                    $scope.setMachineSettings($scope.actualSystem);
                    $scope.$apply();
                    swal("Parcela eliminada!", {
                        icon: "success",
                    });
                } else {
                    swal("No se realizó la acción!");
                }
            });

    }

    showPlanRiegoPie = () => {
        let dataPie = [];
        let maxAngle = 0;
        if ($scope.actualSystem.plans) {
            for (let i in $scope.actualSystem.plans) {
                let label = $scope.actualSystem.plans[i].value + '%';
                let data = parseFloat(($scope.actualSystem.plans[i].endAngle - $scope.actualSystem.plans[i].starAngle) * 100 / 360);
                dataPie.push({ "label": label, "data": data, "backgroundColor": 'rgba(255, 99, 132, 1)' });
                maxAngle = maxAngle < parseInt($scope.actualSystem.plans[i].endAngle) ? parseInt($scope.actualSystem.plans[i].endAngle) : maxAngle;
            }
            if (maxAngle < 360) {
                dataPie.push({ "label": "-1", "data": 100 - maxAngle * 100 / 360 });
            }
        } else {
            dataPie = [{ "label": "0%", "data": 100 }];
        }
        // drawPieGraph(dataPie);
    }

    drawPieGraph = (dataPie) => {
        $.plot('#placeholderPie', dataPie, {
            series: {
                pie: {
                    show: true,
                    radius: 1,
                    label: {
                        show: false,
                        radius: 2 / 3,
                        threshold: 0.1
                    }
                }
            },
            legend: {
                show: false
            }
        });
    }

    // REQ-040 F-5: listOfCultures arranca en {} (nunca falsy), asi que "if (!$scope.listOfCultures)"
    // no cargaba nunca los cultivos. Ahora se cargan una vez, la primera vez que se necesitan.
    let cultivosCargados = false;
    let leyendoCultivos = false;
    const cargarCultivosSiFaltan = () => {
        if (cultivosCargados || leyendoCultivos) return;
        getCultures();
    };

    $scope.actualizarListaCultivos = () => {
        cargarCultivosSiFaltan();
    }

    $scope.showDiseaseDetails = (disease) => {
        $scope.isShowDiseaseDetails = !$scope.isShowDiseaseDetails;
        $scope.selectedDisease = disease;
    }

    $scope.selectPlanRiego = () => {
        $scope.actualizarListaCultivos();
        M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'));
        $scope.showWindow('planificarRiego');
    }

    getCultures = () => {
        leyendoCultivos = true;
        __repo().leerCultivos().then(cultivos => {
            leyendoCultivos = false;
            cultivosCargados = true;
            // Nunca null/undefined: si no hay datos, objeto vacio (evita el TypeError del <select>).
            $scope.listOfCultures = (cultivos && typeof cultivos.val === 'function' && cultivos.val()) || {};
            // REQ-042/043: los select son nativos (browser-default): basta con el digest.
            $scope.$apply();
            M.AutoInit();
        }).catch(error => {
            leyendoCultivos = false;
            // Las reglas desplegadas pueden denegar /cultivos; no debe romper la vista.
            console.warn("[cultivos] no se pudieron leer:", (error && error.message) || error);
            $scope.listOfCultures = {};
            try { $scope.$apply(); } catch (ignorado) { /* ya en digest */ }
        });
    }

    $scope.getCultureList = () => {
        cargarCultivosSiFaltan();
        M.AutoInit();
    }

    $scope.selectCulture = (_nombreSistema, _nombreCultivo) => {
        let cultureList = document.getElementById("selectPlotCulture");
        let nombreCultivo = cultureList.options[cultureList.selectedIndex].text;
        nombreCultivo = nombreCultivo == "Seleccionar nuevo cultivo" ? ($scope.editedCulture != "" ? $scope.editedCulture : "") : nombreCultivo;
        swal({
            title: $scope.actualSystem.plots[$scope.editedPlan].name,
            text: "Asignar el plan de riego de " + nombreCultivo,
            icon: "warning",
            icon: "warning",
            // buttons: ["Cancelar", true],
            buttons: {
                cancel: "Cancelar",
                confirm: {
                  text: "Asignar",
                  value: true,
                  visible: true,
                  className: "btn-confirmar",
                  closeModal: true
                }
            },
            dangerMode: true,
        })
            .then((confirm) => {
                let aux = document.getElementById("startDate").value.split("T");
                let date = aux[0];
                let time = aux[1];
                if (confirm && date && time && nombreCultivo) {
                    $scope.actualSystem.plots[$scope.editedPlan].culture = nombreCultivo;
                    let cultivo = getCultivo($scope.actualSystem.plots[$scope.editedPlan].culture);
                    let plot = document.getElementById("planEstacionarioId").value;
                    setCulturePlanningToSystem($scope.actualSystem, plot, cultivo);
                    $scope.setMachineSettings($scope.actualSystem);
                } else {
                    if (!date || !time || !nombreCultivo) {
                        swal("Debe definir el cultivo, la fecha y la hora para generar la planificación!");
                    } else {
                        swal("Asignación cancelada!");
                    }
                }
            });
    }

    asignCulture = () => {
        $scope.setMachineSettings($scope.actualSystem);
        $scope.$apply();
        swal("Plan de riego actualizado correctamente!", {
            icon: "success",
        });
    }

    getCultivo = (nombreCultivo) => {
        let cultivo = {};
        for (idx in $scope.listOfCultures) {
            if ($scope.listOfCultures[idx].culture == nombreCultivo) {
                cultivo = $scope.listOfCultures[idx];
            }
        }
        return cultivo;
    }

    setCulturePlanningToSystem = (sistema, plot, cultivo) => {
        let aux = document.getElementById("startDate").value.split("T");
        let date = aux[0];
        let time = aux[1];
        if (date && time) {
            if (!sistema.plots[plot].schedule) {
                sistema.plots[plot].schedule = [];
            }
            for (idx in cultivo.plan) {
                if (cultivo.plan[idx].type == "r") {
                    let newDate = new Date(date);
                    newDate.setDate(newDate.getDate() + 1 + parseInt(cultivo.plan[idx].day))
                    let month = newDate.getMonth() + 1;
                    let day = newDate.getDate();
                    let dose = convertDoseToTime(sistema, parseInt(cultivo.plan[idx].dose.split("~")[0]));
                    let data = {
                        "t": parseInt(cultivo.plan[idx].day),
                        "date": dateTimeToString(newDate.getFullYear() + '-' + month + '-' + day),
                        "time": time,
                        "value": dose
                    }
                    sistema.plots[plot].schedule.push(data);
                }
            }
            $scope.$apply();
        }
    }

    convertDoseToTime = (sistema, dose) => {
        let time = "00:00:" + dose;
        if (sistema.caudal) {
            // Caudal (Q) = Volumen (litros) / Tiempo (segundos)
            // Tiempo (segundos) = Volumen (litros) / Caudal (Q)
            // 1 mm de agua = 1 l/m2 
            //let auxTime = dose / sistema.caudal;
            // time = $scope.getDayFromMs(auxTime) + ":" + $scope.getHourFromMs(auxTime) + ":" + $scope.getMinutesFromMs(auxTime);
            time = dose / sistema.caudal;
        }
        return time;
    }

    $scope.automatizaciones = () => {
        swal({
            title: "Automatización",
            text: "Esta es una característica de pago",
            icon: "warning",
            button: true,
            dangerMode: true,
        });
    }

    $scope.editFechaRiego = (schedule, index) => {
        let data = schedule.value ? schedule.value : 0;
        document.getElementById("editDay").value = $scope.getDayFromMs(data);
        document.getElementById("editHour").value = $scope.getHourFromMs(data);
        document.getElementById("editMinutes").value = $scope.getMinutesFromMs(data);
        document.getElementById("editScheduleIndex").value = index;
        document.getElementById("scheduleDate").value = dateTimeToString(schedule.date) + "T" + schedule.time;
    }

    $scope.editTiempoRiegoManual = () => {
        let data = $scope.getMsFromDay(document.getElementById("editDayManual").value);
        data += $scope.getMsFromHour(document.getElementById("editHourManual").value);
        data += $scope.getMsFromMinutes(document.getElementById("editMinutesManual").value);
        $scope.actualSystem.plots[$scope.editedPlan].value = data;
    }

    dateTimeToString = dateTime => {
        let date = dateTime.split("-");
        let month = date[1] < 10 && date[1].length < 2 ? "0" + date[1] : date[1];
        let day = date[2] < 10 && date[2].length < 2 ? "0" + date[2] : date[2]; 
        return date[0] + "-" + month + "-" + day;
    }

    // #endregion PLAN DE RIEGO

    // #region NOTICIACIÓN
    $scope.notificationsEnabled = () => {
        return localStorage.getItem('notificacionesHabilitadas') === 'true' &&
            typeof Notification !== 'undefined' && Notification.permission === 'granted';
    }

    $scope.toggleNotifications = () => {
        if (!$scope.authUser) return;

        if ($scope.notificationsEnabled()) {
            localStorage.setItem('notificacionesHabilitadas', 'false');
            return Promise.resolve($scope.deleteToken()).finally(() => $scope.$applyAsync());
        }

        if (typeof enableFirebaseMessaging !== "function") return;
        return enableFirebaseMessaging($scope.authUser.email).then(result => {
            if (result.token) {
                console.log("Token FCM activo:", result.token);
            } else if (result.permission === 'granted') {
                console.error("El permiso fue concedido, pero Firebase no pudo generar el token FCM.");
                if (typeof swal === 'function') {
                    swal({
                        title: "No se pudo registrar el dispositivo",
                        text: "El permiso de notificaciones está activo, pero no se pudo generar el token FCM. Verifica la conexión y vuelve a intentarlo.",
                        icon: "warning",
                    });
                }
            }
            $scope.$applyAsync();
        }).catch(error => {
            console.error("Error al activar notificaciones:", error);
            $scope.$applyAsync();
        });
    }

    // Conserva compatibilidad con llamadas anteriores.
    $scope.setToken = $scope.toggleNotifications;

    $scope.deleteToken = () => {
        return unSuscribeToNotifications($scope.authUser.email);
    }
    // #endregion NOTICIACIÓN

    // #region Leaflet 
    //https://leaflet-extras.github.io/leaflet-providers/preview/ 

    initializeMap = () => {
        if (!map) {
            map = L.map('map', {keyboard: false});   // evita que el mapa se enfoque y mueva la página
            addLayers();
            rosanautica();
            leyendaHumedad();
        }
    }

    // REQ-052: leyenda de colores de humedad de las parcelas sombreadas.
    const leyendaHumedad = () => {
        const control = L.control({ position: "bottomleft" });
        control.onAdd = () => {
            const div = L.DomUtil.create("div", "mapa-leyenda-humedad");
            div.innerHTML = '<b>Humedad del suelo</b>' + __modulo("humedad").leyenda()
                .map(e => `<span><i style="background:${e.color}"></i>${e.texto}</span>`).join("");
            L.DomEvent.disableClickPropagation(div);
            return div;
        };
        control.addTo(map);
    };

    // REQ-052: texto seguro para tooltips del mapa (nombres escritos por el usuario).
    const escaparHtml = (texto) => String(texto == null ? "" : texto)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // REQ-052/064: relleno = humedad del suelo; borde = estado del riego (gris apagado, amarillo sin
    // confirmar, verde encendido confirmado). `riego` es el estado de logic/panel.js o true/false.
    const BORDES_PARCELA = { apagado: "#bdbdbd", pendiente: "#ffd600", encendido: "#00e676" };
    const estiloParcela = (estado, riego) => {
        const clave = riego === true ? "encendido" : (riego === false || !riego ? "apagado" : riego);
        return {
            color: BORDES_PARCELA[clave] || BORDES_PARCELA.apagado,
            weight: clave === "apagado" ? 2 : 4,
            dashArray: clave === "pendiente" ? "8 6" : null,
            fillColor: estado.color,
            fillOpacity: 0.45
        };
    };

    const textoHumedad = (estado) => estado.valor === null
        ? "Humedad: sin dato"
        : `Humedad: <b>${estado.texto}</b> (${estado.valor}${estado.unidad})`;

    // REQ-052: tocar una parcela abre "Editar parcela".
    const abrirEdicionDeParcela = (idx) => {
        $scope.$evalAsync(() => {
            $scope.setEditPlanEstacionario(idx);
            abrirModal("modalEditRiegoEstacionario");
        });
    };

    // REQ-052: tocar el area de un sensor abre "Editar sensor".
    const abrirEdicionDeSensor = (sensor) => {
        $scope.$evalAsync(() => {
            $scope.editSensor(sensor);
            abrirModal("modalEditSensor");
        });
    };

    // REQ-052: areas (poligonos) de los sensores de una red, sombreadas por su humedad.
    const dibujarAreasDeSensores = (campo) => {
        if (!map || campo.type != "Sensor" || !campo.sensors) return;
        const geo = __modulo("geo");
        const humedad = __modulo("humedad");
        humedad.sensoresDeRed(campo).forEach(({ indice, clave, sensor }) => {
            const capa = campo.key + clave;
            if (poligons[capa]) { map.removeLayer(poligons[capa]); delete poligons[capa]; }
            const area = geo.normalizarPoligono(sensor.poligon);
            if (!geo.esPoligonoValido(area)) return;
            const estado = humedad.estadoEnRed(campo, indice);
            poligons[capa] = L.polygon(area, estiloParcela(estado, false));
            poligons[capa].bindTooltip(
                `<b>${escaparHtml(sensor.alias || "Sensor " + (indice + 1))}</b><br>${textoHumedad(estado)}<br><small>Toca para editar</small>`,
                { sticky: true, direction: "top", className: "parcela-tooltip" });
            poligons[capa].on("click", () => abrirEdicionDeSensor(sensor));
            map.addLayer(poligons[capa]);
            poligons[capa].bringToBack();
        });
    };

    rosanautica = () => {
        let north = L.control({ position: "topright" });
        north.onAdd = function (map) {
            var div = L.DomUtil.create("div", "info legend");
            div.innerHTML = '<img src="./assets/images/rosa-nautica.png" style="width: 45px;" alt="norte">';
            return div;
        }
        north.addTo(map);
        // north.addTo(map2);
    }

    addLayers = () => {
        let Satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(map);

        // let Calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        // });

        // let Calles_Terreno = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}', {
        //     attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        //     subdomains: 'abcd',
        //     minZoom: 0,
        //     maxZoom: 15,
        //     ext: 'png'
        // });

        // let Geologico = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
        //     attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
        //     maxZoom: 16
        // });

        // let Flubial = L.tileLayer('http://t{s}.freemap.sk/T/{z}/{x}/{y}.jpeg', {
        //     minZoom: 8,
        //     maxZoom: 16,
        //     subdomains: '1234',
        //     bounds: [
        //         [47.204642, 15.996093],
        //         [49.830896, 22.576904]
        //     ],
        //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, vizualization CC-By-SA 2.0 <a href="http://freemap.sk">Freemap.sk</a>'
        // });

        let baseLayers = {
            // "Calles  ": Calles,
            // "Calles y terreno": Calles_Terreno,
            "Satélite": Satelite,
            // "Geológico": Geologico,
            // "Flubial": Flubial
        }

        // L.control.layers(baseLayers).addTo(map);

    }

    const initializeSystemMap = (system) => {
        if (system.latitude != "NaN" && system.longitude != "NaN") {
            let coord = [system.latitude, system.longitude];
            map.setView(coord, 16);
            //geoLocation(system.key);
            addMarker(system);
            addShape(system);
        }
    }

    const addMarker = (campo) => {
        let coord = [campo.latitude, campo.longitude];
        let greenIcon = getMarkerIcon("");

        if (marker[campo.key]) {
            marker[campo.key].setLatLng(coord);
            marker[campo.key].setPopupContent(getMarkerText(campo));
            refreshSensorMapContent(campo);
            dibujarAreasDeSensores(campo);
            return;
        }

        if (!marker[campo.key]) {
            marker[campo.key] = L.marker(coord, { icon: greenIcon });
            map.addLayer(marker[campo.key]);

            if (campo.type == "Sensor") { 
                greenIcon = getMarkerIcon(campo.type);
                for (let i = 0; i < campo.sensors.sensorNumber; i++) {
                    let sensorId = "S" + i;
                    let sensor = campo.sensors[sensorId];
                    if (sensor.latitude && sensor.longitude) {
                        let sensorCoord = [sensor.latitude, sensor.longitude];

                        marker[sensor.id] = L.marker(sensorCoord, { icon: greenIcon });
                        map.addLayer(marker[sensor.id]);

                        // REQ-066: sin tarjeta fija sobre cada sensor (tapaba el mapa); al tocar el marcador
                        // se abre su ficha, como antes. Los valores estan tambien en la vista de tarjetas.
                        // Popup adicional (cuando se hace clic)
                        marker[sensor.id].bindPopup(() => {
                            const popupContent = document.createElement('div');
                            popupContent.style.width = '240px';
                            popupContent.innerHTML = getSensorText(campo, sensor, i);
                            // setTimeout(() => { 
                            //     $scope.setChart(i); 
                            // }, 0);
                            return popupContent;
                        });

                        marker[sensor.id].on("popupopen", () => {
                            document.getElementById(`btnHome${i}`).addEventListener("click", () => {
                                showPopupChart("Home", i);
                            });
                            document.getElementById(`btnMs${i}`).addEventListener("click", () => {
                                showPopupChart("Ms", i);
                            });
                            document.getElementById(`btnT${i}`).addEventListener("click", () => {
                                showPopupChart("T", i);
                            });
                            document.getElementById(`btnHr${i}`).addEventListener("click", () => {
                                showPopupChart("Hr", i);
                            });
                            document.getElementById(`btnHf${i}`).addEventListener("click", () => {
                                showPopupChart("Hf", i);
                            });
                            document.getElementById(`btnIndicaciones${i}`).addEventListener("click", () => {
                                showPopupChart("Indicaciones", i);
                            });
                        });
                    }
                }
            }
        }
        let text = getMarkerText(campo);
        marker[campo.key].bindPopup(text);
        dibujarAreasDeSensores(campo);
    };

    const refreshSensorMapContent = (campo) => {
        if (campo.type != "Sensor" || !campo.sensors) return;

        for (let i = 0; i < campo.sensors.sensorNumber; i++) {
            const sensor = campo.sensors["S" + i];
            if (!sensor || !marker[sensor.id]) continue;

            const sensorMarker = marker[sensor.id];
            if (sensor.latitude && sensor.longitude) {
                sensorMarker.setLatLng([sensor.latitude, sensor.longitude]);
            }


            const popupContent = document.createElement("div");
            popupContent.style.width = "240px";
            popupContent.innerHTML = getSensorText(campo, sensor, i);

            const popup = sensorMarker.getPopup();
            if (popup) {
                popup.setContent(popupContent);
                if (sensorMarker.isPopupOpen()) {
                    popup.update();
                    setTimeout(() => bindSensorPopupActions(i), 0);
                }
            }
        }
    };

    const bindSensorPopupActions = (index) => {
        ["Home", "Ms", "T", "Hr", "Hf", "Indicaciones"].forEach(action => {
            const button = document.getElementById(`btn${action}${index}`);
            if (button) button.onclick = () => showPopupChart(action, index);
        });
    };

    const getMarkerIcon = (deviceType) => {
        let icon = "./assets/images/marcador.png";
        switch (deviceType) {
            case "PC":
                icon = "./assets/images/marcador.png";
                break;
            case "PL":
                icon = "./assets/images/marcador.png";
                break;
            case "Sensor":
                icon = "./assets/images/marcador_sensor.png";
                return L.icon({
                    iconUrl: icon,
                    shadowUrl: '',
                    iconSize: [20, 20],       // tamaño del icono
                    shadowSize: [20, 20],     // opcional, ajusta si usas sombra
                    iconAnchor: [10, 20],     // punto del icono que corresponde a la ubicación
                    shadowAnchor: [10, 20],   // ajusta si usas sombra
                    popupAnchor: [0, -20]     // punto desde el cual se abre el popup
                });
        }
        return L.icon({
            iconUrl: icon,
            shadowUrl: '',
            iconSize: [50, 50],       // tamaño del icono
            shadowSize: [50, 50],     // opcional, ajusta si usas sombra
            iconAnchor: [25, 50],     // punto del icono que corresponde a la ubicación
            shadowAnchor: [25, 50],   // ajusta si usas sombra
            popupAnchor: [0, -50]     // punto desde el cual se abre el popup
        });
    }

    const getMarkerText = (campo) => {
        const drivingUrl = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${campo.latitude.toFixed(5)},${campo.longitude.toFixed(5)}&travelmode=driving`;
        const walkingUrl = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${campo.latitude.toFixed(5)},${campo.longitude.toFixed(5)}&travelmode=walking`;
        let label = campo.type == 'Sensor' ? "Sensores" : "Planes";

        let text = ``;
        text += `<div style="padding: 5px 10px;">`;
        text += `    <div class="row" style="margin-bottom: 5px;">`;
        text += `        <div class="col s12">`;
        text += `            <i class="material-icons">golf_course</i>`;
        text += `            <b><span style="font-size: 1.4em;">${campo.name ?? "" }</span></b>`;
        text += `        </div>`;
        text += `        <div class="col s12"><hr></div>`;
        text += `        <div class="col s12" style="border-radius: 10px; background: #f5f5f5; color: #434343;">`;
        text += `           <table>`;
        text += `               <tr>`;
        text += `                   <td class="modal-trigger" href="#modalHistorial" style="text-align: center; cursor: pointer;">`;
        text += `                       <div class="center-align" style="margin-top: -5px;" ng-show="authUser &amp;&amp; selectedWindow == 'sistema'">`;
        text += `                           <i class="material-icons" style="font-size: 2em;">equalizer</i> `;
        text += `                       </div>`;
        text += `                       <div class="center-align" style="margin-top: -5px;" style="margin-top: -5px;">`;
        text += `                           <b>Historial</b>`;
        text += `                       </div>`;
        text += `                   </td>`;
        text += `                   <td class="modal-trigger" href="#modalConfig" style="text-align: center; cursor: pointer;">`;
        text += `                       <div class="center-align" ng-show="authUser &amp;&amp; selectedWindow == 'sistema'">`;
        text += `                           <i class="fa fa-list" aria-hidden="true" style="font-size: 1.5em;"></i>`;
        text += `                       </div>                                                    `;
        text += `                       <div class="center-align">`;
        text += `                           <b>${label}</b>`;
        text += `                       </div>`;
        text += `                   </td>`;
        text += `                   <td class="modal-trigger" href="#modalUsuarios" style="text-align: center; cursor: pointer;">`;
        text += `                       <div class="center-align" ng-show="authUser &amp;&amp; selectedWindow == 'sistema'">`;
        text += `                           <i class="fa fa-users" aria-hidden="true" style="font-size: 1.5em;"></i> `;
        text += `                       </div>`;
        text += `                       <div class="center-align">`;
        text += `                           <b>Usuarios</b>`;
        text += `                       </div>`;
        text += `                   </td>`;
        text += `                   <td style="text-align: center; cursor: pointer;">`;
        text += `                       <a href="${drivingUrl}" target="_blank" style="margin-top: -5px; color: #434343">`;
        text += `                           <div class="center-align" ng-show="authUser &amp;&amp; selectedWindow == 'sistema'">`;
        text += `                               <i class="material-icons Small">directions</i>`;
        text += `                           </div>`;
        text += `                           <div class="center-align" style="margin-top: -7px">`;
        text += `                               <b>Ir</b>`;
        text += `                           </div>`;
        text += `                       </a>`;
        text += `                   </td>`;
        text += `               </tr>`;
        text += `           </table>`;
        text += `        </div>`;
        text += `    </div>`;
        text += `</div>`;
        return text;
    }

    const setSensorList = (campo) => {
    }

    const getSensorText = (campo, sensor, idx) => {
        const drivingUrl = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${sensor.latitude},${sensor.longitude}&travelmode=driving`;
        const walkingUrl = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${sensor.latitude},${sensor.longitude}&travelmode=walking`;

        let data = campo.log ? JSON.parse(campo.log.dataRaw) : [];
        let text = ``;
        text += `<div style="padding: 5px 10px;">`;
        text += `    <div class="row" style="margin-bottom: 5px;">`;
        text += `        <div class="col s12">`;
        text += `            <i class="material-icons">place</i>`;
        text += `            <b><span style="font-size: 1.4em;">${ sensor.alias ? sensor.alias : sensor.id }</span></b>`;
        text += `        </div>`;
        text += `    </div>`;
        text += `    <div id="showPopupGraphics" style="display:none;">`;
        text += `       <div class="row" style="margin-bottom: 5px;">`;
        text += `           <div class="col s12" style="border-bottom: 1px solid #ccc;">`;
        text += `               <b><span style="font-size: 1.2em; color: gray;">Gráficas</span></b>`;
        text += `           </div>`;
        text += `           <div class="col s12" style="height: 250px !important;">`;
        text += `               <canvas id="myChart${idx}"></canvas>`;
        text += `           </div>`;
        text += `       </div>`;
        text += `    </div>`;

        // Suelo

        text += `    <div id="showPopupSueloClima" style="display: block;">`;
        text += `       <div class="row" style="margin-bottom: 5px; border-bottom: 1px solid #ccc;">`;
        text += `           <div class="col s12">`;
        text += `               <b><span style="font-size: 1.2em; color: gray;">Suelo</span></b>`;
        text += `           </div>`;
        text += `       </div>`;
        text += `       <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 3px; background-color: #f5f5f5;">`;
        text += `           <div class="col s2"><img src="./assets/images/Hr.png" alt="Agua" style="width: 30px;"></div>`;
        text += `           <div class="col s7">`;
        text += `              <div>Humedad (%)</div>`;
        text += `              <div style="width: 100%; background-color: lightgrey; height: 6px; border-radius: 3px;">`;
        text += `                  <div style="background-color: ` + ($scope.isOutOfRange(data[idx * 8], sensor.h.minValue, sensor.h.maxValue) ? `red` : `green`) + `; width: ` + parseFloat(data[idx * 8]) + `%; height: 6px; border-radius: 3px;"></div>`;
        text += `                  <span style="font-size: .8em; margin-left: ` + (sensor.h.minValue < 10 ? 3 : 10) + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i><b>${sensor.h.minValue ?? ''}</b></span>`;
        text += `                  <span style="font-size: .8em; margin-left: ` + (sensor.h.maxValue - sensor.h.minValue - 20) + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i><b>${sensor.h.maxValue ?? ''}</b></span>`;
        text += `              </div>`;
        text += `           </div>`;
        text += `           <div class="col s3" style="text-align: right; padding-top: 7px; font-size: 1.5em; color: ` + ($scope.isOutOfRange(data[idx * 8], sensor.h.minValue, sensor.h.maxValue) ? `red` : `green`) + `;"><b>${data[idx * 8] !== "NaN" ? parseFloat(data[idx * 8]).toFixed(0) : "--"}</b></div>`;
        text += `       </div>`;

        // Clima
        
        text += `       <div class="row" style="margin-bottom: 5px; border-bottom: 1px solid #ccc;">`;
        text += `           <div class="col s12">`;
        text += `               <b><span style="font-size: 1.2em; color: gray;">Clima</span></b>`;
        text += `           </div>`;
        text += `       </div>`;
        text += `       <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 6px; background-color: #f5f5f5;">`;
        text += `           <div class="col s2"><img src="./assets/images/termometro.png" alt="Termometro" style="width: 30px;"></div>`;
        text += `           <div class="col s7">`;
        text += `              <div style="font-size: .99em;">Temperatura (°C/°F)</div>`;
        text += `              <div style="width: 100%; background-color: lightgrey; height: 6px; border-radius: 3px;">`;
        text += `                  <div style="background-color: ` + ($scope.isOutOfRange(data[idx * 8 + 4], sensor.t.minValue, sensor.t.maxValue) ? `red` : `green`) + `; width: ` + (parseFloat(data[idx * 8 + 4]) < 10 ? parseFloat(data[idx * 8 + 4]) + 5 : parseFloat(data[idx * 8 + 4])) + `%; height: 6px; border-radius: 3px;"></div>`;
        text += `                  <span style="font-size: .8em; margin-left: ` + (sensor.t.minValue > 10 ? 3 : 10) + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i><b>${sensor.t.minValue ?? ''}</b></span>`;
        text += `                  <span style="font-size: .8em; margin-left: ` + (sensor.t.maxValue - sensor.t.minValue - 20) + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i><b>${sensor.t.maxValue ?? ''}</b></span>`;
        text += `              </div>`;
        text += `           </div>`;
        text += `           <div class="col s3" style="text-align: right; padding-top: 7px; font-size: 1.5em; color: ` + ($scope.isOutOfRange(data[idx * 8 + 4], sensor.t.minValue, sensor.t.maxValue) ? `red` : `green`) + `;"><b>${data[idx * 8 + 4] !== "NaN" ? (parseFloat(data[idx * 8 + 4]).toFixed(0) + "/" + parseFloat(data[idx * 8 + 4] * 1.8 + 32).toFixed(0)) : "--"}</b></div>`;
        text += `       </div>`;
        text += `       <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 6px; background-color: #f5f5f5;">`;
        text += `           <div class="col s2"><img src="./assets/images/agua.png" alt="Termometro" style="width: 25px;"></div>`;
        text += `           <div class="col s7">`;
        text += `              <div style="margin-top: 5px;">Humedad (%)</div>`;
        text += `           </div>`;
        text += `           <div class="col s3" style="text-align: right; padding-top: 2px; font-size: 1.5em;"><b>${data[idx * 8 + 1] !== "NaN" ? parseFloat(data[idx * 8 + 1]).toFixed(0) : "--"}</b></div>`;
        text += `       </div>`;
        text += `    </div>`;

        // Cultivo

        text += `    <div id="showPupupCultivo" style="display: none;">`;
        text += `       <div class="row" style="margin-bottom: 5px; border-bottom: 1px solid #ccc;">`;
        text += `           <div class="col s12">`;
        text += `               <b><span style="font-size: 1.2em; color: gray;">Cultivo</span></b>`;
        text += `           </div>`;
        text += `       </div>`;
        text += `       <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 6px; background-color: #f5f5f5;">`;
        text += `           <div class="col s2"><img src="./assets/images/nieve.png" alt="Horas frío" style="width: 25px;"></div>`;
        text += `           <div class="col s7">`;
        text += `              <div style="margin-top: 5px;">Horas frío (u)</div>`;
        text += `           </div>`;
        text += `           <div class="col s3" style="text-align: right; padding-top: 2px; font-size: 1.5em;"><b>${data[idx * 8 + 6] !== "NaN" ? parseFloat(data[idx * 8 + 6]).toFixed(0) : "--"}</b></div>`;
        text += `       </div>`;
        text += `       <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 6px; background-color: #f5f5f5;">`;
        text += `           <div class="col s2"><img src="./assets/images/ETo.png" alt="Termometro" style="width: 25px;"></div>`;
        text += `           <div class="col s7">`;
        text += `              <div style="margin-top: 5px;">ETc (mm/día)</div>`;
        text += `           </div>`;
        text += `           <div class="col s3" style="text-align: right; padding-top: 2px; font-size: 1.5em;"><b>${data[idx * 8 + 5] !== "NaN" ? parseFloat(data[idx * 8 + 5]).toFixed(0) : "--"}</b></div>`;
        text += `       </div>`;
        text += `       <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 6px; background-color: #f5f5f5;">`;
        text += `           <div class="col s2"><img src="./assets/images/DPV.png" alt="Termometro" style="width: 30px;"></div>`;
        text += `           <div class="col s8">`;
        text += `              <div>DPV (kPa)</div>`;
        text += `              <div style="width: 100%; background-color: lightgrey; height: 6px; border-radius: 3px;">`;
        text += `                  <div style="background-color: ` + ($scope.isOutOfRange(data[idx * 4 + 2], sensor.t.minValue, sensor.t.maxValue) ? `red` : `green`) + `; width: ` + parseFloat(data[idx * 4 + 2]) + `%; height: 6px; border-radius: 3px;"></div>`;
        text += `                  <span style="font-size: .8em; margin-left: ` + sensor.t.minValue + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i><b>${sensor.t.minValue}</b></span>`;
        text += `                  <span style="font-size: .8em; margin-left: ` + (sensor.t.maxValue - sensor.t.minValue - 15) + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i><b>${sensor.t.maxValue}</b></span>`;
        text += `              </div>`;
        text += `           </div>`;
        text += `           <div class="col s2" style="text-align: right; padding-top: 7px; font-size: 1.5em; color: ` + ($scope.isOutOfRange(data[idx * 4 + 2], sensor.t.minValue, sensor.t.maxValue) ? `red` : `green`) + `;"><b>${data[idx * 4 + 2] !== "NaN" ? parseFloat(data[idx * 4 + 2]).toFixed(0) : "--"}</b></div>`;
        text += `       </div>`;
        text += `    </div>`;

        // Indicaciones

        text += `    <div id="showPupupIndicaciones" style="display: none;">`;
        text += `       <div class="row" style="margin-bottom: 5px; border-bottom: 1px solid #ccc;">`;
        text += `           <div class="col s12">`;
        text += `               <b><span style="font-size: 1.2em; color: gray;">Indicaciones</span></b>`;
        text += `           </div>`;
        text += `       </div>`;
        text += `       <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 6px; background-color: #f5f5f5;">`;
        text += `           <div class="col s4"><i class="material-icons Small">directions</i></div>`;
        text += `           <div class="col s4">`;
        text += `               <a href="${walkingUrl}" target="_blank">`;
        text += `                  <i class="material-icons Small">directions_walk</i>`;
        text += `               </a>`;
        text += `           </div>`;
        text += `           <div class="col s4">`;
        text += `               <a href="${drivingUrl}" target="_blank">`;
        text += `                  <i class="material-icons Small">directions_car</i>`; 
        text += `               </a>`;
        text += `           </div>`;
        text += `       </div>`;
        text += `    </div>`;

        // Opciones

        text += `    <div class="row" style="margin-bottom: 5px; border-bottom: 1px solid #ccc;">`;
        text += `        <div class="col s12">`;
        text += `            <b><span style="font-size: 1.2em; color: gray;">Opciones</span></b>`;
        text += `        </div>`;
        text += `    </div>`;
        text += `    <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 6px; background-color: #f5f5f5;">`;
        text += `        <div id="btnHome${idx}" class="col s2 center-align" style="cursor: pointer;"><img src="./assets/images/DTA-Agricola.png" alt="Resumen" style="width: 25px;">Inicio</div>`;
        text += `        <div id="btnMs${idx}" class="col s2 center-align" style="cursor: pointer;"><img src="./assets/images/Hr.png" alt="Humedad del suelo" style="width: 25px;">&nbsp;&nbsp;Hs</div>`;
        text += `        <div id="btnT${idx}" class="col s2 center-align" style="cursor: pointer;"><img src="./assets/images/termometro.png" alt="Temperatura" style="width: 25px;">Temp</div>`;
        text += `        <div id="btnHr${idx}" class="col s2 center-align" style="cursor: pointer;"><img src="./assets/images/agua.png" alt="Humedad relativa" style="width: 25px;">&nbsp;&nbsp;Hr</div>`;
        text += `        <div id="btnHf${idx}" class="col s2 center-align" style="cursor: pointer;"><img src="./assets/images/DPV.png" alt="Horas frío" style="width: 25px;">Cultivo</div>`;
        text += `        <div id="btnIndicaciones${idx}" class="col s2 center-align" style="cursor: pointer;">`;
        text += `           <a href="${drivingUrl}" target="_blank" style="color: #434343;">`;
        text += `               <i class="material-icons Small" style="font-size: 2.5em; margin-top: -5px;">directions</i>&nbsp;&nbsp;&nbsp;Ir`;
        text += `           </a>`;
        text += `        </div>`;
        text += `    </div>`;

        text += `</div>`;
        return text;
    }

    const showPopupChart = (type, idx) => {
        document.getElementById("showPopupSueloClima").style.display = "none";
        document.getElementById("showPupupCultivo").style.display = "none";
        document.getElementById("showPopupGraphics").style.display = "none";
        document.getElementById("showPupupIndicaciones").style.display = "none";
        switch (type) {
            case "Home": 
                document.getElementById("showPopupSueloClima").style.display = "block";
                break;
            case "Ms": 
                document.getElementById("showPopupGraphics").style.display = "block";
                $scope.setChartType('moisture'); 
                $scope.reloadSystemLog($scope.actualSystem.key, 'CICLO', idx, 'myChart' + idx);
                break;
            case "T": 
                document.getElementById("showPopupGraphics").style.display = "block";
                $scope.setChartType('temperature'); 
                $scope.reloadSystemLog($scope.actualSystem.key, 'CICLO', idx, 'myChart' + idx);
                break;
            case "Hr": 
                document.getElementById("showPopupGraphics").style.display = "block";
                $scope.setChartType('humidity'); 
                $scope.reloadSystemLog($scope.actualSystem.key, 'CICLO', idx, 'myChart' + idx);
                break;
            case "Hf": 
                document.getElementById("showPupupCultivo").style.display = "block";
                break;
            case "Indicaciones": 
                // document.getElementById("showPupupIndicaciones").style.display = "block";
                const drivingUrl = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${sensor.latitude},${sensor.longitude}&travelmode=driving`;
                break;
        }
    }

    $scope.isOutOfRange = function(value, min, max) {
        if (value == "NaN") return false;
        const numValue = parseFloat(value);
        return numValue < parseFloat(min) || numValue > parseFloat(max);
    };

    const addShape = (campo) => {
        switch (campo.type) {
            case "PC":
                showPC(campo);
                break;
            case "PL":
                showPL(campo);
                break;
            case "Estacionario":
                showStationary(campo);
        }
    }

    const showPC = (campo) => {
        let radius = campo.length ? parseInt(campo.length) : 50;
        let coord = [campo.latitude, campo.longitude];
        if (campo.plansLength) {
            for (i in campo.plans) {
                if (shape[campo.key + i]) {
                    map.removeLayer(shape[campo.key + i]);
                }
                // if (campo.plans[i].value > 0) {
                shape[campo.key + i] = semiCircle(coord, radius, parseInt(campo.plans[i].starAngle), parseInt(campo.plans[i].endAngle), getRandomColor(campo.plans[i].value));
                shape[campo.key + i].bindPopup("<a class='modal-trigger' href='#modalConfig' style='color: black;'>" + campo.plans[i].value + "% </a>");
                map.addLayer(shape[campo.key + i]);
                // }
            }
        }
        showPCPosition(campo);
    }

    const messageShape = (key) => {
        console.log("clinck en shape: ", key);
    }

    const coordinateFromBearing = (latitude, longitude, bearing, distance) => {
        const earthRadius = 6371000;
        const angularDistance = distance / earthRadius;
        const bearingRadians = bearing * Math.PI / 180;
        const latitudeRadians = latitude * Math.PI / 180;
        const longitudeRadians = longitude * Math.PI / 180;

        const destinationLatitude = Math.asin(
            Math.sin(latitudeRadians) * Math.cos(angularDistance) +
            Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearingRadians)
        );
        const destinationLongitude = longitudeRadians + Math.atan2(
            Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
            Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(destinationLatitude)
        );

        return {
            lat: destinationLatitude * 180 / Math.PI,
            lon: destinationLongitude * 180 / Math.PI
        };
    };

    const showPCPosition = (campo) => {
        if (!campo.log) return;

        const position = Number(campo.log.position);
        const length = Number(campo.length) || 50;
        let endCoordinate = null;

        if (Number.isFinite(position)) {
            endCoordinate = coordinateFromBearing(
                Number(campo.latitude),
                Number(campo.longitude),
                position,
                length
            );
        } else if (campo.log.latitude && campo.log.longitude && campo.log.latitude != "0.00000" && campo.log.longitude != "0.00000") {
            endCoordinate = alcNewCocord(
                Number(campo.latitude),
                Number(campo.longitude),
                Number(campo.log.latitude),
                Number(campo.log.longitude),
                length
            );
        }

        if (endCoordinate) {
            const polygon = [
                [campo.latitude, campo.longitude],
                [endCoordinate.lat, endCoordinate.lon]
            ];
            if (indicator[campo.key]) {
                map.removeLayer(indicator[campo.key]);
            }
            let barColor = campo.status == true || campo.status == 'ON' ? 'blue' : 'black';
            indicator[campo.key]  = L.polygon(polygon, {
                                        color: barColor,    // color de la línea
                                        weight: 8,          // ancho en píxeles (por defecto es 3)
                                        opacity: 0.7        // transparencia
                                    });
            map.addLayer(indicator[campo.key]);
        }
    }

    const distanciaCoord = (lat1, lon1, lat2, lon2) => {       // Distancia en metros
        const R = 6371000; // radio de la Tierra en metros
        const toRad = deg => deg * Math.PI / 180;

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // distancia en metros
    }

    const alcNewCocord = (lat1, lon1, lat2, lon2, dist_esperada) => {    // Calcula nuevo punto si la distancia excede dist_esperada
        const d = distanciaCoord(lat1, lon1, lat2, lon2);

        if (d <= dist_esperada) {
            return { lat: lat2, lon: lon2 }; // no hay ajuste
        }

        // Fracción de la distancia a recorrer
        const frac = dist_esperada / d;

        // Interpolación lineal en coordenadas (aprox válida para distancias cortas)
        const latNueva = lat1 + (lat2 - lat1) * frac;
        const lonNueva = lon1 + (lon2 - lon1) * frac;

        return { lat: latNueva, lon: lonNueva };
    }

    const showPL = (campo) => { }

    const showStationary = (campo) => {
        if (campo.plots) {
            for (let i = 0; i < 7; i++) {
                let idx = "p" + i;
                if (campo.plots[idx].poligon) {
                    let newPoligon = campo.plots[idx].poligon;
                    if (poligons[campo.key + idx]) {
                        map.removeLayer(poligons[campo.key + idx]);
                    }
                    // REQ-052: relleno por humedad del suelo (sensor asociado), borde verde si se esta regando;
                    // tocar la parcela abre "Editar parcela".
                    const estado = __modulo("humedad").estadoDeParcela(campo.plots[idx], $scope.systems);
                    const riego = __modulo("panel").estadoParcela(campo, idx);
                    const parcela = campo.plots[idx];
                    poligons[campo.key + idx] = L.polygon(newPoligon, estiloParcela(estado, riego));
                    poligons[campo.key + idx].bindTooltip(
                        `<b>${escaparHtml(parcela.name || "Parcela " + (i + 1))}</b>` +
                        (parcela.culture ? `<br>Cultivo: ${escaparHtml(parcela.culture)}` : "") +
                        `<br>${textoHumedad(estado)}` +
                        (riego === "encendido" ? "<br><b>Regando</b>" : riego === "pendiente" ? "<br><b>Esperando confirmación del equipo</b>" : "") +
                        `<br><small>Toca para editar</small>`,
                        { sticky: true, direction: "top", className: "parcela-tooltip" });
                    poligons[campo.key + idx].on("click", () => abrirEdicionDeParcela(idx));
                    map.addLayer(poligons[campo.key + idx]);
                }
            }
        }
    }

    const semiCircle = (coord, radius, startAngle, stopAngle, color) => {
        let options = {
            startAngle: startAngle,
            stopAngle: stopAngle
        }
        return L.semiCircle(coord, L.extend({
            radius: radius,
            color: color,
            opacity: 0.5,
            renderer: svg,
            weight: 2
        }, options));
    }

    $scope.getColor = (campo, type) => {
        color = type == "fill" ? "lightseagreen" : "green";
        return campo.log && campo.log.voltage == "false" ? 'red' : campo.log && campo.log.safety == "false" ? 'palevioletred' : campo.log.state == "ON" ? color : 'lightgrey';
    }

    const getRandomColor = (value) => {
        let color = "#ff0000";
        if (value > 0) {
            let colors = ["#00FF00", "#82E0AA", "#2ECC71 ", "#28B463", "#239B56", "#1D8348", "#186A3B", "#1E8449", "#196F3D", "#145A32"];
            color = colors[Math.floor(Math.random() * 10)];
            color = "#00FF00";
        }
        return color;
    }

    // #endregion Leaflet

    // #region Chart.js

    const chartZoom = document.querySelector("#chartZoom");

    // chartZoom.addEventListener("change", e => {
    //     $scope.chartItems = parseInt(chartZoom.value);
    //     showChart();
    // });

    $scope.setChart = (chartId, chartLabel = "myChart" + chartId) => {
        let idx = 'S' + chartId;
        const system = $scope.actualSystem;
        const sensor = system && system.sensors ? system.sensors[idx] : null;
        const systemLogs = system && $scope.logs ? $scope.logs[system.key] : null;
        if (!sensor || !systemLogs) {
            console.warn("No hay datos disponibles para dibujar el sensor", idx);
            return;
        }
        let result = getRegisterValues(systemLogs);
        let title = sensor.alias ? sensor.alias : sensor.id;
        let sensorType = sensor.type || (system.type === "Nevera" ? "SHT2" : "");
        let threshold = sensor.t ? sensor.t.minValue : null;
        loadChartWeather(result).then(weatherByDate => {
            switch (sensorType) {
                case "Ms":
                    processResultsFromMsSensors(result, title, chartId, threshold, chartLabel, sensorType, weatherByDate);
                    break;
                case "SHT2":
                    processResultsFromSHT2Sensors(result, title, chartId, threshold, chartLabel, sensorType, weatherByDate);
                    break;
                case "SHT4":
                    processResultsFromSHT4Sensors(result, title, chartId, threshold, chartLabel, sensorType, weatherByDate);
                    break;
                case "WM":
                    processResultsFromWMSensors(result, title, chartId, threshold, chartLabel, sensorType, weatherByDate);
                    break;
                case "Psi":
                    threshold = null;
                    processResultsFromPsiSensors(result, title, chartId, threshold, chartLabel, sensorType, weatherByDate);
                    break;
            }
        });
    }

    const getLogDateKey = log => log && log.date ? log.date.substring(0, 8) : null;

    const getOpenWeatherIconFromWmo = code => {
        if (code === 0) return "01d";
        if (code === 1) return "02d";
        if (code === 2) return "03d";
        if (code === 3) return "04d";
        if (code === 45 || code === 48) return "50d";
        if (code >= 51 && code <= 57) return "09d";
        if (code >= 61 && code <= 67) return "10d";
        if (code >= 71 && code <= 77) return "13d";
        if (code >= 80 && code <= 82) return "09d";
        if (code >= 85 && code <= 86) return "13d";
        if (code >= 95 && code <= 99) return "11d";
        return "03d";
    };

    const formatWeatherDate = dateKey =>
        `${dateKey.substring(0, 4)}-${dateKey.substring(4, 6)}-${dateKey.substring(6, 8)}`;

    const loadChartWeather = logs => {
        const system = $scope.actualSystem;
        if (!system || system.type !== "Sensor" || !system.latitude || !system.longitude) {
            return Promise.resolve({});
        }

        const dates = [...new Set(logs.map(getLogDateKey).filter(Boolean))].sort();
        const coordinates = `${system.latitude},${system.longitude}`;
        const weatherByDate = {};
        const now = new Date();
        const todayKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const currentCondition = $scope.meteo[system.key]?.weather?.[0];
        if (dates.includes(todayKey) && currentCondition) {
            const currentWeather = {
                icon: currentCondition.icon,
                description: currentCondition.description,
                iconUrl: `${OPENWEATHER_ICON_URL}/${currentCondition.icon}.png`
            };
            historicalWeatherCache.set(`${coordinates},${todayKey}`, currentWeather);
            weatherByDate[todayKey] = currentWeather;
        }
        const missingDates = dates.filter(dateKey => {
            const cacheKey = `${coordinates},${dateKey}`;
            if (!historicalWeatherCache.has(cacheKey)) return true;
            const cachedWeather = historicalWeatherCache.get(cacheKey);
            if (cachedWeather) weatherByDate[dateKey] = cachedWeather;
            return false;
        });
        if (!missingDates.length) return Promise.resolve(weatherByDate);

        return new Promise(resolve => {
            $.ajax({
                url: `https://archive-api.open-meteo.com/v1/archive?latitude=${system.latitude}&longitude=${system.longitude}&start_date=${formatWeatherDate(missingDates[0])}&end_date=${formatWeatherDate(missingDates[missingDates.length - 1])}&daily=weather_code&timezone=auto`,
                success: result => {
                    const resultDates = result && result.daily ? result.daily.time || [] : [];
                    const resultCodes = result && result.daily ? result.daily.weather_code || [] : [];
                    resultDates.forEach((date, index) => {
                        const dateKey = date.replaceAll("-", "");
                        const icon = getOpenWeatherIconFromWmo(resultCodes[index]);
                        const weather = {
                            icon,
                            description: `Código meteorológico ${resultCodes[index]}`,
                            iconUrl: `${OPENWEATHER_ICON_URL}/${icon}.png`
                        };
                        historicalWeatherCache.set(`${coordinates},${dateKey}`, weather);
                        if (dates.includes(dateKey)) weatherByDate[dateKey] = weather;
                    });
                    missingDates.forEach(dateKey => {
                        const cacheKey = `${coordinates},${dateKey}`;
                        if (!historicalWeatherCache.has(cacheKey)) historicalWeatherCache.set(cacheKey, null);
                    });
                    resolve(weatherByDate);
                },
                error: error => {
                    console.error("No fue posible cargar el clima histórico de la gráfica:", error);
                    resolve(weatherByDate);
                }
            });
        });
    };

    getRegisterValues = (items) => {
        let result = [];
        for (let element in items) {
            result.push(items[element]);
        }
        if ($scope.actualSystem?.type === "Nevera" &&
            $scope.selectedTimeOption === "DIA" && result.length) {
            const latestDate = result
                .map(item => item?.date?.substring(0, 8))
                .filter(Boolean)
                .sort()
                .pop();
            if (latestDate) {
                result = result.filter(item => item?.date?.substring(0, 8) === latestDate);
            }
        }
        return result;
    }

    const processResultsFromMsSensors = (result, title, i, threshold, chartLabel, sensorType, weatherByDate) => {
        const items = result[0] ? JSON.parse(result[0].dataRaw).length : 0;
        let labels = [];
        let moisture = [];
        let temperature = [];
        lastDate = "";
        let idx = 'S' + i;
        getStValues(idx);
        let min = $scope.actualSystem.sensors[idx].minValue;
        let max = $scope.actualSystem.sensors[idx].maxValue;
        moisture = [];
        temperature = [];
        result.forEach(element => {
            let dataValue = JSON.parse(element.dataRaw)[i];
            let value = dataValue != -99.00 ? 100 - ((dataValue - min) / (max - min) * 100) : "";
            moisture.push(value < 0 ? 0 : value > 100 ? 100 : value);
            date = element.date.substr(6, 2) + "/" + element.date.substr(4, 2);
            if (lastDate != date) {
                lastDate = date;
            } else {
                date = "";
            }
            labels.push(date + " " + element.date.substr(9, 14));
        });
        // Código original modificado: ahora pasa $scope.chartType como parámetro
        chart(moisture, [], [], [], temperature, labels, title, i, threshold, chartLabel, $scope.chartType, sensorType, result, weatherByDate);
    }

    const getStValues = (idx) => {
        let deltaVal = $scope.actualSystem.sensors[idx].maxValue - $scope.actualSystem.sensors[idx].minValue;
        let meanVal  = 100 - (($scope.actualSystem.log.meanVal - $scope.actualSystem.sensors[idx].minValue) / deltaVal * 100);
        let minVal   = 100 - (($scope.actualSystem.log.minVal - $scope.actualSystem.sensors[idx].minValue) / deltaVal * 100);
        let maxVal   = 100 - (($scope.actualSystem.log.maxVal - $scope.actualSystem.sensors[idx].minValue) / deltaVal * 100);
        $scope.actualSystem.log["meanValue"] = meanVal < 0 ? 0 : meanVal > 100 ? 100 : meanVal;
        $scope.actualSystem.log["minValue"]  = minVal < 0 ? 0 : minVal > 100 ? 100 : minVal;
        $scope.actualSystem.log["maxValue"]  = maxVal < 0 ? 0 : maxVal > 100 ? 100 : maxVal;
    }

    const processResultsFromSHT2Sensors = (result, title, i, threshold, chartLabel, sensorType, weatherByDate) => {
        const items = result[0] ? parseInt(JSON.parse(result[0].dataRaw).length / 3) : 0;
        let labels = [];
        let moisture = [];
        let humidity = [];
        let temperature = [];
        let temp_min = [];
        let temp_max = [];
        lastDate = "";
        result.forEach(element => {
            let data = JSON.parse(element.dataRaw);
            humidity.push(data[i * 3]);
            temperature.push(data[i * 3 + 1]);
            date = element.date.substr(6, 2) + "/" + element.date.substr(4, 2);
            if (lastDate != date) {
                lastDate = date;
            } else {
                date = "";
            }
            labels.push($scope.selectedTimeOption === 'DIA'
                ? element.date.substr(9, 14)
                : date);
        });
        // chart(moisture, humidity, temperature, labels, title, i, threshold, chartLabel, $scope.chartType);
        chart(moisture, humidity, temp_min, temp_max, temperature, labels, title, i, threshold, chartLabel, $scope.chartType, "SHT2", result, weatherByDate);
    }

    const processResultsFromSHT4Sensors = (result, title, i, threshold, chartLabel, sensorType, weatherByDate) => {
        const items = result[0] ? parseInt(JSON.parse(result[0].dataRaw).length / 8) : 0;
        let labels = [];
        let moisture = [];
        let humidity = [];
        let temp_min = [];
        let temp_max = [];
        let temperature = [];
        lastDate = "";
        result.forEach(element => {
            let data = JSON.parse(element.dataRaw);
            moisture.push(data[i * 8] != "NaN" ? parseFloat(data[i * 8]) : null);
            humidity.push(data[i * 8 + 1] != "NaN" ? parseFloat(data[i * 8 + 1]) : null);
            temp_min.push(data[i * 8 + 2] != "NaN" ? parseFloat(data[i * 8 + 2]) : null);
            temp_max.push(data[i * 8 + 3] != "NaN" ? parseFloat(data[i * 8 + 3]) : null);
            temperature.push(data[i * 8 + 4] != "NaN" ? parseFloat(data[i * 8 + 4]) : null);
            date = element.date.substr(6, 2) + "/" + element.date.substr(4, 2);
            if (lastDate != date) {
                lastDate = date;
            } else {
                date = "";
            }
            labels.push(($scope.selectedTimeOption != 'DIA' ? date : '') + " " + ($scope.selectedTimeOption == 'DIA' ? element.date.substr(9, 14) : ''));
        });
        chart(moisture, humidity, temp_min, temp_max, temperature, labels, title, i, threshold, chartLabel, $scope.chartType, sensorType, result, weatherByDate);
    }

    function mapping(value, inMin, inMax, outMin, outMax) {
        // Extraido a assets/js/logic/formulas.js (REQ-001..003). Delegacion 1:1.
        return __modulo("formulas").mapping(value, inMin, inMax, outMin, outMax);
    }

    function constraining(value, min, max) {
        // Extraido a assets/js/logic/formulas.js (REQ-001..003). Delegacion 1:1.
        return __modulo("formulas").constraining(value, min, max);
    }

    // Conversión de cb a % humedad
    function cbToPercent(cbValue) {
        // Extraido a assets/js/logic/formulas.js (REQ-001..003). Delegacion 1:1.
        return __modulo("formulas").cbToPercent(cbValue);
    }

    const processResultsFromWMSensors = (result, title, i, threshold, chartLabel, sensorType, weatherByDate) => {
        const items = result[0] ? parseInt(JSON.parse(result[0].dataRaw).length / 8) : 0;
        let labels = [];
        let moisture = [];
        let humidity = [];
        let temp_min = [];
        let temp_max = [];
        let temperature = [];
        lastDate = "";
        result.forEach(element => {
            let data = JSON.parse(element.dataRaw);
           
            let cbValue = data[i * 8] != "NaN" ? parseFloat(data[i * 8]) : null;    // Lectura cruda en cb
            let moisturePercent = cbToPercent(cbValue);                             // Normalización a 0–100 %
            moisture.push(moisturePercent);
            humidity.push(data[i * 8 + 1] != "NaN" ? parseFloat(data[i * 8 + 1]) : null);
            temp_min.push(data[i * 8 + 2] != "NaN" ? parseFloat(data[i * 8 + 2]) : null);
            temp_max.push(data[i * 8 + 3] != "NaN" ? parseFloat(data[i * 8 + 3]) : null);
            temperature.push(data[i * 8 + 4] != "NaN" ? parseFloat(data[i * 8 + 4]) : null);
            date = element.date.substr(6, 2) + "/" + element.date.substr(4, 2);
            if (lastDate != date) {
                lastDate = date;
            } else {
                date = "";
            }
            labels.push(($scope.selectedTimeOption != 'DIA' ? date : '') + " " + ($scope.selectedTimeOption == 'DIA' ? element.date.substr(9, 14) : ''));
        });
        chart(moisture, humidity, temp_min, temp_max, temperature, labels, title, i, threshold, chartLabel, $scope.chartType, sensorType, result, weatherByDate);
    }

    const processResultsFromPsiSensors = (result, title, i, threshold, chartLabel, sensorType, weatherByDate) => {
        const items = result[0] ? parseInt(JSON.parse(result[0].dataRaw).length / 8) : 0;
        let labels = [];
        let moisture = [];
        lastDate = "";
        result.forEach(element => {
            let data = JSON.parse(element.dataRaw);
            moisture.push(data[i * 8] != "NaN" ? parseFloat(data[i * 8]) : null);
            date = element.date.substr(6, 2) + "/" + element.date.substr(4, 2);
            if (lastDate != date) {
                lastDate = date;
            } else {
                date = "";
            }
            labels.push(($scope.selectedTimeOption != 'DIA' ? date : '') + " " + ($scope.selectedTimeOption == 'DIA' ? element.date.substr(9, 14) : ''));
        });
        chart(moisture, [], [], [], [], labels, title, i, threshold, chartLabel, $scope.chartType, "Psi", result, weatherByDate);
    }

    const weatherIconImages = new Map();

    const getChartWeatherIcons = (logs, weatherByDate) => {
        const usedDates = new Set();
        return logs.reduce((icons, log, index) => {
            const dateKey = getLogDateKey(log);
            const weather = weatherByDate[dateKey];
            if (!dateKey || !weather || usedDates.has(dateKey)) return icons;

            usedDates.add(dateKey);
            icons.push({ index, ...weather });
            return icons;
        }, []);
    };

    const chartWeatherPlugin = {
        id: "chartWeather",
        afterDraw(chartInstance, args, options) {
            const icons = options && options.icons ? options.icons : [];
            const xScale = chartInstance.scales.x;
            if (!xScale || !icons.length) return;

            const size = 28;
            const minimumSpacing = size + 6;
            const leftLimit = chartInstance.chartArea.left + size / 2;
            const rightLimit = chartInstance.chartArea.right - size / 2;
            const visibleIcons = icons
                .map(weather => ({
                    ...weather,
                    centerX: xScale.getPixelForValue(weather.index)
                }))
                .filter(weather => weather.centerX >= leftLimit && weather.centerX <= rightLimit)
                .sort((first, second) => first.centerX - second.centerX);

            const displayedIcons = [];
            visibleIcons.forEach(weather => {
                const previous = displayedIcons[displayedIcons.length - 1];
                if (!previous || weather.centerX - previous.centerX >= minimumSpacing) {
                    displayedIcons.push(weather);
                }
            });

            // Conservar el estado del último día visible cuando haya espacio;
            // si no, reemplazar el último icono sin provocar solapamiento.
            const lastVisible = visibleIcons[visibleIcons.length - 1];
            const lastDisplayed = displayedIcons[displayedIcons.length - 1];
            if (lastVisible && lastDisplayed !== lastVisible) {
                const previous = displayedIcons[displayedIcons.length - 2];
                if (!previous || lastVisible.centerX - previous.centerX >= minimumSpacing) {
                    displayedIcons[displayedIcons.length - 1] = lastVisible;
                }
            }

            displayedIcons.forEach(weather => {
                let image = weatherIconImages.get(weather.iconUrl);
                if (!image) {
                    image = new Image();
                    image.src = weather.iconUrl;
                    image.onload = () => chartInstance.draw();
                    weatherIconImages.set(weather.iconUrl, image);
                }
                if (!image.complete || !image.naturalWidth) return;

                const x = weather.centerX - size / 2;
                const y = chartInstance.chartArea.top - size - 4;
                chartInstance.ctx.drawImage(image, x, y, size, size);
            });
        }
    };

    const chartThresholdBandsPlugin = {
        id: "chartThresholdBands",
        afterDraw(chartInstance, args, options) {
            drawChartBackground(options.threshold, chartInstance.canvas, chartInstance,
                options.sensorType, options.chartType, options.sensorIndex);
        }
    };

    // const chart = (moisture, humidity, temperature, labels, title, i, chartLabel, chartType = 'moisture') => {
    // Código original modificado: ahora acepta chartType para mostrar solo un gráfico
    const chart = (moisture, humidity, temp_min, temp_max, temperature, labels, title, i, threshold, chartLabel, chartType = 'moisture', sensorType = '', logs = [], weatherByDate = {}) => {
        try {
            let canvas = document.getElementById(chartLabel);
            if (!canvas) return;
            // La gráfica individual de nevera reutiliza el mismo canvas para
            // S0...S9. Destruir también cualquier instancia anterior asociada
            // al lienzo, aunque pertenezca a otro índice de sensor.
            charts.forEach((chartInstance, chartIndex) => {
                if (chartInstance && chartInstance.canvas === canvas) {
                    chartInstance.destroy();
                    charts[chartIndex] = null;
                }
            });
            if (charts[i]) {
                charts[i].destroy();
                charts[i] = null;
            }
            let type = moisture.length < 14 ? 'bar' : 'line';
            const weatherIcons = getChartWeatherIcons(logs, weatherByDate);
            const scaleValues = chartType === 'temperatureHumidity'
                ? { humidity, temperature: [...temperature, ...temp_min, ...temp_max] }
                : chartType === 'humidity'
                ? humidity
                : chartType === 'temperature'
                    ? [...temperature, ...temp_min, ...temp_max]
                    : moisture;
            const options = getOptions(title, chartType, sensorType, weatherIcons, scaleValues);
            options.plugins.chartThresholdBands = { threshold, sensorType, chartType, sensorIndex: i };
            charts[i] = new Chart(canvas, {
                type: type,
                data: getDataArray(moisture, humidity, temp_min, temp_max, temperature, labels, chartType),
                options,
                plugins: [chartWeatherPlugin, chartThresholdBandsPlugin]
            });
            if (canvas.parentNode) canvas.parentNode.style.height = '250px';    
        } catch (error) {
            console.error('Error al crear el gráfico:', error);
        }
    }

    const getConfiguredRange = (sensorIndex, chartType) => {
        const index = Number(sensorIndex);
        if (!Number.isInteger(index) || index < 0 || index > 9) return null;

        const sensor = $scope.actualSystem?.sensors?.[`S${index}`];
        const settings = chartType === "humidity" ? sensor?.h : sensor?.t;
        const hasMin = settings?.minValue !== null && settings?.minValue !== undefined && settings?.minValue !== "";
        const hasMax = settings?.maxValue !== null && settings?.maxValue !== undefined && settings?.maxValue !== "";
        const min = Number(settings?.minValue);
        const max = Number(settings?.maxValue);

        return hasMin && hasMax && Number.isFinite(min) && Number.isFinite(max) && min < max
            ? { min, max }
            : null;
    };

    const drawNeveraBands = (ctx, chartArea, yScale, chartType, sensorIndex) => {
        const range = getConfiguredRange(sensorIndex, chartType);
        const graphMin = yScale.min;
        const graphMax = yScale.max;
        if (!range) {
            drawBand(ctx, chartArea, yScale, graphMin, graphMax,
                'rgba(128, 128, 128, 0.12)', 'Sin límites configurados', 'rgba(80, 80, 80, 0.9)');
            return;
        }

        const isHumidity = chartType === "humidity";
        drawBand(ctx, chartArea, yScale, graphMin, range.min,
            isHumidity ? 'rgba(255, 193, 7, 0.15)' : 'rgba(0, 123, 255, 0.15)',
            isHumidity ? 'Baja' : 'Temperatura baja',
            isHumidity ? 'rgba(183, 138, 2, 0.9)' : 'rgba(0, 123, 255, 0.9)');
        drawBand(ctx, chartArea, yScale, range.min, range.max,
            'rgba(40, 167, 69, 0.15)', isHumidity ? 'Adecuada' : 'Temperatura normal',
            'rgba(40, 167, 69, 0.9)');
        drawBand(ctx, chartArea, yScale, range.max, graphMax,
            isHumidity ? 'rgba(0, 123, 255, 0.15)' : 'rgba(255, 123, 0, 0.15)',
            isHumidity ? 'Alta' : 'Temperatura alta',
            isHumidity ? 'rgba(0, 123, 255, 0.9)' : 'rgba(255, 13, 0, 0.9)');

        drawThresholdLine(ctx, yScale, "SHT2", chartType, chartArea, range.min,
            'rgba(54, 162, 235, 0.9)', 'Mín');
        drawThresholdLine(ctx, yScale, "SHT2", chartType, chartArea, range.max,
            'rgba(255, 99, 132, 0.9)', 'Máx');
    };

    const drawChartBackground = (threshold, canvas, charts, sensorType, chartType, sensorIndex) => {
        
            // Agregar franjas de humedad para gráficos de humedad del suelo y humedad ambiental
            // if (chartType === 'moisture' || chartType === 'temperature') {
                // console.log('Dibujando franjas para humedad - chartType:', chartType);
                const drawBands = () => {
                    const ctx = canvas.getContext('2d');
                    const chart = charts;
                    if (!chart || !chart.chartArea) {
                        requestAnimationFrame(drawBands);
                        return;
                    }
                    const yScale = chart.scales.y;
                    const chartArea = chart.chartArea;
                    
                    // Dibujar las tres franjas con etiquetas según el tipo de gráfico
                    if ($scope.actualSystem.type === "Nevera" && (chartType === "humidity" || chartType === "temperature")) {
                        drawNeveraBands(ctx, chartArea, yScale, chartType, sensorIndex);
                    } else if (chartType === 'moisture' && sensorType === 'WM') {
                        // Etiquetas para disponibilidad de agua en el suelo
                        drawBand(ctx, chartArea, yScale, 80, 100, 'rgba(0, 123, 255, 0.15)', 'Saturado - No regar', 'rgba(0, 123, 255, 0.9)');
                        drawBand(ctx, chartArea, yScale, 60, 80, 'rgba(40, 167, 69, 0.15)', 'Adecuado - No regar', 'rgba(40, 167, 69, 0.9)');
                        drawBand(ctx, chartArea, yScale, 40, 60, 'rgba(210, 255, 7, 0.15)', 'Secándose - Programar riego', 'rgba(118, 144, 2, 0.9)');
                        drawBand(ctx, chartArea, yScale, 30, 40, 'rgba(255, 193, 7, 0.15)', 'Estrés moderado - Regar', 'rgba(183, 138, 2, 0.9)');
                        drawBand(ctx, chartArea, yScale, 20, 30, 'rgba(255, 106, 7, 0.15)', 'Seco - Regar urgente', 'rgba(255, 106, 7, 0.9)');
                        drawBand(ctx, chartArea, yScale, 0, 20, 'rgba(255, 0, 0, 0.15)', 'Muy seco - Regar inmediatamente', 'rgba(255, 0, 0, 0.9)');
                        // Dibujar línea de umbral de riego
                    } else if (sensorType === 'Psi') {
                        // Etiquetas para temperatura
                        drawBand(ctx, chartArea, yScale, 10, 100, 'rgba(40, 167, 69, 0.15)', 'Encendido', 'rgba(40, 167, 69, 0.9)');
                        drawBand(ctx, chartArea, yScale, 0, 10, 'rgba(255, 123, 0, 0.15)', 'Apagado', 'rgba(255, 13, 0, 0.9)');
                        // Dibujar línea de umbral de helada
                        drawThresholdLine(ctx, yScale, sensorType, chartType, chartArea, 3, 'rgba(255, 13, 0, 0.8)', 'Presión mínima (1psi)');
                    } else if (chartType === 'moisture') {
                        // Etiquetas para humedad del suelo
                        drawBand(ctx, chartArea, yScale, 40, 100, 'rgba(0, 123, 255, 0.15)', 'Saturado', 'rgba(0, 123, 255, 0.9)');
                        drawBand(ctx, chartArea, yScale, 15, 40, 'rgba(40, 167, 69, 0.15)', 'Humedad Adecuada', 'rgba(40, 167, 69, 0.9)');
                        drawBand(ctx, chartArea, yScale, 0, 15, 'rgba(255, 193, 7, 0.15)', 'Necesidad de Riego', 'rgba(255, 131, 7, 0.39)');
                    } else if (chartType === 'humidity') {
                        // Etiquetas para humedad del suelo
                        drawBand(ctx, chartArea, yScale, 60, 100, 'rgba(0, 123, 255, 0.15)', 'Alta', 'rgba(0, 123, 255, 0.9)');
                        drawBand(ctx, chartArea, yScale, 40, 60, 'rgba(40, 167, 69, 0.15)', 'Adecuada', 'rgba(40, 167, 69, 0.9)');
                        drawBand(ctx, chartArea, yScale, 0, 40, 'rgba(255, 193, 7, 0.15)', 'Baja', 'rgba(255, 131, 7, 0.39)');
                    } else if (chartType === 'temperature') {
                        // Etiquetas para temperatura
                        if (sensorType === 'WM' || sensorType === 'SHT4') {
                            drawBand(ctx, chartArea, yScale, 25, 50, 'rgba(255, 123, 0, 0.15)', 'Muy caliente', 'rgba(255, 13, 0, 0.9)');
                            drawBand(ctx, chartArea, yScale, 5, 25, 'rgba(40, 167, 69, 0.15)', 'Temperatura Normal', 'rgba(40, 167, 69, 0.9)');
                            drawBand(ctx, chartArea, yScale, -10, 5, 'rgba(0, 123, 255, 0.15)', 'Helada', 'rgba(0, 123, 255, 0.9)');
                            // Dibujar línea de umbral de helada
                            drawThresholdLine(ctx, yScale, sensorType, chartType, chartArea, threshold, 'rgba(54, 162, 235, 0.8)', 'Umbral Helada');
                        } else if (sensorType === 'SHT2') {
                            drawBand(ctx, chartArea, yScale, 3, 10, 'rgba(255, 123, 0, 0.15)', 'Muy caliente', 'rgba(255, 13, 0, 0.9)');
                            drawBand(ctx, chartArea, yScale, 0, 3, 'rgba(40, 167, 69, 0.15)', 'Normal', 'rgba(40, 167, 69, 0.9)');
                            drawBand(ctx, chartArea, yScale, -5, 0, 'rgba(0, 123, 255, 0.15)', 'Muy Fria', 'rgba(0, 123, 255, 0.9)');
                            // Dibujar línea de umbral de helada
                            drawThresholdLine(ctx, yScale, sensorType, chartType, chartArea, 3, 'rgba(255, 13, 0, 0.8)', 'Tmín');
                            drawThresholdLine(ctx, yScale, sensorType, chartType, chartArea, 0, 'rgba(54, 162, 235, 0.8)', 'Tmáx');
                        }
                    }
                };
                
                drawBands();
            // } else {
            //     // console.log('No se dibujan franjas porque chartType no es moisture ni humidity');
            // }
        
    }

    // Función para dibujar una franja
    const drawBand = (ctx, chartArea, yScale, yMin, yMax, color, label, labelColor) => {
        const visibleMin = Math.max(yScale.min, Number(yMin));
        const visibleMax = Math.min(yScale.max, Number(yMax));
        if (!Number.isFinite(visibleMin) || !Number.isFinite(visibleMax) || visibleMax <= visibleMin) return;

        const yTop = yScale.getPixelForValue(visibleMax);
        const yBottom = yScale.getPixelForValue(visibleMin);
        
        // console.log(`Dibujando franja ${label}: yTop=${yTop}, yBottom=${yBottom}`);
        
        // Dibujar rectángulo de fondo
        ctx.fillStyle = color;
        ctx.fillRect(chartArea.left, yTop, chartArea.width, yBottom - yTop);
        
        // Dibujar etiqueta
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, chartArea.left + 5, yTop + 5);
    };
                        
    // Función para dibujar una línea horizontal de umbral
    const drawThresholdLine = (ctx, yScale, sensorType, chartType, chartArea, thresholdValue, color, label) => {
        thresholdValue = Number(thresholdValue);
        if (!Number.isFinite(thresholdValue) || thresholdValue < yScale.min || thresholdValue > yScale.max) return;
        const yPosition = yScale.getPixelForValue(thresholdValue);
        label = `${label}: ${thresholdValue}${sensorType === 'Psi' ? 'psi' : chartType === 'temperature' ? '°C' : '%'}`;
        
        // console.log(`Dibujando línea umbral ${label}: y=${yPosition}, value=${thresholdValue}`);
        
        // Dibujar línea horizontal discontinua
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, yPosition);
        ctx.lineTo(chartArea.left + chartArea.width, yPosition);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
        
        // Dibujar etiqueta de la línea
        ctx.fillStyle = color;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, chartArea.left + chartArea.width - 5, yPosition - 5);
    };
                        
    const skipped = (ctx, value) => ctx.p0.skip || ctx.p1.skip ? value : undefined;

    const getDataArray = (_moisture, _humidity, _temp_min, _temp_max,  _temperature, _labels, chartType = 'moisture') => {
        // Dataset para moisture con color azul
        let moisture = {
            label: 'Humedad del Suelo',
            data: _moisture,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderWidth: 2,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            type: 'line',
            segment: {
            borderDash: ctx => skipped(ctx, [3, 3]),
            },
            spanGaps: true,
            pointRadius: 0
        }
        // Dataset para humidity con color verde
        let humidity = {
            label: 'Humedad Ambiental',
            data: _humidity,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderWidth: 2,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            type: 'line',
            segment: {
            borderDash: ctx => skipped(ctx, [3, 3]),
            },
            spanGaps: true,
            pointRadius: 0
        }
        // Dataset para temperature con color rojo
        let temperature = {
            label: 'Temperatura Promedio',
            data: _temperature,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderWidth: 2,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            type: 'line',
            segment: {
            borderDash: ctx => skipped(ctx, [3, 3]),
            },
            spanGaps: true,
            pointRadius: 0
        }
        // Dataset para temperatura máxima con color naranja
        let tempMax = {
            label: 'Temperatura Máxima',
            data: _temp_max,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderWidth: 2,
            borderColor: 'rgb(255, 159, 64)',
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            type: 'line',
            segment: {
            borderDash: ctx => skipped(ctx, [3, 3]),
            },
            borderDash: [6, 6],
            spanGaps: true,
            pointRadius: 0
        }
        // Dataset para temperatura mínima con color azul claro
        let tempMin = {
            label: 'Temperatura Mínima',
            data: _temp_min,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderWidth: 2,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            type: 'line',
            segment: {
            borderDash: ctx => skipped(ctx, [3, 3]),
            },
            borderDash: [6, 6],
            spanGaps: true,
            pointRadius: 0
        }
        
        // Retornar solo el dataset seleccionado
        let selectedDatasets;
        switch(chartType) {
            case 'temperatureHumidity':
                temperature.yAxisID = 'y';
                humidity.yAxisID = 'yHumidity';
                selectedDatasets = [temperature, humidity];
                break;
            case 'humidity':
                selectedDatasets = [humidity];
                break;
            case 'temperature':
                selectedDatasets = [temperature, tempMax, tempMin];
                break;
            case 'moisture':
            default:
                selectedDatasets = [moisture];
                break;
        }
        
        return {
            labels: _labels,
            datasets: selectedDatasets
        }
        
        // Código original comentado que retornaba todos los datasets:
        // return {
        //     labels: _labels,
        //     datasets: [moisture, humidity, temperature]
        // }
    }

    // const getOptions = (_title) => {
    // Código original modificado: ahora oculta leyenda y título y acepta chartType para fondo de humedad
    const getDynamicScaleBounds = (values, margin, absoluteMin = null, absoluteMax = null) => {
        const numericValues = values
            .filter(value => value !== null && value !== "" && Number.isFinite(Number(value)))
            .map(Number);
        if (!numericValues.length) return null;

        let min = Math.round(Math.min(...numericValues) - margin);
        let max = Math.round(Math.max(...numericValues) + margin);
        if (absoluteMin !== null) min = Math.max(absoluteMin, min);
        if (absoluteMax !== null) max = Math.min(absoluteMax, max);
        return { min, max };
    };

    const getOptions = (_title, chartType = 'moisture', sensorType, weatherIcons = [], scaleValues = []) => {
        // Definir escalas fijas según el tipo de gráfico
        let yScaleConfig;
        switch(chartType) {
            case 'temperatureHumidity': {
                const combinedTemperatureBounds = getDynamicScaleBounds(scaleValues.temperature || [], 5);
                yScaleConfig = {
                    beginAtZero: false,
                    type: 'linear',
                    position: 'left',
                    min: combinedTemperatureBounds ? combinedTemperatureBounds.min : -5,
                    max: combinedTemperatureBounds ? combinedTemperatureBounds.max : 10,
                    title: { display: true, text: 'Temperatura (°C)' },
                    ticks: { stepSize: 1 }
                };
                break;
            }
            case 'humidity':
                const humidityBounds = $scope.actualSystem.type === "Nevera"
                    ? getDynamicScaleBounds(scaleValues, 10, 0, 100)
                    : null;
                yScaleConfig = {
                    beginAtZero: !humidityBounds,
                    type: 'linear',
                    min: humidityBounds ? humidityBounds.min : 0,
                    max: humidityBounds ? humidityBounds.max : 100,
                    ticks: {
                        stepSize: 10
                    }
                };
                break;
            case 'temperature':
                const temperatureBounds = $scope.actualSystem.type === "Nevera"
                    ? getDynamicScaleBounds(scaleValues, 5)
                    : null;
                yScaleConfig = {
                    beginAtZero: false,
                    type: 'linear',
                    min: temperatureBounds ? temperatureBounds.min : ($scope.actualSystem.type === "Nevera" ? -5 : -10),
                    max: temperatureBounds ? temperatureBounds.max : ($scope.actualSystem.type === "Nevera" ? 10 : 50),
                    ticks: {
                        stepSize: $scope.actualSystem.type == "Nevera" ? 1 : 5
                    }
                };
                break;
            case 'moisture':
                if (sensorType === 'WM') {
                    yScaleConfig =  {
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                // Correspondencia % ↔ cb
                                switch (value) {
                                    case 100: return '0';
                                    case 90:  return '5';
                                    case 80:  return '10';
                                    case 70:  return '20';
                                    case 60:  return '30';
                                    case 50:  return '40';
                                    case 40:  return '60';
                                    case 30:  return '100';
                                    case 20:  return '150';
                                    case 10:  return '200';
                                    case 0:   return '240';
                                    default:  return value; // valor por defecto
                                }
                            }
                        }
                    }
                } else {
                    yScaleConfig = {
                        beginAtZero: true,
                        type: 'linear',
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 10
                        }
                    };
                }
                break;
            default:
                yScaleConfig = {
                    beginAtZero: true,
                    type: 'linear',
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 10
                    }
                };
                break;
        }

        let options = {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: weatherIcons.length ? 34 : 0
                }
            },
            scales: chartType === 'temperatureHumidity' ? {
                y: yScaleConfig,
                yHumidity: {
                    beginAtZero: true,
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 100,
                    title: { display: true, text: 'Humedad (%)' },
                    grid: { drawOnChartArea: false },
                    ticks: { stepSize: 10 }
                }
            } : { y: yScaleConfig },
            onClick: (e) => {
                // This prevents the default behavior of the chart click
                e.stopPropagation();
            },
            plugins: {
                chartWeather: {
                    icons: weatherIcons
                },
                // Código original comentado que mostraba la leyenda con funcionalidad de clic:
                // legend: {
                //     onClick: (e, legendItem, legend) => {
                //         const index = legendItem.datasetIndex;
                //         const ci = legend.chart;
                //         const meta = ci.getDatasetMeta(index);
                //         
                //         // Toggle the visibility of the dataset
                //         meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                //         
                //         // Update the chart
                //         ci.update();
                //     }
                // },
                // Ocultar leyenda
                legend: {
                    display: chartType === 'temperatureHumidity',
                    position: 'top'
                },
                // Código original comentado que mostraba el título:
                // title: {
                //     display: true,
                //     text: _title
                // },
                // Ocultar título
                title: {
                    display: false
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x'
                    },
                    pan: {
                        enabled: true,
                        mode: 'x'
                    }
                }
            }
        };

        return options;
    }

    const filtroPasoBajo = (valores, factorDeSuavizado) => {
        let valorSuavizado = valores[0];
        for (let i = 1; i < valores.length; i++) {
            valorSuavizado = valorSuavizado * factorDeSuavizado + valores[i] * (1 - factorDeSuavizado);
            valores[i] = valorSuavizado;
        }
        return valores;
    }

    const filtrarDatos = (data, iter) => {
        for (let i = 0; i < iter; i++) {
            data = filtroPasoBajo(data, 0.2);
        }
        return data;
    }

    // #endregion Chart.js

    // #region PERFIL (REQ-023: menu de usuario, perfil y planes)

    const reglasPerfil = () => __modulo("perfil");

    $scope.opcionesProblemas = reglasPerfil().OPCIONES.problemas;
    $scope.opcionesInversion = reglasPerfil().OPCIONES.inversion;
    $scope.opcionesDecision = reglasPerfil().OPCIONES.decision;
    $scope.opcionesEntrevista = reglasPerfil().OPCIONES.entrevista;
    $scope.opcionesRol = reglasPerfil().OPCIONES.rol;
    $scope.planes = reglasPerfil().PLANES;
    // Valores definidos desde el arranque: un ng-model undefined en un <select> hace que
    // la directiva select reviente en writeValue (REQ-014) durante el $digest inicial.
    $scope.perfil = reglasPerfil().perfilDesdeUsuario(null, null);
    $scope.problemasSeleccionados = {};
    $scope.planActual = reglasPerfil().planPorId(null);

    const abrirModal = (id) => {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        const modal = M.Modal.getInstance(elemento) || M.Modal.init(elemento);
        modal.open();
    };

    const cerrarModal = (id) => {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        const modal = M.Modal.getInstance(elemento);
        if (modal) modal.close();
    };

    // REQ-036: el menu de usuario vive en el menu lateral; el avatar solo lo abre.

    // Foto de Google: siempre que se pueda, la foto. Si no carga, se reintenta con otra URL de
    // la misma foto; la inicial solo aparece si tambien falla el reintento (y se deja traza).
    $scope.fotoUsuarioFallo = false;
    $scope.marcarFotoFallida = (img) => {
        const original = $scope.authUser && $scope.authUser.photoURL;
        console.warn("[perfil] no cargo la foto:", img && img.src);
        const alternativa = reglasPerfil().fotoAlternativa(original);
        if (img && alternativa && img.dataset.reintento !== "1") {
            img.dataset.reintento = "1";
            img.src = alternativa;
            return;
        }
        $scope.$evalAsync(() => { $scope.fotoUsuarioFallo = true; });
    };

    $scope.inicialDelUsuario = () => {
        const usuario = $scope.authUser || {};
        const texto = String(usuario.displayName || usuario.email || "?").trim();
        return texto ? texto.charAt(0).toUpperCase() : "?";
    };

    // Plan guardado en el perfil, o el gratuito si nunca eligio uno.
    $scope.planDelUsuario = () => reglasPerfil().planPorId($scope.userProfile && $scope.userProfile.plan);


    $scope.abrirPerfil = () => {
        $scope.perfil = reglasPerfil().perfilDesdeUsuario($scope.authUser, $scope.userProfile);
        $scope.problemasSeleccionados = {};
        $scope.perfil.problemas.forEach(nombre => {
            if (nombre.indexOf("Otros:") === 0) {
                $scope.problemasSeleccionados["Otros"] = true;
                $scope.perfil.otrosProblemas = nombre.slice(6).trim();
            } else {
                $scope.problemasSeleccionados[nombre] = true;
            }
        });
        $scope.perfilError = null;
        $scope.perfilGuardando = false;
        abrirModal("modalMiPerfil");
    };

    // REQ-052: fases fenologicas del selector (conserva lo escrito antes como texto libre).
    $scope.fasesConActual = (actual) => __modulo("cultivos").fasesConActual(actual);

    // REQ-057: los paneles de "Sistema" (componentes) piden abrir un modal por su id: dentro de un
    // componente no funciona `modal-trigger` (su plantilla llega despues de M.AutoInit).
    $scope.abrirVentana = (id) => abrirModal(id);

    // REQ-050: Notificaciones como modal (antes una pantalla completa).
    $scope.abrirNotificaciones = () => abrirModal("modalNotificaciones");

    // REQ-050: Ayuda como modal (componente montado con ng-if, como las fichas). La ruta #!/ayuda
    // (showAyuda) tambien lo abre.
    $scope.ayudaAbierta = false;
    $scope.abrirAyuda = () => { $scope.ayudaAbierta = true; };
    $scope.cerrarAyuda = () => { $scope.ayudaAbierta = false; };

    // REQ-050: "Invitar a alguien": valida en el formulario y solo cierra si todo esta bien.
    $scope.newUserRole = $scope.newUserRole || "trabajador";
    $scope.invitacionError = null;
    $scope.invitarUsuario = () => {
        const correo = String($scope.newUserEmail || "").trim();
        if (!__modulo("login").esCorreoValido(correo)) {
            $scope.invitacionError = "Escribe un correo electrónico válido.";
            return false;
        }
        if (!String($scope.newUserName || "").trim()) {
            $scope.invitacionError = "Escribe el nombre de la persona.";
            return false;
        }
        $scope.invitacionError = null;
        $scope.newUserEmail = correo;
        $scope.addNewUserToDevice();
        cerrarModal("modalAddUser");
        $scope.newUserEmail = "";
        $scope.newUserName = "";
        $scope.newUserRole = "trabajador";
        return true;
    };

    // REQ-050: "Programa de riego": errores junto a cada campo; no se cierra hasta que esta completo.
    $scope.periodosPrograma = __modulo("riego").PERIODOS;
    $scope.erroresPrograma = {};
    $scope.confirmarBorradoPrograma = false;
    $scope.hayErroresPrograma = () => Object.keys($scope.erroresPrograma || {}).length > 0;
    $scope.minutosProgramaPorCiclo = () => __modulo("riego").minutosPorCiclo($scope.programaEstacionario);
    $scope.iniciarProgramaDesdeFormulario = () => {
        const errores = __modulo("riego").erroresDelPrograma($scope.programaEstacionario, __modulo("fechas"));
        $scope.erroresPrograma = errores;
        if (Object.keys(errores).length) return false;
        cerrarModal("modalStationaryProgram");
        $scope.startStationaryProgram($scope.programaEstacionario);
        return true;
    };

    // REQ-048: fichas tecnicas en un modal (componente montado con ng-if). Funciones y no asignaciones en
    // la plantilla: asi el valor vive en este scope aunque la etiqueta quede en un scope hijo.
    $scope.fichasAbiertas = false;
    $scope.abrirFichas = () => { $scope.fichasAbiertas = true; };
    $scope.cerrarFichas = () => { $scope.fichasAbiertas = false; };

    // REQ-046: chips de "¿Que problema quieres resolver?" (seleccion multiple).
    $scope.alternarProblema = (opcion) => {
        $scope.problemasSeleccionados = $scope.problemasSeleccionados || {};
        $scope.problemasSeleccionados[opcion] = !$scope.problemasSeleccionados[opcion];
    };

    $scope.guardarPerfil = () => {
        const seleccion = Object.keys($scope.problemasSeleccionados)
            .filter(nombre => $scope.problemasSeleccionados[nombre]);
        const perfil = Object.assign({}, $scope.perfil, {
            problemas: reglasPerfil().combinarProblemas(seleccion, $scope.perfil.otrosProblemas)
        });

        // REQ-045: los errores se muestran dentro del perfil, junto a los campos.
        const errores = reglasPerfil().validarPerfil(perfil);
        if (errores.length) {
            $scope.perfilError = errores.join(" ");
            return Promise.resolve(false);
        }
        if ($scope.perfilGuardando) return Promise.resolve(false);

        // REQ-041 P-1/P-2: solo se confirma (y se cambia el estado local) cuando Firebase lo guarda.
        $scope.perfilError = null;
        $scope.perfilGuardando = true;
        return Promise.resolve(updateUserInfo(convertDotToDash($scope.authUser.email), perfil)).then(() => {
            $scope.$evalAsync(() => {
                $scope.userProfile = perfil;
                $scope.perfilGuardando = false;
                cerrarModal("modalMiPerfil");
            });
            if (typeof M !== "undefined" && M.toast) M.toast({ html: "Perfil guardado", classes: "green darken-2 rounded" });
            return true;
        }).catch(error => {
            console.error("[perfil] no se pudo guardar:", error);
            $scope.$evalAsync(() => {
                $scope.perfilGuardando = false;
                $scope.perfilError = "No se pudo guardar tu perfil. Revisa tu conexión e inténtalo de nuevo.";
            });
            return false;
        });
    };

    $scope.abrirPlanes = () => {
        $scope.planActual = $scope.planDelUsuario();
        abrirModal("modalPlanes");
    };

    $scope.elegirPlan = (id) => {
        const plan = reglasPerfil().planPorId(id);
        $scope.planActual = plan;
        $scope.userProfile = Object.assign({}, $scope.userProfile, { plan: plan.id });
        updateUserInfo(convertDotToDash($scope.authUser.email), { plan: plan.id });
        swal({ title: "Plan seleccionado", text: "Ahora estas en el plan " + plan.nombre + ".", icon: "success" });
    };

    // #endregion PERFIL

    // #region SCRIPTS GENERALES

    $scope.strToInt = (data) => {
        return parseInt(data);
    };

    getDateAndTime = () => {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses son 0-11
        const dia = String(fecha.getDate()).padStart(2, '0');
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        const fechaFormateada = `${año}-${mes}-${dia}`;
        const horaFormateada = `${horas}:${minutos}`;
        return {
            date: fechaFormateada,
            time: horaFormateada
        };
    }

    sumTimes = (time1, time2) => {
        const hour1 = parseInt(time1.split(":")[0]);
        const minutes1 = parseInt(time1.split(":")[1]);
        const hour2 = parseInt(time2.split(":")[0]);
        const minutes2 = parseInt(time2.split(":")[1]);
        let totalHours = hour1 + hour2;
        let totalMinutes = minutes1 + minutes2;
        if (totalMinutes >= 60) {
            totalHours += Math.floor(totalMinutes / 60);
            totalMinutes %= 60;
        }     
        return "" + totalHours + ":" + totalMinutes;   
    }

    $scope.getNumber = function (data) {
        return parseInt(data.day);
    };

    $scope.msToTime = (duration) => {
        if (!duration) { return "00:00:00"; };
        return $scope.getDayFromMs(duration) + ":" + $scope.getHourFromMs(duration) + ":" + $scope.getMinutesFromMs(duration);
    }

    $scope.getDayFromMs = (duration) => {
        let days = parseInt(parseInt(duration) / (1000 * 60 * 60 * 24));
        return String(days).padStart(2, '0');
    }

    $scope.getHourFromMs = (duration) => {
        let hours = parseInt((parseInt(duration) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return String(hours).padStart(2, '0');
    }

    $scope.getMinutesFromMs = (duration) => {
        let minutes = parseInt((parseInt(duration) % (1000 * 60 * 60)) / (1000 * 60));
        return String(minutes).padStart(2, '0');
    }

    $scope.getMsFromDay = (duration) => {
        duration = duration ? parseInt(duration) : 0;
        return duration * 1000 * 60 * 60 * 24;
    }

    $scope.getMsFromHour = (duration) => {
        duration = duration ? parseInt(duration) : 0;
        return duration * 1000 * 60 * 60;
    }

    $scope.getMsFromMinutes = (duration) => {
        duration = duration ? parseInt(duration) : 0;
        return duration * 1000 * 60;
    }

    parseDate = (dateStr) => {
        const year = parseInt(dateStr.slice(0, 4));  // Asume años YYYYMMDD HHmm
        const month = parseInt(dateStr.slice(4, 6)) - 1;    // Los meses en JS son 0-11
        const day = parseInt(dateStr.slice(6, 8));
        const hours = parseInt(dateStr.slice(9, 11));
        const minutes = dateStr.includes(":") ? parseInt(dateStr.slice(12, 14)) : parseInt(dateStr.slice(11, 13));
        return new Date(year, month, day, hours, minutes);
    }
    
    $scope.calculateDifference = (date1Str, date2Str) => {
        const date1 = parseDate(date1Str);
        const date2 = parseDate(date2Str);
        const diffMs = Math.abs(date2 - date1);
    
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
        return `${days > 0 ? days + "d:" : ""}${hours > 0 ? hours + "h:" : ""}${minutes}min`;
    }

    $scope.dashToDot = (input) => {
        return convertDashToDot(input);
    }

    $scope.dotToDash = (input) => {
        return convertDotToDash(input);
    }

    $scope.parseJSON = (strArray) => {
        if (strArray)
            return JSON.parse(strArray);
        return {};
    }

    $scope.getstandarizeValue = (value) => {
        if (value && $scope.actualSystem.sensors) {
            std = standarize(value);
            std = std > 100 ? 100 : std < 0 ? 0 : std;
            return 100 - std;
        }
        return 0;
    }

    standarize = (val) => {
        S0 = $scope.actualSystem.sensors.S0;
        return ((val - S0.minValue) / (S0.maxValue - S0.minValue)) * 100;
    }

    /**
     * Reemplaza todas las ocurrencias de un carácter por una secuencia de caracteres en una cadena
     * @param {string} str - Cadena de entrada
     * @param {string} char - Carácter a reemplazar
     * @param {string} replacement - Secuencia de caracteres de reemplazo
     * @returns {string} - Cadena con los caracteres reemplazados
     */
    $scope.replaceChar = (str, char, replacement) => {
        if (typeof str !== 'string') return str;
        return str.split(char).join(replacement);
    }

    
    activarAlarma = () => {
        reproducirSonido('./assets/sounds/alarma-de-evacuacion.mp3');
    }
        
    $scope.getSoundStatus = () => {
        return localStorage.getItem('sonidoHabilitado') === 'true';
    }

    $scope.toggleNotificationSound = () => {
        const enabled = !$scope.getSoundStatus();
        localStorage.setItem('sonidoHabilitado', String(enabled));
        if (enabled) reproducirSonido('./assets/sounds/Elevator_Bell.mp3');
    }

    checkSound = () => {
        const audio = new Audio("./assets/sounds/android-sms.mp3");
        audio.play().then(() => {
            console.log("Sonido habilitado");
        }).catch(err => {
            console.error("Error al reproducir:", err);
            winActivarAlarma();
        });
    }

    function winActivarAlarma() {
        swal({
            title: "Alerta sonora desactivada",
            text: "¿Desea activar las alertas sonoras?",
            icon: "warning",
            buttons: {
                cancel: "Cancelar",
                confirm: {
                text: "Activar",
                value: true,
                visible: true,
                className: "btn-confirmar",
                closeModal: true
                }
            },
        })
        .then((confirm) => {
            if (confirm) {
                localStorage.setItem('sonidoHabilitado', 'true');
                reproducirSonido('./assets/sounds/Elevator_Bell.mp3');
                swal("Alerta sonora activada!", {
                    icon: "success",
                });
            } else {
                localStorage.setItem('sonidoHabilitado', 'false');
                reproducirSonido('./assets/sounds/android-sms.mp3');
            }
        });
    }
    
    function winDesactivarAlarma() {
        swal({
            title: "Alerta sonora activada",
            text: "¿Desea desactivar las alertas sonoras?",
            icon: "warning",
            buttons: {
                cancel: "Cancelar",
                confirm: {
                    text: "Desactivar",
                    value: true,
                    visible: true,
                    className: "btn-confirmar",
                    closeModal: true
                }
            },
            dangerMode: true,
        })
        .then((confirm) => {
            if (confirm) {
                localStorage.setItem('sonidoHabilitado', 'false');
                reproducirSonido('./assets/sounds/android-sms.mp3');
                swal("Alerta sonora desactivada!", {
                    icon: "success",
                });
            } else {
                localStorage.setItem('sonidoHabilitado', 'true');
                reproducirSonido('./assets/sounds/Elevator_Bell.mp3');
            }
        });
    }

    function reproducirSonido(audioPath) {
        if (localStorage.getItem('sonidoHabilitado') === 'true') {
            const audio = new Audio(audioPath);
            audio.play().then(() => {
                console.log("Sonido habilitado");
            }).catch(err => {
                console.error("Error al reproducir:", err);
                winActivarAlarma();
            });
        }
    }

    // Función para alertas
    function reproducirAlerta() {
        if (localStorage.getItem('sonidoHabilitado') === 'true') {
            const audio = new Audio('alarma.mp3');
            audio.play();
        }
    }

    // #endregion SCRIPTS GENERALES
    
    const requestWakeLock = async () => {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            // The wake lock request fails - usually system-related, such as low battery.
            console.log(`${err.name}, ${err.message}`);
        }
    }

    $scope.refresh = () => { $scope.$apply(); };

    $scope.inicializacion = () => {
        console.log("[app] inicializacion()");
        console.log(window.navigator.userAgent);
        document.getElementById('contenido').style.display = 'none';
        requestWakeLock();
        // getLocation();
        initializeMap();
        checkSound();
        listenUserStatus();
        if (!$scope.authUser) {
            $scope.showWindow('login');
        }
    }

});

// #endregion Controlador Angular

// #region Materializes

document.addEventListener('DOMContentLoaded', function () {
    // M.Modal.init(document.querySelectorAll('.modal'));
    // M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'));
    // M.FormSelect.init(document.querySelectorAll('.select'));
    // M.Collapsible.init(document.querySelectorAll('.collapsible'));
    // M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'));
    M.AutoInit();
});

// document.addEventListener('click', function () {
//     M.AutoInit();
// });

// #endregion Materializes

// #region SMS

// function sendSMS_jQuery(cell = "+526251523176", cmd = "OFF") {
//     var data = {
//         "messages": [{
//             "source": "mashape",
//             "from": "+525549998455",
//             "body": cmd,
//             "to": cell,
//             "schedule": "1452244637",
//             "custom_string": ""
//         }]
//     };
//     var settings = {
//         "async": true,
//         "crossDomain": true,
//         "url": "https://clicksend.p.rapidapi.com/sms/send",
//         "method": "POST",
//         "headers": {
//             "authorization": "Basic ZHRhLmxhYnMuY29udGFjdEBnbWFpbC5jb206Q2xpY2tTZW5kMSE=",
//             "x-rapidapi-host": "clicksend.p.rapidapi.com",
//             "x-rapidapi-key": "b5b6923ae4msh2a00690679b59b2p197fb2jsn06eb2d5a0c3a",
//             "content-type": "application/json",
//             "accept": "application/json"
//         },
//         "processData": false,
//         "data": data
//     }

//     $.ajax(settings).done(function (response) {
//         console.log(response);
//     });
// }

// function sendSMS_XMLHttp(cell, cmd = "OFF") {
//     if (cell) {
//         var data = JSON.stringify({
//             "messages": [
//                 {
//                     "source": "mashape",
//                     "from": "+525549998455",
//                     "body": cmd,
//                     "to": cell,
//                     "schedule": "1452244637",
//                     "custom_string": ""
//                 }
//             ]
//         });

//         var xhr = new XMLHttpRequest();
//         xhr.withCredentials = true;

//         xhr.addEventListener("readystatechange", function () {
//             if (this.readyState === this.DONE) {
//                 console.log(this.responseText);
//             }
//         });

//         xhr.open("POST", "https://clicksend.p.rapidapi.com/sms/send");
//         xhr.setRequestHeader("authorization", "Basic ZHRhLmxhYnMuY29udGFjdEBnbWFpbC5jb206Q2xpY2tTZW5kMSE=");
//         xhr.setRequestHeader("x-rapidapi-host", "clicksend.p.rapidapi.com");
//         xhr.setRequestHeader("x-rapidapi-key", "b5b6923ae4msh2a00690679b59b2p197fb2jsn06eb2d5a0c3a");
//         xhr.setRequestHeader("content-type", "application/json");
//         xhr.setRequestHeader("accept", "application/json");

//         xhr.send(data);
//     }
// }

// #endregion SMS

// #region Geolocalización

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, error, {
            enableHighAccurace: true,
            maximumAge: 60000,
            timeout: 4000
        });
    } else {
        M.toast({
            html: 'Geolocalización no soportada'
        });
    }
}

function showPosition(position) {
    milatitud = position.coords.latitude;
    milongitud = position.coords.longitude;
    miaccuracy = position.coords.accuracy;
    // M.toast({
    //     html: "Lat: " + milatitud + "° Lng: " + milongitud + "° Err: " + miaccuracy + "m"
    // });
    // let miCoord = [milatitud, milongitud];
    // addMarker(miCoord, 'Posición actual:<br>Lat: ' + milatitud + '°<br>Lng: ' + milongitud + '°<br>Err: ' + miaccuracy + 'm');
}

function error() {
    M.toast({
        html: 'Geolocalización no disponible'
    });
}

function getNewLocation(distancia, angulo, miPosicion) {
    let radio = distancia * 0.00001;
    let anguloRad = angulo * 0.0174533;
    let newLatitude = miPosicion[0] + radio * Math.cos(anguloRad); // X
    let newLongitude = miPosicion[1] + radio * Math.sin(anguloRad); // Y
    return [newLatitude, newLongitude];
}

// #endregion Geolocalización

// #region Progresive Web Application

var beforeInstallPrompt = null;

const installBtn1 = document.querySelector('#installBtn1');
if (installBtn1) installBtn1.style.display = 'none';
const installBtn2 = document.querySelector('#installBtn2');
if (installBtn2) installBtn2.style.display = 'none';

window.addEventListener("beforeinstallprompt", eventHandler, errorHandler);

function eventHandler(event) {
    beforeInstallPrompt = event;
    if (installBtn1) installBtn1.style.display = 'block';
    if (installBtn2) installBtn2.style.display = 'block';
}

function errorHandler(e) {
    console.log('error: ' + e);
}

function instalar() {
    if (beforeInstallPrompt) beforeInstallPrompt.prompt();
}

const APP_UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;
const APP_UPDATE_SIGNATURES_KEY = "dta-app-asset-signatures-v1";
let appUpdatePromptVisible = false;
let appServiceWorkerRegistration = null;
let reloadingForServiceWorkerUpdate = false;

serviceWorker();

function serviceWorker() {
    if ('serviceWorker' in navigator) {
        // Limpiar SWs anteriores
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                const scriptUrl = registration.active ? new URL(registration.active.scriptURL) : null;
                if (registration.active && (
                    scriptUrl.pathname.endsWith('/sw.js')
                )) {
                    registration.unregister();
                    console.log("🗑️ SW anterior (sw.js) eliminado");
                }
            });
        });

        navigator.serviceWorker.register('./firebase-messaging-sw.js', {
            scope: './',
            updateViaCache: 'none'
        })
            .then(reg => {
                appServiceWorkerRegistration = reg;
                console.log("✅ SW registrado:", reg);
                console.log("SW state:", reg.installing ? 'installing' : reg.waiting ? 'waiting' : reg.active ? 'active' : 'unknown');
                if (reg.waiting) reg.waiting.postMessage({ action: 'skipWaiting' });
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ action: 'skipWaiting' });
                        }
                    });
                });
                reg.update();
                setInterval(() => reg.update(), APP_UPDATE_CHECK_INTERVAL);
            })
            .catch(err => console.log("❌ Error registrando el SW:", err));
    } else {
        console.log("❌ Service Worker no soportado");
    }
}

function getSameOriginAppAssetUrls() {
    const urls = new Set([new URL("./index.html", window.location.href).href]);

    document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach(element => {
        const assetUrl = element.src || element.href;
        if (!assetUrl) return;

        const url = new URL(assetUrl, window.location.href);
        if (url.origin === window.location.origin) {
            url.search = "";
            url.hash = "";
            urls.add(url.href);
        }
    });

    return Array.from(urls).sort();
}

function hashText(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(index);
        hash |= 0;
    }
    return String(hash);
}

function readStoredAppSignatures() {
    try {
        return JSON.parse(localStorage.getItem(APP_UPDATE_SIGNATURES_KEY) || "{}");
    } catch (error) {
        return {};
    }
}

function saveAppSignatures(signatures) {
    localStorage.setItem(APP_UPDATE_SIGNATURES_KEY, JSON.stringify(signatures));
}

function fetchAssetSignature(url) {
    return fetch(url, { cache: "no-store" })
        .then(response => {
            if (!response.ok) throw new Error("No se pudo revisar " + url);
            return response.text();
        })
        .then(text => hashText(text));
}

function showAppUpdatePopup(version) {
    if (appUpdatePromptVisible) return;
    appUpdatePromptVisible = true;

    const reloadApp = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('appVersion', String(Date.now()));
        window.location.replace(url.href);
    };

    if (typeof swal === "function") {
        swal({
            title: "Actualizacion disponible",
            text: "Hay una nueva version de la app. Se recargara para aplicar los cambios.",
            icon: "info",
            buttons: {
                confirm: {
                    text: "Actualizar",
                    value: true,
                    visible: true,
                    closeModal: true
                }
            },
            closeOnClickOutside: false,
            closeOnEsc: false
        }).then(reloadApp);
        return;
    }

    window.alert("Hay una nueva version de la app. Se recargara para aplicar los cambios.");
    reloadApp();
}

function checkForAppUpdates() {
    const assetUrls = getSameOriginAppAssetUrls();
    const storedSignatures = readStoredAppSignatures();
    const currentSignatures = {};

    Promise.all(assetUrls.map(url => (
        fetchAssetSignature(url)
            .then(signature => {
                currentSignatures[url] = signature;
            })
            .catch(error => console.log("No se pudo revisar actualizacion:", error))
    ))).then(() => {
        const hasStoredSignatures = Object.keys(storedSignatures).length > 0;
        const hasChangedAsset = assetUrls.some(url => (
            storedSignatures[url] && currentSignatures[url] && storedSignatures[url] !== currentSignatures[url]
        ));

        if (Object.keys(currentSignatures).length > 0) {
            saveAppSignatures(currentSignatures);
        }

        if (hasStoredSignatures && hasChangedAsset) {
            showAppUpdatePopup("assets");
        }
    });
}

function startAppUpdateChecks() {
    checkForAppUpdates();
    setInterval(checkForAppUpdates, APP_UPDATE_CHECK_INTERVAL);
}

// function serviceWorker() {
//   if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('./firebase-messaging-sw.js', { scope: './' })
//       .then(reg => {
//         console.log("✅ SW unificado registrado:", reg);
//         enablePushNotifications(); // aquí ya se engancha el push sobre el SW unificado
//       })
//       .catch(err => console.log("❌ Error registrando SW unificado:", err));
//   }
// }

// function serviceWorker() {
//     if ('serviceWorker' in navigator) {
//         navigator.serviceWorker.register('./sw.js')
//             .then(reg => {
//             console.log("✅ SW de caché registrado:", reg);
//             enablePushNotifications();
//             })
//             .catch(err => console.log("❌ Error registrando SW de caché:", err));

//         navigator.serviceWorker.register('./firebase-messaging-sw.js')
//             .then(reg => console.log("✅ SW de Firebase registrado:", reg))
//             .catch(err => console.log("❌ Error registrando SW de Firebase:", err));
//     }
// }

// enablePushNotifications = () => {
//     Notification.requestPermission().then(permission => {
//         if (permission === 'granted') {
//             navigator.serviceWorker.ready.then(sw => {
//                 sw.pushManager.subscribe({
//                     userVisibleOnly: true,
//                     applicationServerKey: 'BG1caHGzzvPNBWM4NuN5oIpqaRaVFKld8iwNtpx100P3bkMYhEDYfWcCs9sy0Ay3t170750tQlLM8XCzxpysD7o'
//                 }).then(subscription => {
//                     subscriptionJSON = JSON.stringify(subscription);
//                     console.log(subscriptionJSON);
//                 })
//             })
//         }
//     })
// }

// El sonido se maneja directamente desde el Service Worker

handleTokenRefresh = (email) => {
    if (typeof registerFirebaseMessaging === "function") {
        return registerFirebaseMessaging(email).then(token => {
            if (token) {
                console.log("Token FCM activo:", token);
            } else {
                console.error("No se genero ni guardo token FCM durante el registro automatico.");
            }
            return token;
        });
    }

    console.error("Firebase Messaging no esta disponible; no se guardaran tokens legacy.");
    return Promise.resolve(null);
}

send_push = (subscription) => {
    const endpoint = encodeURIComponent(subscription);
    const payload = encodeURIComponent('{"title":"Hola desde PHP", "body":"Mi notificación en PHP", "icon":"icon-192.png", "url":"./?v=0.1"}');

    fetch(`https://dta-agricola.web.app/WS/send_push.php?endpoint='${endpoint}'&payload='${payload}'`, {
        method: 'GET',
        headers: {
            'Content-Type': 'text/plain'
        }
    })
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
}

window.addEventListener('online', showListado);
window.addEventListener('offline', showOffLine);

function showListado() {
    document.getElementById("spinner").style.display = "none";
    document.getElementById("contenido").style.display = "block";
    document.getElementById("offline").style.display = "none";
    console.log(window.navigator.onLine);
}

function showOffLine() {
    document.getElementById("spinner").style.display = "none";
    document.getElementById("contenido").style.display = "none";
    document.getElementById("offline").style.display = "block";
    console.log(window.navigator.onLine);
}

// #region AVISO DE SALIDA (REQ-025)
// El aviso NO puede romper la navegacion: si el elemento no existe se ignora, y solo se
// interrumpe la salida cuando de verdad hay cambios sin guardar. Un beforeunload que
// siempre interrumpe estorbaba al redirect de Google (el login volvia y no se entraba).
(function instalarAvisoDeSalidaSeguro() {
    const aviso = window.DTALogic && window.DTALogic.aviso;

    if (aviso && typeof aviso.instalarAvisoDeSalida === "function") {
        aviso.instalarAvisoDeSalida(window, document, {
            id: "mensaje",
            hayCambios: function () {
                if (!window.angular || !document.body) return false;

                const alcance = window.angular.element(document.body).scope();
                return !!(alcance && alcance.hayCambiosSinGuardar === true);
            },
        });
        return;
    }

    // Respaldo minimo si el modulo no se cargo: nunca lanza (REQ-025).
    window.addEventListener("beforeunload", function () {
        const mensaje = document.getElementById("mensaje");
        if (mensaje) mensaje.innerHTML = "Si se va no se guardarán los datos";
    });
})();
// #endregion

// Set the badge
const unreadCount = 24;
if ("setAppBadge" in navigator) {
    navigator.setAppBadge(unreadCount).catch((error) => {
        console.log("No se pudo establecer el badge:", error);
    });
}

// Clear the badge
if ("clearAppBadge" in navigator) {
    navigator.clearAppBadge().catch((error) => {
        console.log("No se pudo limpiar el badge:", error);
    });
}

// Escuchar mensajes del SW
if ('serviceWorker' in navigator) {
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (reloadingForServiceWorkerUpdate) return;
  reloadingForServiceWorkerUpdate = true;
  const url = new URL(window.location.href);
  url.searchParams.set('appVersion', String(Date.now()));
  window.location.replace(url.href);
});

navigator.serviceWorker.addEventListener('message', event => {
  if (event.data && event.data.action === 'playSound') {
    if (localStorage.getItem('sonidoHabilitado') !== 'true') return;
    const soundUrl = event.data.file;
    if (!soundUrl || soundUrl === 'default') return;
    console.log('🎵 Reproduciendo sonido en la PWA:', soundUrl);

    try {
      const audio = new Audio(soundUrl);
      audio.volume = 1.0;
      audio.play().catch(err => {
        console.error('❌ Error reproduciendo sonido en la PWA:', err);
      });
    } catch (e) {
      console.error('❌ Error creando audio en la PWA:', e);
    }
  }

  if (event.data && event.data.action === 'appUpdated') {
    showAppUpdatePopup(event.data.version);
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAppUpdateChecks);
} else {
  startAppUpdateChecks();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (appServiceWorkerRegistration) appServiceWorkerRegistration.update();
  checkForAppUpdates();
});

window.addEventListener('online', () => {
  if (appServiceWorkerRegistration) appServiceWorkerRegistration.update();
  checkForAppUpdates();
});
}

// #endregion Progresive Web Application
