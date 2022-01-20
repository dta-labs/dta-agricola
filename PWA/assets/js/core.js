var map = null;
var canvas = L.canvas();
var svg = L.svg();
var marker = {};
var shape = {};
var indicator = {};

let deferredPrompt;
const installBtn = document.querySelector('#installBtn');
installBtn.style.display = 'none';

// #region Controlador Angular

var app = angular.module("Administracion", ["ngRoute"]);

app.config(function ($routeProvider) {
    $routeProvider
        // .when("/", {
        //     template: "<p ng-init='showListado()' style='display: none;'>listado</p>"
        // })
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
        .when("/login", {
            template: "<p ng-init='showLogin()' style='display: none;'>servicios</p>"
        });
});

app.controller("ControladorPrincipal", function ($scope) {

    $scope.selectedWindow = 'intro';
    let listeners = {};
    $scope.systems = {};
    $scope.systemsFails = {};
    $scope.showMore = false;
    $scope.statisticSelectedSystem = {};
    let sendCommand = {};
    $scope.logs = {};
    $scope.as_config = false;
    $scope.as_adjust = false;
    $scope.as_more = false;
    $scope.as_hist = false;

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

    $scope.showLogin = () => {
        $scope.showWindow('login');
    }

    $scope.showWindow = windowsName => {
        $scope.showMore = false;
        $scope.selectedWindow = windowsName;
        if (windowsName == "listado") {
            systemsETL();
        }
        window.scrollTo(0, 0);
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
        document.getElementById("intro").style.display = "none";
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
    }

    listenUserStatus = () => {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // $scope.$apply(function () {
                $scope.authUser = user;
                getUserData();
                // });
            } else {
                $scope.$apply(function () {
                    $scope.authUser = null;
                });
                //location.href = "./landing/index.html"
            }
        });
    };

    getUserData = () => {
        getUserLocations();
        suscribeToNotifications(convertDotToDash($scope.authUser.email));
    }

    getUserLocations = () => {
        loadUserLocations($scope.authUser.email).then(result => {
            $scope.userLocations = result;
            loadSystems();
            $scope.$apply();
        });
    }

    $scope.logout = () => {
        firebase.auth().signOut().then(function () {
            //ui = null;
            $scope.showWindow("login");
            $scope.authUser = null;
            $scope.tipoUsuario = 0;
            // ui.start("#firebaseui-auth-container", uiConfig);
            //logoutAutUser();
            //document.getElementById("logout").style.display = "none";
        });
    };

    // #endregion USER

    // #region DEVICES

    loadSystems = () => {
        if ($scope.authUser) {
            let userSystems = $scope.userLocations[convertDotToDash($scope.authUser.email)].systems;
            let lastLocation = Object.keys(userSystems)[Object.keys(userSystems).length - 1];
            for (let locationKey in userSystems) {
                listeners[locationKey] = firebase.database().ref("systems/" + locationKey + "/settings");
                listeners[locationKey].on("value", system => {
                    if (system.val()) {
                        $scope.systems[locationKey] = system.val();
                        $scope.systems[locationKey].key = locationKey;
                        loadSystemLog(locationKey);
                        // $scope.showWindow('listado');
                        if (locationKey == lastLocation) {
                            $scope.$apply();
                        }
                        if ($scope.actualSystem && locationKey == $scope.actualSystem.key) { $scope.selectSystem($scope.systems[locationKey]); }
                    }
                });
            }
            $scope.showWindow('listado');
        }
    }

    loadSystemLog = (locationKey) => {
        firebase.database().ref("systems/" + locationKey + "/logs").on("value", logs => {
            if (logs.val()) {
                $scope.logs[locationKey] = logs.val();
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
                findCommErrors();
                if (document.getElementById('pos_' + locationKey)) {
                    document.getElementById('pos_' + locationKey).style.transform = 'rotate(' + position + 'deg)';
                }
                updateCompass();
                let status = log.state;
                hideSpinner(locationKey, status);
                if ($scope.actualSystem && locationKey == $scope.actualSystem.key) { $scope.selectSystem($scope.systems[locationKey]); }
                $scope.$apply();
            }
        });
    }

    findCommErrors = () => {
        for (let systemId in $scope.systems) {
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
            day: parseInt(dif / (1000 * 60 * 60 * 60)),
            hour: parseInt(dif / (1000 * 60 * 60)),
            min: parseInt(dif / (1000 * 60))
        };
    }

    sendAlertSMS = (celular, name, cmd) => {
        let msg = `DTA-Agrícola: Alerta ${name} ${cmd}!!!`;
        sendSMS_XMLHttp(celular, msg);
    }

    $scope.showSelectdSystem = (systemKey) => {
        showSpinner();
        $scope.selectSystem($scope.systems[systemKey]);
    }

    $scope.selectSystem = (system) => {
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
        setActualSystemPlans();
        invertLog();
        // $scope.actualSystem.posicionActual = parseInt($scope.actualSystem.log.position ? $scope.actualSystem.log.position : "0") + parseInt($scope.actualSystem.summerHour ? $scope.actualSystem.summerHour : "0");
        showPlanRiegoPie();
        hideTheSpinner();
        $scope.showWindow('sistema');
        updateCompass();
        initializeSystemMap($scope.actualSystem);
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
        if ($scope.logs[$scope.actualSystem.key]) {
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

    $scope.setMachineState = () => {                                       // New *******************
        $scope.setMachineSettings();
        sendCommand[$scope.actualSystem.key] = $scope.actualSystem.status ? "ON" : "OFF";
        showSpinner();
        if ($scope.actualSystem.type == "Nogal") {
            setTimeout(function () {
                hideTheSpinner();
            }, 15000);
        }
    }

    showSpinner = () => {
        document.getElementById("spinner").style.display = "flex";
    }

    hideSpinner = (locationKey, status) => {
        if (sendCommand[locationKey] == status) {
            hideTheSpinner();
        }
    }

    hideTheSpinner = () => {
        document.getElementById("spinner").style.display = "none";
    }

    $scope.setMachineSettings = () => {
        let key = $scope.actualSystem.key;
        $scope.actualSystem.status = $scope.actualSystem.status ? "ON" : "OFF";
        $scope.actualSystem.sensorSecurity = $scope.actualSystem.sensorSecurity ? "ON" : "OFF";
        $scope.actualSystem.sensorVoltage = $scope.actualSystem.sensorVoltage ? "ON" : "OFF";
        $scope.actualSystem.sensorPosition = $scope.actualSystem.sensorPosition ? "ON" : "OFF";
        $scope.actualSystem.autoreverse = $scope.actualSystem.autoreverse ? "ON" : "OFF";
        // $scope.actualSystem.sensorPresion = "" + $scope.actualSystem.sensorPresion;
        $scope.actualSystem.direction = $scope.actualSystem.direction ? "FF" : "RR";
        $scope.actualSystem.caudal = "" + $scope.actualSystem.caudal;
        $scope.actualSystem.delayTime = "" + $scope.actualSystem.delayTime;
        $scope.actualSystem.length = "" + $scope.actualSystem.length;
        $scope.actualSystem.latitude = "" + $scope.actualSystem.latitude;
        $scope.actualSystem.longitude = "" + $scope.actualSystem.longitude;
        $scope.actualSystem.plansLength = "" + $scope.actualSystem.plansLength;
        $scope.actualSystem.velocity = "" + $scope.actualSystem.velocity;
        $scope.actualSystem.sensorPresion = "" + $scope.actualSystem.sensorPresion;
        $scope.actualSystem.irrigation = "a";
        // $scope.actualSystem.irrigation = document.querySelector('input[name=groupRiego]:checked').getAttribute("data");
        setMachineSettings($scope.actualSystem);
        $scope.actualSystem.status = $scope.actualSystem.status == "ON" || $scope.actualSystem.status == true ? true : false;
        $scope.actualSystem.sensorSecurity = $scope.actualSystem.sensorSecurity == "ON" || $scope.actualSystem.sensorSecurity == true ? true : false;
        $scope.actualSystem.sensorVoltage = $scope.actualSystem.sensorVoltage == "ON" || $scope.actualSystem.sensorVoltage == true ? true : false;
        $scope.actualSystem.sensorPosition = $scope.actualSystem.sensorPosition == "ON" || $scope.actualSystem.sensorPosition == true ? true : false;
        $scope.actualSystem.autoreverse = $scope.actualSystem.autoreverse == "ON" || $scope.actualSystem.autoreverse == true ? true : false;
        $scope.actualSystem.direction = $scope.actualSystem.direction == "FF" || $scope.actualSystem.direction == true ? true : false;
        $scope.actualSystem.key = key;
        //sendSMS_XMLHttp($scope.campoActual.cell, cmd);
        // sendSMS_XMLHttp("+526251208106", cmd);
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
        window.scrollTo(0, 1000);
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
            // $scope.$apply();
        });
    }

    $scope.createNewDevice = () => {
        $scope.newDevice = {
            "autoreverse": "OFF",
            "booleanStatus": false,
            "brand": "",
            "caudal": "320",
            "delayTime": "10",
            "direction": "FF",
            "fertilization": "OFF",
            "installation": new Date(),
            "irrigation": "a",
            "key": "",
            "latitude": "",
            "length": "",
            "longitude": "",
            "name": "",
            "password": "",
            "plans": {
                "p0": {
                    "endAngle": "360",
                    "starAngle": "0",
                    "type": "velocity",
                    "value": "0"
                }
            },
            "plansLength": "1",
            "sensorPosition": "ON",
            "sensorPresion": "0",
            "sensorSecurity": "ON",
            "sensorVoltage": "ON",
            "status": "OFF",
            "summerHour": "0",
            "type": "",
            "velocity": "0",
            "zona": ((new Date()).getTimezoneOffset() / 60) * -1
        };
    }

    $scope.updateNewDevice = () => {
        if ($scope.newDevice.key && $scope.newDevice.name && $scope.newDevice.type && $scope.newDevice.zona) {
            updateNewDevice($scope.newDevice);
            updateDeviceUsers(convertDotToDash($scope.authUser.email), $scope.newDevice.key, "propietario");
            location.reload();
            // getUserData();
            // $scope.$apply();
            document.getElementById("modalNuevoEquipo").style.display = "none";
        }
    }

    $scope.install = () => {
    }

    $scope.reload = () => {
        document.location.reload();
    }

    // #endregion CONFIGURACIONES

    // #region PLAN DE RIEGO

    $scope.resetNewPlan = () => {
        let length = Object.keys($scope.actualSystem.plans).length;
        let index = `p${length - 1}`;
        document.getElementById("planAnguloIni").value = length > 0 ? $scope.actualSystem.plans[index].endAngle : 0;
        length > 0 ? document.getElementById("planAnguloIni").setAttribute("min", $scope.actualSystem.plans[index].endAngle) : null;
        document.getElementById("planAnduloFin").value = 360;
        document.getElementById("planValue").value = 0;
        // document.getElementById("planType").value = "velocity";
    }

    $scope.setNewPlan = (starAngle, endAngle, value, endGun) => {
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
            let newPlan = {
                starAngle: "" + starAngle,
                endAngle: "" + endAngle,
                value: "" + value,
                endGun: endGun
            }
            $scope.actualSystem.plans[index] = newPlan;
            $scope.actualSystem.plansLength = length + 1;
            showPlanRiegoPie();
            $scope.setMachineSettings();
        }
    }

    $scope.setEditPlan = (index) => {
        let idx = `p${index}`;
        let as = $scope.actualSystem.plans[idx];
        document.getElementById("editPlanAnguloIni").value = as.starAngle;
        document.getElementById("editPlanAnduloFin").value = as.endAngle;
        document.getElementById("editPlanValue").value = as.value;
        document.getElementById("editEndGun").value = as.endGun;
        $scope.editedPlan = idx;
    }

    $scope.setTimer = (value) => {
        document.getElementById("planValue").value = value;
        document.getElementById("editPlanValue").value = value;
    }

    $scope.editPlan = () => {
        let ep = $scope.actualSystem.plans[$scope.editedPlan];
        ep.starAngle = document.getElementById("editPlanAnguloIni").value;
        ep.endAngle = document.getElementById("editPlanAnduloFin").value;
        ep.value = document.getElementById("editPlanValue").value;
        ep.endGun = document.getElementById("editEndGun").value;
        showPlanRiegoPie();
        $scope.setMachineSettings();
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
        //drawPieGraph(dataPie);
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

    // #endregion PLAN DE RIEGO

    // #region NOTICIACIÓN
    $scope.setToken = () => {
        handleTokenRefresh(convertDotToDash($scope.authUser.email));
    }

    $scope.deleteToken = () => {
        unSuscribeToNotifications(convertDotToDash($scope.authUser.email));
    }
    // #endregion NOTICIACIÓN

    // #region Leaflet 
    //https://leaflet-extras.github.io/leaflet-providers/preview/ 

    initializeMap = () => {
        if (!map) {
            map = L.map('map');
            addLayers();
        }
    }
    
    addLayers = () => {
        let Satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(map);

        let Calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        let Calles_Terreno = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: 'abcd',
            minZoom: 0,
            maxZoom: 15,
            ext: 'png'
        });

        let Geologico = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
            maxZoom: 16
        });

        let Flubial = L.tileLayer('http://t{s}.freemap.sk/T/{z}/{x}/{y}.jpeg', {
            minZoom: 8,
            maxZoom: 16,
            subdomains: '1234',
            bounds: [
                [47.204642, 15.996093],
                [49.830896, 22.576904]
            ],
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, vizualization CC-By-SA 2.0 <a href="http://freemap.sk">Freemap.sk</a>'
        });

        let baseLayers = {
            "Calles  ": Calles,
            "Calles y terreno": Calles_Terreno,
            "Satélite": Satelite,
            // "Geológico": Geologico,
            // "Flubial": Flubial
        }

        L.control.layers(baseLayers).addTo(map);
    }

    initializeSystemMap = (system) => {
        if (system.latitude != "NaN" && system.longitude != "NaN") {
            let coord = [system.latitude, system.longitude];
            map.setView(coord, 15);
            //geoLocation(system.key);
            addMarker(system);
            addShape(system);
        }
    }

    addMarker = (campo) => {
        let coord = [campo.latitude, campo.longitude];
        let text = `
            <h6>${campo.name}</h6>
            Estado: <b>${campo.status == "ON" ? "Encendido" : "Apagado"}</b><br>
            Riego: <b>${campo.irrigation == "a" ? "Automático" : campo.irrigation == "s" ? "Semiautomático" : "Manual"}</b><br>
            Config: <b>${campo.direction == "FF" ? "Avanzar" : "Retroceder"} ${campo.velocity}%</b><br>
            Caudal: <b>${campo.caudal}"</b><br>
            Lat: <b>${campo.latitude}</b><br>
            Lng: <b>${campo.longitude}</b>
        `;

        if (!marker[campo.key]) { 
            // map.removeLayer(marker[campo.key]);
            marker[campo.key] = L.marker(coord);
            map.addLayer(marker[campo.key]);
        }
        marker[campo.key].bindPopup(text);
    }

    addShape = (campo) => {
        switch (campo.type) {
            case "PC":
                showPC(campo);
                break;
            case "PL":
                showPL(campo);
                break;
            case "Nogal":
                showNogal(campo);
        } 
    }

    showPC = (campo) => {
        let radius = campo.length ? parseInt(campo.length) : 50;
        let coord = [campo.latitude, campo.longitude];
        if (shape[campo.key]) { 
            map.removeLayer(shape[campo.key]);
        }
        shape[campo.key] = semiCircle(coord, radius, campo.startAngle, campo.endAngle, $scope.getColor(campo, "fill"));
        map.addLayer(shape[campo.key]);
        
        if (campo.log && campo.log.latitude != "NaN" && campo.log.longitude != "NaN") {
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

    showPL = (campo) => {}

    showNogal = (campo) => {}

    semiCircle = (coord, radius, startAngle, stopAngle, color) => {
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
        color = type == "fill" ? "lightseagreen" : "green" ;
        return campo.log && campo.log.voltage == "false" ? 'red' : campo.log && campo.log.safety == "false" ? 'palevioletred' : campo.log.state == "ON" ? color : 'lightgrey';
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

    const requestWakeLock = async () => {
        try {
          const wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          // The wake lock request fails - usually system-related, such as low battery.
          console.log(`${err.name}, ${err.message}`);
        }
    }
      
    $scope.inicializacion = () => {
        requestWakeLock();
        initializeMap();
        listenUserStatus();
        setTimeout(function () {
            if (!$scope.authUser) {
                $scope.showWindow('login');
                $scope.$apply();
            } else {
                $scope.showWindow('listado');
            }
        }, 5000);
    }

});

// #endregion Controlador Angular

// #region Materializes

document.addEventListener('DOMContentLoaded', function () {
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'));
    M.FormSelect.init(document.querySelectorAll('.select'));
});

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
    // if (navigator.geolocation) {
    //     navigator.geolocation.getCurrentPosition(showPosition, error, {
    //         maximumAge: 60000,
    //         timeout: 4000
    //     });
    // } else {
    //     M.toast({
    //         html: 'Geolocalización no soportada'
    //     });
    // }
}

// function showPosition(position) {
//     let milatitud = position.coords.latitude;
//     let milongitud = position.coords.longitude;
//     let miaccuracy = position.coords.accuracy;
//     M.toast({
//         html: "Lat: " + milatitud + "° Lng: " + milongitud + "° Err: " + miaccuracy + "m"
//     });
//     let miCoord = [milatitud, milongitud];
//     addMarker(miCoord, 'Posición actual:<br>Lat: ' + milatitud + '°<br>Lng: ' + milongitud + '°<br>Err: ' + miaccuracy + 'm');
// }

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

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    installBtn.style.display = 'block';
    installBtn.addEventListener('click', (e) => {
        // hide our user interface that shows our A2HS button
        installBtn.style.display = 'none';
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('El usuario aceptó la instalación de la aplicación...');
            } else {
                console.log('El usuario rechazó la instalación de la aplicación...');
            }
            deferredPrompt = null;
        });
    });
});
