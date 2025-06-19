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

app.controller("ControladorPrincipal", function ($scope) {

    // #region Variables
    
    $scope.selectedWindow = 'intro';
    let listeners = {};
    $scope.systems = {};
    $scope.systemsFails = {};
    $scope.showMore = false;
    $scope.statisticSelectedSystem = {};
    let sendCommand = {};
    $scope.logs = {};
    $scope.logDetail = {};
    $scope.users = {};
    $scope.meteo = [];
    $scope.as_config = false;
    $scope.as_adjust = false;
    $scope.as_more = false;
    $scope.as_hist = false;
    $scope.as_users = false;
    $scope.isPlanning = false;
    $scope.listPlanesRiego;
    $scope.selectedPlaneRiego;
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
    $scope.chartItems = 5000;
    
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
        $scope.showWindow('ayuda');
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
        document.getElementById("contenido").style.display = "block";
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

    listenUserStatus = () => {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // `$scope.$apply(function () {
                console.log("Intento de autenticación");
                $scope.authUser = user.email ? user : user.user;
                authUser = $scope.authUser;
                getUserData();
                $scope.showWindow('listado');
                // });
            } else {
                console.log("Error de autenticación");
                $scope.$apply(function () {
                    $scope.authUser = null;
                    localStorage.clear();
                });
                $scope.showWindow('login');
                //location.href = "./landing/index.html"
            }
        });
    };

    getUserData = () => {
        loadUserData($scope.authUser.email).then(result => {
            $scope.userLocations = result;
            if (result[convertDotToDash($scope.authUser.email)]) {
                $scope.userProfile = result[convertDotToDash($scope.authUser.email)].profile;
                let tokenList = result[convertDotToDash($scope.authUser.email)].token;
                userTokenList = tokenList ? tokenList : [];
                handleTokenRefresh($scope.authUser.email);
                loadSystems();
            }
            $scope.showWindow('listado');
            $scope.$apply();
        });
    }

    $scope.login = () => {
        // if (!ui) {
        //     initializeFirebaseUI();
        // }
        $scope.showWindow("login");
    };

    $scope.logout = () => {

        firebase.auth().signOut().then(() => {
            $scope.authUser = null;
            $scope.tipoUsuario = 0;
            localStorage.clear();
            // ui.start("#firebaseui-auth-container", uiConfig);
            //logoutAutUser();
            //document.getElementById("logout").style.display = "none";
        }).catch((error) => {
            // An error happened.
        });

        // firebase.auth().signOut().then(function () {
        //     let provider = new firebase.auth.GoogleAuthProvider();
        //     provider.setCustomParameters({
        //         prompt: 'select_account'
        //     });
        //     //ui = null;
        //     $scope.authUser = null;
        //     $scope.tipoUsuario = 0;
        //     // ui.start("#firebaseui-auth-container", uiConfig);
        //     //logoutAutUser();
        //     //document.getElementById("logout").style.display = "none";
        // });
        // $scope.login();
    };

    $scope.isSystemOfRole = (role) => {
        let userRole = "";
        if ($scope.actualSystem && $scope.authUser) {
            userRole = $scope.userLocations[convertDotToDash($scope.authUser.email)].systems[$scope.actualSystem.key];
        }
        let result = (userRole == role) ? true : false;
        return result;
    }

    // #endregion USER

    // #region DEVICES

    loadSystems = () => {
        if ($scope.authUser) {
            let userSystems = $scope.userLocations[convertDotToDash($scope.authUser.email)].systems;
            if (userSystems) {
                let lastLocation = Object.keys(userSystems)[Object.keys(userSystems).length - 1];
                for (let locationKey in userSystems) {
                    listeners[locationKey] = firebase.database().ref("systems/" + locationKey + "/settings");
                    listeners[locationKey].on("value", system => {
                        if (system.val()) {
                            $scope.systems[locationKey] = system.val();
                            $scope.systems[locationKey].key = locationKey;
                            loadSystemUsers(locationKey);
                            getMetorologicalData(locationKey);
                            $scope.loadSystemLog(locationKey, 1);
                            // $scope.showWindow('listado');
                            if (locationKey == lastLocation) {
                                $scope.$apply();
                            }
                            if ($scope.actualSystem && locationKey == $scope.actualSystem.key) { $scope.selectSystem($scope.systems[locationKey]); }
                        }
                    });
                }
            }
        }
    }

    loadSystemUsers = (locationKey) => {
        firebase.database().ref("systems/" + locationKey + "/users").on("value", users => {
            if (users.val()) {
                $scope.users[locationKey] = users.val();
                // $scope.$apply();
            }
        });
    }

    $scope.loadSystemLog = (locationKey, registers) => {
        firebase.database().ref("systems/" + locationKey + "/logs").limitToLast(registers).on("value", logs => {
            if (logs.val()) {
                $scope.logs[locationKey] = logs.val();
                $scope.logsArray = {};
                $scope.logsArray = Object.values($scope.logs);
                let keys = Object.keys($scope.logs[locationKey]);
                let length = keys.length;
                let myLogs = $scope.logs[locationKey];
                let log = myLogs[keys[length - 1]];
                let position = log.position ? log.position : 0;
                position = parseInt(position)
                    - parseInt($scope.systems[locationKey].magneticDesv ? $scope.systems[locationKey].magneticDesv : "0")
                    - parseInt($scope.systems[locationKey].posManualAdj ? $scope.systems[locationKey].posManualAdj : "0");
                log.position = position;
                log["statusTime"] = calcStatusTime(log.date, log.update);
                $scope.systems[locationKey]["log"] = log;
                processingSensors(locationKey);
                findCommErrors();
                if (document.getElementById('pos_' + locationKey)) {
                    document.getElementById('pos_' + locationKey).style.transform = 'rotate(' + position + 'deg)';
                }
                updateCompass();
                hideSpinner(locationKey, log.state);
                invertLog();
                setDeviceSpecificData();
                // $scope.$apply();
            }
        });
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
        for (let systemId in $scope.systems) {
            if ($scope.systems[systemId].type != "Sensor") {
                let log = $scope.systems[systemId].log;
                if (log) {
                    let dif = getTimeDiference(log.update, null);
                    let commDelay = "-1";
                    if ((dif.day >= 1 || dif.hour >= 1 || dif.min >= 10) && log.safety == "true" && log.voltage == "true") {
                        commDelay = dif.day >= 1 ? ("+" + dif.day + "d") : dif.hour >= 1 ? ("+" + dif.hour + "h") : ("" + dif.min + "m");
                    }
                    $scope.systems[systemId].log["commDelay"] = commDelay;
                }
            }
        }
    }

    calcStatusTime = (date, update) => {
        // let dif = getTimeDiference(date, update);
        let dif = getTimeDiference(date, null);
        let result = "-1";
        if (dif.day >= 1 || dif.hour >= 1 || dif.min >= 10) {
            result = dif.day >= 1 ? ("+" + dif.day + "d") : dif.hour >= 1 ? ("+" + dif.hour + "h") : ("" + dif.min + "m");
        }
        return result;
    }

    getTimeDiference = (date, update = null) => {
        let dDate = new Date(parseInt(date.substring(0, 4)), parseInt(date.substring(4, 6)) - 1, parseInt(date.substring(6, 8)), (date.substring(13, 15) == "pm" ? parseInt(date.substring(9, 11)) + 12 : parseInt(date.substring(9, 11)) == 12 ? 0 : parseInt(date.substring(9, 11))), parseInt(date.substring(11, 13)), 0, 0).getTime();
        let dUpdate = update ? (new Date(parseInt(update.substring(0, 4)), parseInt(update.substring(4, 6)) - 1, parseInt(update.substring(6, 8)), (update.substring(13, 15) == "pm" ? parseInt(update.substring(9, 11)) + 12 : parseInt(update.substring(9, 11)) == 12 ? 0 : parseInt(update.substring(9, 11))), parseInt(update.substring(11, 13)), 0, 0).getTime()) : (new Date()).getTime();
        let dif = dUpdate - dDate;
        return {
            day: parseInt(dif / (1000 * 60 * 60 * 24)),
            hour: parseInt(dif / (1000 * 60 * 60)),
            min: parseInt(dif / (1000 * 60))
        };
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
        setDeviceData(system);
        $scope.loadCultures();
        setActualSystemPlans();
        $scope.actualizarListaCultivos();
        $scope.loadSystemLog(system.key, 10);
        // invertLog();
        // $scope.actualSystem.posicionActual = parseInt($scope.actualSystem.log.position ? $scope.actualSystem.log.position : "0") + parseInt($scope.actualSystem.summerHour ? $scope.actualSystem.summerHour : "0");
        // showPlanRiegoPie();
        hideTheSpinner();
        $scope.showWindow('sistema');
        updateCompass();
        initializeSystemMap($scope.actualSystem);
        getMetorologicalData($scope.actualSystem.key);
        setDeviceSpecificData();
    }

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
                showSystemTable($scope.actualSystem.brand);
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

    updateCompass = () => {
        setTimeout(function () {
            if ($scope.actualSystem && document.getElementById('as_pos_' + $scope.actualSystem.key)) {
                document.getElementById('as_pos_' + $scope.actualSystem.key).style.transform = 'rotate(' + $scope.actualSystem.log.position + 'deg)';
            }
            $scope.$apply();
        }, 500);
    }

    getMetorologicalData = (key) => {
        $scope.meteo[key] = {};
        $.ajax({
            url: `https://api.openweathermap.org/data/2.5/weather?lat=${$scope.systems[key].latitude}&lon=${$scope.systems[key].longitude}&appid=db9c92bd1f6d8d5db0aa0bae36ce093f`, success: function (result) {
                $scope.meteo[key] = result;
                $scope.meteo[key].weather["iconUrl"] = `https://openweathermap.org/img/w/${$scope.meteo[key].weather["0"].icon}.png`;
                $scope.$apply();
            }
        });
    }

    $scope.stopSystem = () => {
        if ($scope.actualSystem.status) {
            swal({
                title: "Control de riego",
                text: "¿Desea detener el riego?",
                icon: "warning",
                buttons: true,
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

    $scope.playForward = () => {
        if (!$scope.actualSystem.direction || !$scope.actualSystem.status) {
            swal({
                title: "Control de riego",
                text: "¿Desea iniciar el riego?",
                icon: "warning",
                buttons: true,
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
                buttons: true,
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
            buttons: true,
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
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
        document.getElementById("spinner").style.display = "none";
    }

    $scope.setMachineSettings = (system = $scope.actualSystem) => {
        let key = system.key;
        system.status = system.status ? "ON" : "OFF";
        system.sensorSecurity = system.sensorSecurity ? "ON" : "OFF";
        system.sensorVoltage = system.sensorVoltage ? "ON" : "OFF";
        system.sensorPosition = system.sensorPosition ? "ON" : "OFF";
        system.isScheduled = system.autoreverse ? false : system.isScheduled;
        system.autoreverse = system.autoreverse ? "ON" : "OFF";
        system.direction = system.direction ? "FF" : "RR";
        system.operationMode = system.operationMode ? system.operationMode : "";
        system.isScheduled = system.isScheduled ? system.isScheduled : "";
        system.caudal = "" + (system.caudal && !isNaN(system.caudal) ? system.caudal : "");
        system.delayTime = "" + (system.delayTime && !isNaN(system.delayTime) ? system.delayTime : "");
        system.length = "" + (system.length && !isNaN(system.length) ? system.length : "");
        system.latitude = "" + (system.latitude && !isNaN(system.latitude) ? system.latitude : "");
        system.longitude = "" + (system.longitude && !isNaN(system.longitude) ? system.longitude : "");
        system.plansLength = "" + (system.plansLength && !isNaN(system.plansLength) ? system.plansLength : "");
        system.velocity = "" + (system.velocity && !isNaN(system.velocity) ? system.velocity : "");
        system.maxVelocity = "" + (system.maxVelocity <= 100 ? system.maxVelocity : 100);
        system.sensorPresion = "" + (system.sensorPresion && !isNaN(system.sensorPresion) ? system.sensorPresion : "");
        // system.irrigation = document.querySelector('input[name=groupRiego]:checked').getAttribute("data");
        if (system.type == "Estacionario") { verifyPlots(system); }
        setMachineSettings(system);
        // updateAudit($scope.authUser, system);
        system.status = system.status == "ON" || system.status == true ? true : false;
        system.sensorSecurity = system.sensorSecurity == "ON" || system.sensorSecurity == true ? true : false;
        system.sensorVoltage = system.sensorVoltage == "ON" || system.sensorVoltage == true ? true : false;
        system.sensorPosition = system.sensorPosition == "ON" || system.sensorPosition == true ? true : false;
        system.autoreverse = system.autoreverse == "ON" || system.autoreverse == true ? true : false;
        system.direction = system.direction == "FF" || system.direction == true ? true : false;
        system.key = key;
        $scope.$apply();
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

    $scope.setNewPoligonNode = () => {
        getLocation();
        let iter = 0;
        while ((!milatitud || !milongitud) && iter < 5) {
            getLocation();
            iter++;
        }
        if (milatitud && milongitud) {
            document.getElementById("editPoligon").innerHTML += `,${milatitud},${milongitud}`;
            $scope.$apply();
        }
    }

    $scope.setDevicePosition = () => {
        getLocation();
        document.getElementById("newDeviceLatitude").value = `${milatitud}`;
        document.getElementById("newDeviceLongitude").value = `${milongitud}`;
        $scope.newDevice.latitude = milatitud;
        $scope.newDevice.longitude = milongitud;
    }

    $scope.setSensorPosition = () => {
        getLocation();
        document.getElementById("newSensorLatitude").value = `${milatitud}`;
        document.getElementById("newSensorLongitude").value = `${milongitud}`;
        $scope.newSensorlatitude = milatitud;
        $scope.newSensorLongitude = milongitud;
    }

    $scope.convertStrToJSON = (str) => {
        // return str ? JSON.parse(str.replace(/""/g, '"","",""')) : null;
        return str ? JSON.parse(str) : null;
    }

    // #endregion DEVICES

    // #region CONFIGURACIONES

    $scope.showSystemTable = (type) => {
        switch (type.toLowerCase()) {
            case "valley":
            case "valley cams":
                type = "valley";
                break;
            case "zimmatic":
            case "rintec hydrus (zimmatic)":
            case "growsmart":
                type = "growsmart";
                break;
            case "lindsay":
                type = "lindsay";
                break;
        }
        $scope.systemConfig = {};
        firebase.database().ref("configurations/" + type).once("value", config => {
            $scope.systemConfig = config.val();
            $scope.systemConfigType = type;
            $scope.$apply();
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
                "p6": newPlot
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
            "operationMode": "3",
            "sensingProcess": false,
            "sleepingTime": "1"
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
            buttons: ["Cancelar", true],
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


    $scope.updateNewDevice = () => {
        if ($scope.newDevice.key && $scope.newDevice.name && $scope.newDevice.type && $scope.newDevice.zona) {
            updateNewDevice($scope.newDevice);
            updateDeviceUsers(convertDotToDash($scope.authUser.email), $scope.newDevice.key, $scope.authUser.displayName, "propietario");
            location.reload();
            // getUserData();
            // $scope.$apply();
            document.getElementById("modalNuevoEquipo").style.display = "none";
        }
    }

    $scope.addNewUserToDevice = () => {
        updateDeviceUsers(convertDotToDash($scope.newUserEmail), $scope.actualSystem.key, $scope.newUserName, $scope.newUserRole);
        //location.reload();
        document.getElementById("modalAddUser").style.display = "none";
    }

    $scope.addNewSensorToNet = () => {
        swal({
            title: "",
            text: "Agrear nuevo sensor",
            icon: "warning",
            buttons: ["Cancelar", true],
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
                    });
                } else {
                    swal("Asignación cancelada!");
                }
            });
    }

    $scope.deleteActualSensor = () => {
        swal({
            title: "",
            text: "Eliminar sensor",
            icon: "warning",
            buttons: ["Cancelar", true],
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
                    document.getElementById("modalEditSensor").style.display = "none";
                    $scope.actualSensor.id ="0x0";
                    $scope.setMachineSettings($scope.actualSystem);
                    swal("Eliminación completada!", {
                        icon: "success",
                    });
                } else {
                    swal("Eliminación cancelada!");
                }
            });
    }

    $scope.editActualSensor = () => {
        swal({
            title: "",
            text: "Editar sensor",
            icon: "warning",
            buttons: ["Cancelar", true],
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

    $scope.resetNewPlan = () => {
        let length = $scope.actualSystem.plans ? Object.keys($scope.actualSystem.plans).length : 0;
        let index = `p${length > 0 ? length - 1 : length}`;
        document.getElementById("planAnguloIni").value = length > 0 ? $scope.actualSystem.plans[index].endAngle : 0;
        length > 0 ? document.getElementById("planAnguloIni").setAttribute("min", $scope.actualSystem.plans[index].endAngle) : null;
        document.getElementById("planAnduloFin").value = 360;
        document.getElementById("planValue").value = 0;
        $scope.actualizarListaCultivos();
        M.FormSelect.init(document.querySelectorAll('.select'));
        M.AutoInit();
        // document.getElementById("planType").value = "velocity";
    }

    $scope.setNewPlan = (starAngle, endAngle, value, endGun, culture, sensor) => {
        if (!$scope.actualSystem.plans) {
            $scope.actualSystem["plans"] = {};
        }
        if (starAngle == -1 || endAngle == -1) {
            starAngle = document.getElementById('planAnguloIni').value,
                endAngle = document.getElementById('planAnduloFin').value,
                value = document.getElementById('planValue').value,
                endGun = document.getElementById('planEndGun').value
        }
        if (starAngle != endAngle) {
            let length = Object.keys($scope.actualSystem.plans).length;
            let index = `p${length}`;
            let finalValue = (value <= $scope.actualSystem.maxVelocity) ? value : $scope.actualSystem.maxVelocity;
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
                buttons: true,
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

    $scope.setEditPlan = (index) => {
        $scope.editedPlan = ('' + index).includes('p') ? index : `p${index}`;
        $scope.editSelectedPlan = {};
        $scope.editSelectedPlan["starAngle"] = parseInt($scope.actualSystem.plans[$scope.editedPlan].starAngle);
        $scope.editSelectedPlan["endAngle"] = parseInt($scope.actualSystem.plans[$scope.editedPlan].endAngle);
        $scope.editSelectedPlan["value"] = parseFloat($scope.actualSystem.plans[$scope.editedPlan].value);
        $scope.editSelectedPlan["endGun"] = $scope.actualSystem.plans[$scope.editedPlan].endGun == "true" ? true : false;
        $scope.editSelectedPlan["culture"] = $scope.actualSystem.plans[$scope.editedPlan].culture ? $scope.actualSystem.plans[$scope.editedPlan].culture : "";
        $scope.editSelectedPlan["sensor"] = $scope.actualSystem.plans[$scope.editedPlan].sensor ? $scope.actualSystem.plans[$scope.editedPlan].sensor : "";
        // $scope.sensorsList = $scope.getSensors();
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

    $scope.setTimer = (value) => {
        $scope.editSelectedPlan.value = value;
        document.getElementById("planValue").value = value;
    }

    $scope.editPlan = () => {
        swal({
            title: "Plan de riego",
            text: "¿Desea confirmar los cambios realizados?",
            icon: "warning",
            buttons: true,
            dangerMode: true,
        })
            .then((confirm) => {
                if (confirm) {
                    let ep = $scope.editSelectedPlan;
                    $scope.actualSystem.plans[$scope.editedPlan] = ep;
                    $scope.actualSystem.plans[$scope.editedPlan].endGun = ep.endGun ? "true" : "false";
                    $scope.actualSystem.plans[$scope.editedPlan].value = ep.value <= $scope.actualSystem.maxVelocity ? ep.value : $scope.actualSystem.maxVelocity;
                    $scope.setMachineSettings($scope.actualSystem);
                    $scope.setEditPlan($scope.editedPlan);
                    swal("Plan de riego actualizado correctamente!", {
                        icon: "success",
                    });
                } else {
                    swal("No se realizó la actualización!");
                }
            });
    }

    $scope.setEditPlanEstacionario = (index) => {
        $scope.editedPlan = index;
        let asEpPlot = $scope.actualSystem.plots[index];
        asEpPlot["startDate"] = asEpPlot["startDate"] ? asEpPlot["startDate"] : " ";
        $scope.actualizarListaCultivos();
        // $scope.sensorsList = $scope.getSensors();
        $scope.editedCulture = $scope.actualSystem.plots[index].culture ? $scope.actualSystem.plots[index].culture : "";
        M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'));
        document.getElementById("planEstacionarioId").value = index;
        document.getElementById("editName").value = $scope.actualSystem.plots[index].name ? $scope.actualSystem.plots[index].name : "";
        document.getElementById("startDate").value = $scope.actualSystem.plots[index].startDate ? dateTimeToString($scope.actualSystem.plots[index].startDate.substr(0,16)) : "";
        document.getElementById("editPlotCaudal").value = $scope.actualSystem.plots[index].caudal ? $scope.actualSystem.plots[index].caudal : "0";
        document.getElementById("editPoligon").innerHTML = $scope.actualSystem.plots[index].poligon ? $scope.actualSystem.plots[index].poligon : "";
        document.getElementById("editEqSensor").selectedIndex = $scope.actualSystem.plots[index].sensor ? $scope.actualSystem.plots[index].sensor : "";
        document.getElementById("editSoil").selectedIndex = $scope.actualSystem.plots[index].soil ? $scope.actualSystem.plots[index].soil : "";
        // document.getElementById("editDay").value = $scope.getDayFromMs($scope.actualSystem.plots[index].value);
        // document.getElementById("editHour").value = $scope.getHourFromMs($scope.actualSystem.plots[index].value);
        // document.getElementById("editMinutes").value = $scope.getMinutesFromMs($scope.actualSystem.plots[index].value);
        document.getElementById("editType").value = $scope.actualSystem.plots[index].valve ? $scope.actualSystem.plots[index].valve : "F";
        M.FormSelect.init(document.querySelectorAll('.select'));
    }

    $scope.getSensors = () => {
        let sensors = [];
        for (let idx in $scope.systems) {
            if ($scope.systems[idx].type == "Sensor") {
                sensors.push($scope.systems[idx]);
            }
        }
        return sensors;
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
            buttons: ["Cancelar", true],
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
            buttons: ["Cancelar", true],
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

    $scope.dataEditionPlanEstacionario = () => {
        updatePoligon();
        validateIrrigationconfig();
        let day = document.getElementById("editDay").value != '' ? parseInt(document.getElementById("editDay").value) * (1000 * 60 * 60 * 24) : 0;
        let hour = document.getElementById("editHour").value != '' ? parseInt(document.getElementById("editHour").value) * (1000 * 60 * 60) : 0;
        let minutes = document.getElementById("editMinutes").value != '' ? parseInt(document.getElementById("editMinutes").value) * (1000 * 60) : 0;
        let millis = day + hour + minutes;
        let index = document.getElementById("editScheduleIndex").value != '' ? parseInt(document.getElementById("editScheduleIndex").value) : 0;
        if ($scope.actualSystem.plots[$scope.editedPlan].schedule) {
            $scope.actualSystem.plots[$scope.editedPlan].schedule[index].value = millis;
            let aux = document.getElementById("scheduleDate").value.split("T");
            let date = aux[0];
            let time = aux[1];
            $scope.actualSystem.plots[$scope.editedPlan].schedule[index].date = date ? date : $scope.actualSystem.plots[$scope.editedPlan].schedule[index].date;
            $scope.actualSystem.plots[$scope.editedPlan].schedule[index].time = time ? time : $scope.actualSystem.plots[$scope.editedPlan].schedule[index].time;
        }            
        $scope.actualSystem.plots[$scope.editedPlan].caudal = document.getElementById("editPlotCaudal").value;
        // $scope.actualSystem.plots[$scope.editedPlan]["sensor"] = document.getElementById("editEqSensor").value.split(":")[1];
        $scope.actualSystem.plots[$scope.editedPlan].valve = document.getElementById("editType").value;
        // $scope.actualSystem.plots[$scope.editedPlan].soil = document.getElementById("editSoil").value;
        $scope.setMachineSettings($scope.actualSystem);
        // let cultureList = document.getElementById("selectPlotCulture");
        // $scope.actualSystem.plots[$scope.editedPlan].culture = cultureList.options[cultureList.selectedIndex].text;
        // asignCulture($scope.actualSystem.plots[$scope.editedPlan].culture);
    }
    
    updatePoligon = () => {
        let arr1 = [];
        let arr2 = document.getElementById("editPoligon").value.split(",");
        if (arr2.length >= 2) {
            for (let i = 0; i < arr2.length; i += 2) {
                let arr3 = [];
                arr3.push(parseFloat(arr2[i]));
                arr3.push(parseFloat(arr2[i + 1]));
                arr1.push(arr3);
            }
            $scope.actualSystem.plots[$scope.editedPlan].poligon = arr1;
        } else {
            $scope.actualSystem.plots[$scope.editedPlan].poligon = "";
        }
    }

    validateIrrigationconfig = () => {
        $scope.actualSystem.plots[$scope.editedPlan].irrigationConfig = $scope.actualSystem.plots[$scope.editedPlan].irrigationConfig ? $scope.actualSystem.plots[$scope.editedPlan].irrigationConfig : {};
        let irrConfig = $scope.actualSystem.plots[$scope.editedPlan].irrigationConfig;
        irrConfig.isAdjustReduction = !irrConfig.isAdjustReduction ? false : true;
        irrConfig.isAdjustFrecuency = !irrConfig.isAdjustFrecuency ? false : true;
        irrConfig.isAdjustIncrement = !irrConfig.isAdjustIncrement ? false : true;
        irrConfig.isStopByRainDay = !irrConfig.isStopByRainDay ? false : true;
        irrConfig.isStopByRainWeek = !irrConfig.isStopByRainWeek ? false : true;
        irrConfig.isStopByTemp = !irrConfig.isStopByTemp ? false : true;
        irrConfig.isStopByWind = !irrConfig.isStopByWind ? false : true;
        irrConfig.isStopByRainProbability = !irrConfig.isStopByRainProbability ? false : true;
        irrConfig.reductionPercent = !irrConfig.reductionPercent ? -30 : irrConfig.reductionPercent < -100 ? -100 : irrConfig.reductionPercent > 0 ? 0 : irrConfig.reductionPercent;
        irrConfig.reductionTemp = !irrConfig.reductionTemp ? 25 : irrConfig.reductionTemp < -10 ? -10 : irrConfig.reductionTemp > 70 ? 70 : irrConfig.reductionTemp;
        irrConfig.incrementPercent = !irrConfig.incrementPercent ? 50 : irrConfig.incrementPercent < 0 ? 0 : irrConfig.incrementPercent > 100 ? 100 : irrConfig.incrementPercent;
        irrConfig.stopByTemp = !irrConfig.stopByTemp ? 20 : irrConfig.stopByTemp < -10 ? -10 : irrConfig.stopByTemp > 70 ? 70 : irrConfig.stopByTemp;
        irrConfig.stopByRainProbability = !irrConfig.stopByRainProbability ? 80 : irrConfig.stopByRainProbability < 0 ? 0 : irrConfig.stopByRainProbability > 100 ? 100 : irrConfig.stopByRainProbability;
        irrConfig.stopByWind = !irrConfig.stopByWind ? 100 : irrConfig.stopByWind < 0 ? 0 : irrConfig.stopByWind;
        irrConfig.stopByRainDay = !irrConfig.stopByRainDay ? 3 : irrConfig.stopByRainDay < 0 ? 0 : irrConfig.stopByRainDay;
        irrConfig.stopByRainWeek = !irrConfig.stopByRainWeek ? 30 : irrConfig.stopByRainWeek < 0 ? 0 : irrConfig.stopByRainWeek;
    }
    
    $scope.startPlotIrrigation = () => {
        swal({
            title: "Plan de riego",
            text: "¿Desea iniciar el riego de " + $scope.actualSystem.plots[$scope.editedPlan].name + "?",
            icon: "warning",
            buttons: ["Cancelar", true],
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
        swal({
            title: "Plan de riego",
            text: "¿Desea detener el riego de " + $scope.actualSystem.plots[$scope.editedPlan].name + "?",
            icon: "warning",
            buttons: ["Cancelar", true],
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

    $scope.isPlotActive = (system, index) => {
        let active = false;
        if (index && system["plots"]) {
            let dateTime = getDateAndTime();
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
            buttons: ["Cancelar", true],
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

    $scope.loadCultures = () => {
        if (!$scope.listPlanesRiego) { loadCultures(); };
        $scope.showWindow('fichasTecnicas');
    }

    $scope.showFichaTecnicaModal = (plan) => {
        if (plan.price == "0.00") {
            $scope.selectedPlaneRiego = plan;
            $scope.selectedPlaneRiego.plan.forEach((plan) => {
                plan["range"] = plan.day;
                // let values = plan.day.split("~")
                // let value = parseInt(values[0]) < parseInt(values[1]) ? parseInt(values[0]) : parseInt(values[1]);
                // plan.day = plan.day && (typeof plan.day) != "number" ? value : 0;
                plan.day = plan.day && (typeof plan.day) != "number" ? parseInt(plan.day.split("~")[0]) : 0;
            });
            $scope.selectedPlaneRiego.plan.sort((a, b) => a.day - b.day);
            M.Modal.getInstance($('#fichaTecnica')).open();
        } else {
            swal({
                title: "Ficha técnica de " + plan.culture + " " + plan.detail,
                text: "Este es un recurso de pago",
                icon: "warning",
                button: true,
                dangerMode: true,
            });
        }
    }

    $scope.actualizarListaCultivos = () => {
        if (!$scope.listPlanesRiego) { loadCultures(); };
    }

    $scope.selectPlanRiego = () => {
        $scope.actualizarListaCultivos();
        M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'));
        $scope.showWindow('planificarRiego');
    }

    loadCultures = () => {
        firebase.database().ref("cultivos").once("value", cultivos => {
            $scope.listPlanesRiego = cultivos.val();
            M.FormSelect.init(document.querySelectorAll('.select'));
            M.AutoInit();
            $scope.$apply();
        });
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
            buttons: ["Cancelar", true],
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
        for (idx in $scope.listPlanesRiego) {
            if ($scope.listPlanesRiego[idx].culture == nombreCultivo) {
                cultivo = $scope.listPlanesRiego[idx];
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
        document.getElementById("editDay").value = $scope.getDayFromMs();
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
    $scope.setToken = () => {
        if ($scope.authUser) {
            handleTokenRefresh($scope.authUser.email);
            segundoPlano();
        }
    }

    segundoPlano = () => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            alert("Para recibir notificaciones sin abrir la app, activa el inicio automático en: Configuración > Aplicaciones > Inicio Automático.");
            window.location.href = "intent://settings#Intent;scheme=android-app;action=android.settings.APPLICATION_SETTINGS;end";
        }
    }
    
    $scope.deleteToken = () => {
        unSuscribeToNotifications($scope.authUser.email);
    }
    // #endregion NOTICIACIÓN

    // #region Leaflet 
    //https://leaflet-extras.github.io/leaflet-providers/preview/ 

    initializeMap = () => {
        if (!map) {
            map = L.map('map');
            addLayers();
            rosanautica();
        }
    }

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
        let greenIcon = getMarkerIcon(campo.type);
        if (!marker[campo.key]) {
            marker[campo.key] = L.marker(coord, { icon: greenIcon });
            map.addLayer(marker[campo.key]);
            if (campo.type == "Sensor") { 
                for (let i = 0; i < campo.sensors.sensorNumber; i++) {
                    let sensorId = "S" + i;
                    let sensor = campo.sensors[sensorId];
                    let sensorCoord = [sensor.latitude, sensor.longitude];
                    marker[sensor.id] = L.marker(sensorCoord, { icon: greenIcon });
                    map.addLayer(marker[sensor.id]);
                    marker[sensor.id].bindPopup(() => {
                        const popupContent = document.createElement('div');
                        popupContent.innerHTML = getSensorText(campo, sensor, i);
                        setTimeout(() => { 
                            $scope.setChart(i); 
                        }, 0);
                        return popupContent;
                    });
                }
            }
        }
        let text = getMarkerText(campo);
        marker[campo.key].bindPopup(text);
    }

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
                icon = "./assets/images/marcador.png";
                break;
        }
        return L.icon({
            iconUrl: icon,
            shadowUrl: '',
            iconSize: [52, 52], // size of the icon
            shadowSize: [50, 64], // size of the shadow
            iconAnchor: [26, 52], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 62],  // the same for the shadow
            popupAnchor: [0, -52] // point from which the popup should open relative to the iconAnchor
        });
    }

    const getMarkerText = (campo) => {
        let text = `<table class="striped highlight">`;
        text += `    <tr>`;
        text += `        <td style="text-align: left;">Nombre:</td>`;
        text += `        <td style="text-align: left;"><b>${campo.name ? campo.name : "" }</b></td>`;
        text += `    </tr>`;
        if (campo.type != 'Sensor') {
            text += `    <tr>`;
            text += `        <td style="text-align: left;">Estado:</td>`;
            text += `        <td style="text-align: left;"><b>${campo.log.state ? "Encendido" : "Apagado" }</b></td>`;
            text += `    </tr>`;
            text += `    <tr>`;
            text += `        <td style="text-align: left;">Velocidad:</td>`;
            text += `        <td style="text-align: left;"><b>${campo.direction ? "Avanzar" : "Retroceder"} ${campo.log ? campo.log.speed : 0}%</b></td>`;
            text += `    </tr>`;
            text += `    <tr>`;
            text += `        <td style="text-align: left;">Caudal:</td>`;
            text += `        <td style="text-align: left;"><b>${campo.caudal ? campo.caudal : "0" }</b> m<sup>3</sup>/s</td>`;
            text += `    </tr>`;
        }
        // text += `    <tr>`;
        // text += `        <td style="text-align: left;">Hr:</td>`;
        // text += `        <td style="text-align: left;"><b>${ $scope.meteo[campo.key].main.humidity ? $scope.meteo[campo.key].main.humidity : "" }%</b></td>`;
        // text += `    </tr>`;
        // text += `    <tr>`;
        // text += `        <td style="text-align: left;">Tamb:</td>`;
        // text += `        <td style="text-align: left;"><b>${ $scope.meteo[campo.key].main.temp ? ($scope.meteo[campo.key].main.temp - 273.15).toFixed(1) : "" }°C</b></td>`;
        // text += `    </tr>`;
        // text += `    <tr>`;
        // text += `        <td style="text-align: left;">Viento:</td>`;
        // text += `        <td style="text-align: left;"><b>${ $scope.meteo[campo.key].wind.speed ? ($scope.meteo[campo.key].wind.speed).toFixed(1) : "" } km/h</b></td>`;
        // text += `    </tr>`;
        text += `    <tr>`;
        text += `        <td style="text-align: left;">Localiz:</td>`;
        text += `        <td style="text-align: left;">[<b>${campo.latitude.toFixed(5)},${campo.longitude.toFixed(5)}</b>]</td>`;
        text += `    </tr>`;
        text += `</table>`;
        return text;
    }

    const setSensorList = (campo) => {
    }

    const getSensorText = (campo, sensor, idx) => {
        // let data = JSON.parse(campo.log.dataRaw.replace(/""/g, '"","",""'));
        let data = campo.log ? JSON.parse(campo.log.dataRaw) : [];
        let text = `<br>`;
        text += `<div style="padding: 5px 10px;">`;
        text += `    <div class="row" style="margin-bottom: 5px; border-bottom: 1px solid #ccc;">`;
        text += `        <div class="col s1"><i class="material-icons">place</i></div>`;
        text += `        <div class="col s11">`;
        text += `            <b><span style="font-size: 1.2em;">${sensor.alias ? sensor.alias : "" }</span></b><br>`;
        text += `            <span style="font-size: .8em;">${sensor.id }</span>`;
        text += `        </div>`;
        text += `    </div>`;
        text += `    <div class="row" style="margin-bottom: 5px;">`;
        text += `       <div class="col s12" style="height: 250px !important;">`;
        text += `           <canvas id="myChart${idx}"></canvas>`;
        text += `       </div>`;
        text += `    </div>`;
        text += `    <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 3px; background-color: #f5f5f5;">`;
        text += `        <div class="col s2"><img src="./assets/images/agua.png" alt="Agua" style="width: 20px;"></div>`;
        text += `        <div class="col s8">`;
        text += `           <div style="font-size: .8em;">Humedad del suelo (%)</div>`;
        text += `           <div style="width: 100%; background-color: lightgrey; height: 6px; border-radius: 3px;">`;
        text += `               <div style="background-color: ` + (data[idx * 3] < sensor.h.minValue || data[idx * 3] > sensor.h.maxValue ? `red` : `green`) + `; width: ` + data[idx * 3] + `%; height: 6px; border-radius: 3px;"></div>`;
        text += `               <span style="font-size: .6em; margin-left: ` + sensor.h.minValue + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i>${sensor.h.minValue}%</span>`;
        text += `               <span style="font-size: .6em; margin-left: ` + (sensor.h.maxValue - sensor.h.minValue - 15) + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i>${sensor.h.maxValue}%</span>`;
        text += `           </div>`;
        text += `        </div>`;
        text += `        <div class="col s2" style="text-align: right; font-size: 1.5em; color: ` + (data[idx * 3] < sensor.h.minValue || data[idx * 3] > sensor.h.maxValue ? `red` : `green`) + `;"><b>${data[idx * 3] !== "NaN" ? parseFloat(data[idx * 3]).toFixed(0) : ""}%</b></div>`;
        text += `    </div>`;
        text += `    <div class="row" style="margin-bottom: 5px; padding: 10px; border-radius: 6px; background-color: #f5f5f5;">`;
        text += `        <div class="col s2"><img src="./assets/images/termometro.png" alt="Termometro" style="width: 20px;"></div>`;
        text += `        <div class="col s8">`;
        text += `           <div style="font-size: .8em;">Temperatura (°C)</div>`;
        text += `           <div style="width: 100%; background-color: lightgrey; height: 6px; border-radius: 3px;">`;
        text += `               <div style="background-color: ` + (data[idx * 3 + 1] < sensor.t.minValue || data[idx * 3 + 1] > sensor.t.maxValue ? `red` : `green`) + `; width: ` + data[idx * 3 + 1] + `%; height: 6px; border-radius: 3px;"></div>`;
        text += `               <span style="font-size: .6em; margin-left: ` + sensor.t.minValue + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i>${sensor.t.minValue}°C</span>`;
        text += `               <span style="font-size: .6em; margin-left: ` + (sensor.t.maxValue - sensor.t.minValue - 15) + `%"><i class="material-icons" style="font-size: 1.5em;">arrow_upward</i>${sensor.t.maxValue}°C</span>`;
        text += `           </div>`;
        text += `        </div>`;
        text += `        <div class="col s2" style="text-align: right; font-size: 1.5em; color: ` + (data[idx * 3 + 1] < sensor.t.minValue || data[idx * 3 + 1] > sensor.t.maxValue ? `red` : `green`) + `;"><b>${data[idx * 3 + 1] !== "NaN" ? parseFloat(data[idx * 3 + 1]).toFixed(0) : ""}°C</b></div>`;
        text += `    </div>`;
        text += `</div>`;
        return text;
    }

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

    const showPCPosition = (campo) => {
        if (campo.log && campo.log.latitude && campo.log.longitude && campo.log.latitude != "0.00000" && campo.log.longitude != "0.00000") {
            polygon = [
                [campo.latitude, campo.longitude],
                [campo.log.latitude, campo.log.longitude]
            ];
            if (indicator[campo.key]) {
                map.removeLayer(indicator[campo.key]);
            }
            indicator[campo.key] = L.polygon(polygon);
            map.addLayer(indicator[campo.key]);
        }
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
                    let color = $scope.isPlotActive(campo, "p" + i) ? "lightgreen" : "blue";
                    // let color = campo.position == i ? "lightgreen" : "blue";
                    poligons[campo.key + idx] = L.polygon(newPoligon, { color: color });
                    // poligons[campo.key + idx].bindPopup("<a class='modal-trigger' href='#modalConfig' style='color: black;'>" + campo.plots[idx].name + "</a>");
                    // poligons[campo.key + idx].bindPopup(`<a class="modal-trigger" href="#modalEditRiegoEstacionario" style="color: black;" ng-click="setEditPlanEstacionario('${idx}')">${campo.plots[idx].name}</a>`);
                    let msg = ``;
                    msg += `<table class="striped highlight">`;
                    msg += `    <tr>`;
                    msg += `        <td style="text-align: left;">Nombre:</td>`;
                    msg += `        <td style="text-align: left;"><b>${campo.plots[idx].name}</b></td>`;
                    msg += `    </tr>`;
                    msg += `    <tr>`;
                    msg += `        <td style="text-align: left;">Cultivo:</td>`;
                    msg += `        <td style="text-align: left;"><b>${campo.plots[idx].culture}</b></td>`;
                    msg += `    </tr>`;
                    msg += `    <tr>`;
                    msg += `        <td style="text-align: left;">Caudal:</td>`;
                    msg += `        <td style="text-align: left;"><b>${campo.plots[idx].caudal}</b></td>`;
                    msg += `    </tr>`;
                    poligons[campo.key + idx].bindPopup(msg);
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

    // function showFields() {
    //     let campos = $scope.systems;
    //     for (let idx in campos) {
    //         let campo = campos[idx];
    //         coordinate = [campo.latitude, campo.longitude];
    //         let text = `
    //             <a href='javascript:angular.element(
    //                 document.getElementById("ControladorPrincipal")).scope().showSelectdSystem("${campo.key}");'>
    //                 <h6>${campo.name}</h6>
    //                 Estado: ${campo.status}<br>
    //                 Riego: ${campo.irrigation == "a" ? "Automático" : campo.irrigation == "s" ? "Semiautomático" : "Manual"}<br>
    //                 Config: ${campo.direction} ${campo.velocity}%<br>
    //                 Caudal: ${campo.caudal}"<br>
    //                 Lat: ${campo.latitude}<br>
    //                 Lng: ${campo.longitude}
    //             </a>`;
    //         addMarker(coordinate, text);
    //         addCircle(coordinate, parseInt(campo.length), campo);
    //     }
    //     // coord = [28.7114403, -106.9131596]
    //     // addMarker(coord, 'DTA-Agrícola<br>' + new Date());
    //     // addCircle(coord, 30);
    // }

    // function addPopup(coord = [28.407, -106.867], text = "DTA-Agrícola") {
    //     L.popup()
    //         .setLatLng(coord)
    //         .setContent(text)
    //         .openOn(map);
    // }

    // function addPolygon(polygon = [
    //     [51.509, -0.08],
    //     [51.503, -0.06],
    //     [51.51, -0.047]
    // ]) {
    //     L.polygon(polygon).addTo(map);
    // }

    // geoLocation = (key) => {
    //     map.locate({
    //         setView: true,
    //         maxZoom: 17
    //     });
    //     map.on('locationfound', onLocationFound);
    //     map.on('locationerror', onLocationError);
    // }

    // onLocationFound = (e) => {
    //     // var radius = e.accuracy;
    //     // L.circle(e.latlng, radius).addTo(map);
    //     // L.marker(e.latlng).addTo(map)
    //     //     .bindPopup("Ud. está aquí con un error " + radius + " metros").openPopup();
    // }

    // onLocationError = (e) => {
    //     alert(e.message);
    // }

    // #endregion Leaflet

    // #region Chart.js

    const chartZoom = document.querySelector("#chartZoom");

    // chartZoom.addEventListener("change", e => {
    //     $scope.chartItems = parseInt(chartZoom.value);
    //     showChart();
    // });

    $scope.setChart = (chartId, chartLabel = "myChart" + chartId) => {
        getMeassurementValues($scope.actualSystem.key, $scope.chartItems).then(result => {
            let idx = 'S' + chartId;
            let title = $scope.actualSystem.sensors[idx].alias ? $scope.actualSystem.sensors[idx].alias : $scope.actualSystem.sensors[idx].id;
            switch ($scope.actualSystem.sensors[idx].type) {
                case "Ms":
                    processResultsFromMsSensors(result, title, chartId, chartLabel);
                    break;
                case "SHT":
                    processResultsFromSHTSensors(result, title, chartId, chartLabel);
                    break;
                case "SHT4":
                    processResultsFromSHT4Sensors(result, title, chartId, chartLabel);
                    break;
            }
        });
    }

    const showChart_old = () => {
        getMeassurementValues($scope.actualSystem.key, $scope.chartItems).then(result => {
            for (let i = 0; i < $scope.actualSystem.sensors.sensorNumber; i++) {
                let idx = 'S' + i;
                let title = $scope.actualSystem.sensors[idx].alias ? $scope.actualSystem.sensors[idx].alias : $scope.actualSystem.sensors[idx].id;
                switch ($scope.actualSystem.sensors[idx].type) {
                    case "Ms":
                        processResultsFromMsSensors(result, title, i);
                        break;
                    case "SHT":
                        processResultsFromSHTSensors(result, title, i);
                        break;
                    case "SHT4":
                        processResultsFromSHT4Sensors(result, title, i);
                        break;
                }
            }
        });
    }

    const processResultsFromMsSensors = (result, title, i, chartLabel) => {
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
        chart(moisture, temperature, labels, title, i, chartLabel);
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

    const processResultsFromSHTSensors = (result, title, i, chartLabel) => {
        const items = result[0] ? parseInt(JSON.parse(result[0].dataRaw).length / 3) : 0;
        let labels = [];
        let moisture = [];
        let humidity = [];
        let temperature = [];
        lastDate = "";
        result.forEach(element => {
            let data = JSON.parse(element.dataRaw);
            moisture.push(data[i * 3 + 1]);
            temperature.push(data[i * 3]);
            date = element.date.substr(6, 2) + "/" + element.date.substr(4, 2);
            if (lastDate != date) {
                lastDate = date;
            } else {
                date = "";
            }
            labels.push(date + " " + element.date.substr(9, 14));
        });
        chart(moisture, humidity, temperature, labels, title, i, chartLabel);
    }

    const processResultsFromSHT4Sensors = (result, title, i, chartLabel) => {
        const items = result[0] ? parseInt(JSON.parse(result[0].dataRaw).length / 4) : 0;
        let labels = [];
        let moisture = [];
        let humidity = [];
        let temperature = [];
        lastDate = "";
        result.forEach(element => {
            let data = JSON.parse(element.dataRaw);
            moisture.push(data[i * 3]);
            humidity.push(data[i * 3 + 1]);
            temperature.push(data[i * 3 + 2]);
            date = element.date.substr(6, 2) + "/" + element.date.substr(4, 2);
            if (lastDate != date) {
                lastDate = date;
            } else {
                date = "";
            }
            labels.push(date + " " + element.date.substr(9, 14));
        });
        chart(moisture, humidity, temperature, labels, title, i, chartLabel);
    }

    const chart = (moisture, humidity, temperature, labels, title, i, chartLabel) => {
        try {
            let canvas = document.getElementById(chartLabel);
            if (!canvas) return;
            if (charts[i]) charts[i].destroy();
            let type = moisture.length < 14 ? 'bar' : 'line';
            charts[i] = new Chart(canvas, {
                type: type,
                data: getDataArray(moisture, humidity, temperature, labels),
                options: getOptions(title)
            });
            if (canvas.parentNode) canvas.parentNode.style.height = '250px';    
        } catch (error) {
            console.error('Error al crear el gráfico:', error);
        }
    }

    const skipped = (ctx, value) => ctx.p0.skip || ctx.p1.skip ? value : undefined;

    const getDataArray = (_moisture, _humidity, _temperature, _labels) => {
        let moisture = {
            label: "Humedad suelo",
            data: _moisture,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderWidth: 1,
            type: 'line',
            segment: {
              borderDash: ctx => skipped(ctx, [3, 3]),
            },
            spanGaps: true,
            pointRadius: 0
        }
        let humidity = {
            label: "Humedad ambiente",
            data: _humidity,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderWidth: 1,
            type: 'line',
            segment: {
              borderDash: ctx => skipped(ctx, [3, 3]),
            },
            spanGaps: true,
            pointRadius: 0
        }
        let temperature = {
            label: "Temperatura",
            data: _temperature,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderWidth: 1,
            type: 'line',
            segment: {
              borderDash: ctx => skipped(ctx, [3, 3]),
            },
            spanGaps: true,
            pointRadius: 0
        }
        return {
            labels: _labels,
            datasets: [moisture, humidity, temperature]
        }
    }

    const getOptions = (_title) => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    type: 'linear',
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 10
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: _title
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
        }
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
        console.log(window.navigator.userAgent);
        document.getElementById('contenido').style.display = 'none';
        requestWakeLock();
        // getLocation();
        initializeMap();
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
installBtn1.style.display = 'none';
const installBtn2 = document.querySelector('#installBtn2');
installBtn2.style.display = 'none';

window.addEventListener("beforeinstallprompt", eventHandler, errorHandler);

function eventHandler(event) {
    beforeInstallPrompt = event;
    installBtn1.style.display = 'block';
    installBtn2.style.display = 'block';
}

function errorHandler(e) {
    console.log('error: ' + e);
}

function instalar() {
    if (beforeInstallPrompt) beforeInstallPrompt.prompt();
}

function serviceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js')
            .then(reg => {
                enablePushNotifications();
                console.log("Service Worker registrado correctamente: ", reg); 
            })
            .catch(err => console.log("Error registrado Service Worker", err));
    }
}

serviceWorker();

enablePushNotifications = () => {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            navigator.serviceWorker.ready.then(sw => {
                sw.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: 'BG1caHGzzvPNBWM4NuN5oIpqaRaVFKld8iwNtpx100P3bkMYhEDYfWcCs9sy0Ay3t170750tQlLM8XCzxpysD7o'
                }).then(subscription => {
                    subscriptionJSON = JSON.stringify(subscription);
                    console.log(subscriptionJSON);
            })
            })
        }
    })
}

handleTokenRefresh = (email) => {
    if (authUser && !userTokenList || !userTokenList.some(item => item === subscriptionJSON)) {
        userTokenList.push(subscriptionJSON);
        setUserToken(email, userTokenList);
        segundoPlano();
    }
}

send_push = (subscription) => {
    const endpoint = encodeURIComponent(subscription);
    const payload = encodeURIComponent('{"title":"Hola desde PHP", "body":"Mi notificación en PHP", "icon":"icon-192.png", "url":"./?v=0.1"}');

    fetch(`http://localhost/web_push/ws/send_push.php?endpoint='${endpoint}'&payload='${payload}'`, {
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

window.addEventListener("beforeunload", function (e) {
    document.getElementById("mensaje").innerHTML = "Si se va no se guardarán los datos";
    (e || window.event).returnValue = null;
    return null;
}, true);

// Set the badge
const unreadCount = 24;
navigator.setAppBadge(unreadCount).catch((error) => {
    //Do something with the error.
});

// Clear the badge
navigator.clearAppBadge().catch((error) => {
    // Do something with the error.
});

// #endregion Progresive Web Application
