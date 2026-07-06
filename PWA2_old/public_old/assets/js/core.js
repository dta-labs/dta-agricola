var map;

initializeMap();

//#region Controlador Angular

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
            template: "<p ng-init='showHome()' style='display: none;'>sistema</p>"
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

    $scope.selectedWindow = 'login';
    $scope.systems = {};
    $scope.showMore = false;
    $scope.riegoOpciones = [
        {
            "value": "automatico",
            "name": "Automático"
        },
        {
            "value": "manual",
            "name": "Manual"
        }
    ];
    $scope.sistemaOpciones = ["Desplazamiento", "Estacionarios"];
    let sendCommand = {};
    $scope.logs = {};

    $scope.showListado = () => {
        $scope.showWindow('listado');
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
            loadSystems();
        }
        window.scrollTo(0, 0);
    }

    listenUserStatus = () => {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                $scope.$apply(function () {
                    $scope.authUser = user;
                    getUserLocations(user, true);
                });
            } else {
                $scope.$apply(function () {
                    $scope.authUser = null;
                });
            }
        });
    };

    getUserLocations = () => {
        loadUserLocations($scope.authUser.email).then(result => {
            $scope.userLocations = result;
            loadSystems();
            $scope.showWindow('listado');
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

    loadSystems = () => {
        if ($scope.authUser) {
            for (let locationKey in $scope.userLocations[convertDotToDash($scope.authUser.email)].systems) {
                firebase.database().ref("systems/" + locationKey + "/settings").on("value", system => {
                    if (system.val()) {
                        $scope.systems[locationKey] = system.val();
                        $scope.systems[locationKey].key = locationKey;
                        loadSystemLog(locationKey);
                        $scope.$apply();
                    }
                });
            }
        }
    }

    loadSystemLog = (locationKey) => {
        firebase.database().ref("systems/" + locationKey + "/logs").on("value", logs => {
            if (logs.val()) {
                $scope.logs[locationKey] = logs.val();
                let length = Object.keys($scope.logs[locationKey]).length;
                let myLogs = $scope.logs[locationKey];
                $scope.systemSafety = myLogs[Object.keys($scope.logs[locationKey])[length - 1]].safety;
                if ($scope.systemSafety == "false") {
                    document.getElementById(locationKey).style.background = "red";
                    //sendAlertSMS($scope.systems[locationKey].celular, $scope.systems[locationKey].name, "está atascada");
                    showToast($scope.systems[locationKey].name, "está atascada");
                }
                $scope.systemVoltage = myLogs[Object.keys($scope.logs[locationKey])[length - 1]].voltage;
                if ($scope.systemVoltage == "false") {
                    document.getElementById(locationKey).style.background = "red";
                    //sendAlertSMS($scope.systems[locationKey].celular, $scope.systems[locationKey].name, "tiene falla de electricidad");
                    showToast($scope.systems[locationKey].name, "tiene falla de electricidad");
                }
                let status = myLogs[Object.keys($scope.logs[locationKey])[length - 1]].state;
                hideSpinner(locationKey, status);
                $scope.$apply();
            }
        });
    }

    showToast = (name, cmd) => {
        M.toast({html: `Alerta ${name} ${cmd}!!!`});
    }

    sendAlertSMS = (celular, name, cmd) => {
        let msg = `DTA-Agrícola: Alerta ${name} ${cmd}!!!`;
        sendSMS_XMLHttp(celular, msg);
    }

    $scope.selectSystem = (system) => {
        $scope.actualSystem = system;
        // $scope.actualSystem.booleanStatus = $scope.actualSystem.status == "ON" ? true : false;
        $scope.actualSystem.status = $scope.actualSystem.status == "ON" ? true : false;
        $scope.actualSystem.direction = $scope.actualSystem.direction == "FF" ? true : false;
        $scope.actualSystem.irrigation = $scope.actualSystem.irrigation == "automatico" ? true : false;
        showPlanRiegoPie();
        $scope.showWindow('sistema');
    }

    $scope.setMachineState = () => {                                       // New *******************
        $scope.setMachineSettings();
        showSpinner();
    }

    showSpinner = () => {
        sendCommand[$scope.actualSystem.key] = $scope.actualSystem.status ? "ON" : "OFF";
        document.getElementById("spinner").style.display = "flex";
    }

    hideSpinner = (locationKey, status) => {
        if (sendCommand[locationKey] == status) {
            document.getElementById("spinner").style.display = "none";
        }
    }

    $scope.setMachineSettings = () => {                                    // New *******************
        let key = $scope.actualSystem.key;
        // $scope.actualSystem.status = $scope.actualSystem.booleanStatus ? "ON" : "OFF";
        $scope.actualSystem.status = $scope.actualSystem.status ? "ON" : "OFF";
        $scope.actualSystem.direction = $scope.actualSystem.direction ? "FF" : "RR";
        $scope.actualSystem.irrigation = $scope.actualSystem.irrigation ? "automatico" : "manual";
        $scope.actualSystem.caudal = "" + $scope.actualSystem.caudal;
        $scope.actualSystem.length = "" + $scope.actualSystem.length;
        $scope.actualSystem.latitude = "" + $scope.actualSystem.latitude;
        $scope.actualSystem.longitude = "" + $scope.actualSystem.longitude;
        $scope.actualSystem.plansLength = "" + $scope.actualSystem.plansLength;
        $scope.actualSystem.velocity = "" + $scope.actualSystem.velocity;
        setMachineSettings($scope.actualSystem);
        $scope.actualSystem.status = $scope.actualSystem.status == "ON" ? true : false;
        $scope.actualSystem.direction = $scope.actualSystem.direction == "FF" ? true : false;
        $scope.actualSystem.irrigation = $scope.actualSystem.irrigation == "automatico" ? true : false;
        $scope.actualSystem.key = key;
        //sendSMS_XMLHttp($scope.campoActual.cell, cmd);
        // sendSMS_XMLHttp("+526251208106", cmd);
    }

    $scope.setMyPossition = () => {
        getLocation();
    }

    $scope.showMoreSettings = () => {
        $scope.showMore = true;
        document.getElementById("riegoSelector").click();
        document.getElementById("sistemaSelector").click();
    }

    //#region Plan de riego

    $scope.resetNewPlan = () => {
        let length = Object.keys($scope.actualSystem.plans).length;
        let index = `p${length - 1}`;
        document.getElementById("planAnguloIni").value = length > 0 ? $scope.actualSystem.plans[index].endAngle : 0;
        length > 0 ? document.getElementById("planAnguloIni").setAttribute("min", $scope.actualSystem.plans[index].endAngle) : null;
        document.getElementById("planAnduloFin").value = 360;
        document.getElementById("planValue").value = 0;
        document.getElementById("planType").value = "velocity";
    }

    $scope.setNewPlan = () => {
        if (!$scope.actualSystem.plans) {
            $scope.actualSystem["plans"] = {};
        }
        let length = Object.keys($scope.actualSystem.plans).length;
        let index = `p${length}`;
        let newPlan = {
            index: index,
            starAngle: "" + document.getElementById("planAnguloIni").value,
            endAngle: "" + document.getElementById("planAnduloFin").value,
            value: "" + document.getElementById("planValue").value,
            type: "velocity"
            // type: document.getElementById("planType").value
        }
        $scope.actualSystem.plans[index] = newPlan;
        $scope.actualSystem.plansLength = length + 1;
        showPlanRiegoPie();
        $scope.setMachineSettings();
    }

    $scope.deletePlan = (index) => {
        if (index) {
            delete $scope.actualSystem.plans[index];
        } else {
            $scope.actualSystem.plans = "";
        }
        showPlanRiegoPie();
        $scope.setMachineSettings();
    }

    showPlanRiegoPie = () => {
        let dataPie = [];
        let maxAngle = 0;
        if ($scope.actualSystem.plans) {
            for (let i in $scope.actualSystem.plans) {
                let label = $scope.actualSystem.plans[i].id;
                let data = parseInt(($scope.actualSystem.plans[i].endAngle - $scope.actualSystem.plans[i].starAngle) * 100 / 360);
                dataPie.push({ "label": label, "data": data });
                maxAngle = $scope.actualSystem.plans[i].endAngle;
            }
            if (maxAngle < 360) {
                dataPie.push({ "label": "-1", "data": 100 - maxAngle * 100 / 360 });
            }
        } else {
            dataPie = [{ "label": "0", "data": 100 }];
        }
        drawPieGraph(dataPie);
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

    //#endregion Plan de riego

    $scope.inicializacion = () => {
        listenUserStatus();
    }

});

//#endregion Controlador Angular

//#region Materializes

document.addEventListener('DOMContentLoaded', function () {
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'));
    M.FormSelect.init(document.querySelectorAll('select'));
});

//#endregion Materializes

//#region SMS

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

function sendSMS_XMLHttp(cell, cmd = "OFF") {
    if (cell) {
        var data = JSON.stringify({
            "messages": [
                {
                    "source": "mashape",
                    "from": "+525549998455",
                    "body": cmd,
                    "to": cell,
                    "schedule": "1452244637",
                    "custom_string": ""
                }
            ]
        });

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;

        xhr.addEventListener("readystatechange", function () {
            if (this.readyState === this.DONE) {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", "https://clicksend.p.rapidapi.com/sms/send");
        xhr.setRequestHeader("authorization", "Basic ZHRhLmxhYnMuY29udGFjdEBnbWFpbC5jb206Q2xpY2tTZW5kMSE=");
        xhr.setRequestHeader("x-rapidapi-host", "clicksend.p.rapidapi.com");
        xhr.setRequestHeader("x-rapidapi-key", "b5b6923ae4msh2a00690679b59b2p197fb2jsn06eb2d5a0c3a");
        xhr.setRequestHeader("content-type", "application/json");
        xhr.setRequestHeader("accept", "application/json");

        xhr.send(data);
    }
}

//#endregion SMS

//#region Geolocalización

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, error, {
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
    let milatitud = position.coords.latitude;
    let milongitud = position.coords.longitude;
    let miaccuracy = position.coords.accuracy;
    M.toast({
        html: "Lat: " + milatitud + "° Lng: " + milongitud + "° Err: " + miaccuracy + "m"
    });
    let miCoord = [milatitud, milongitud];
    addMarker(miCoord, 'Posición actual:<br>Lat: ' + milatitud + '°<br>Lng: ' + milongitud + '°<br>Err: ' + miaccuracy + 'm');
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

//#endregion Geolocalización

//#region Leaflet 
//https://leaflet-extras.github.io/leaflet-providers/preview/ 

function initializeMap() {
    let coordCasa = [28.407193, -106.863354];
    let coord = [28.7114403, -106.9131596];
    map = L.map('map').setView(coord, 17);

    geoLocation();
    addLayers();
    showFields();
}

function geoLocation() {
    map.locate({
        setView: true,
        maxZoom: 17
    });
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
}

function onLocationFound(e) {
    var radius = e.accuracy;

    L.circle(e.latlng, radius).addTo(map);

    L.marker(e.latlng).addTo(map)
        .bindPopup("Ud. está aquí con un error " + radius + " metros").openPopup();

}

function onLocationError(e) {
    alert(e.message);
}

function addLayers() {
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

    let Satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

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
        "Geológico": Geologico,
        "Flubial": Flubial
    }

    L.control.layers(baseLayers).addTo(map);
}

function showFields() {
    loadCamposFromFB().then(result => {
        let campos = result;
        for (let idx in campos) {
            let campo = campos[idx];
            coordinate = [campo.latitude, campo.longitude];
            let text = "<a href='' ng-click='selectCampo2(" + campo.key + ")'><h6>" + campo.name + "</h6>Cultivo: " + campo.cultures[0].culture + "<br>Estado: " + campo.status + "<br>Riego: " + (campo.machine[0].irrigation ? "Encendido" : "Apagado") + (campo.cultures[0].volumen ? "<br>Agua consumida: " + campo.cultures[0].volumen + " L" : "") + (campo.cultures[0].caudal ? "<br>Caudal: " + campo.cultures[0].caudal + " L/min" : "") + "<br>Lat: " + campo.latitude + "<br>Lng: " + campo.longitude + "</a>";
            addMarker(coordinate, text);
            addCircle(coordinate, parseInt(campo.machine[0].length), campo.machine[0].status);
        }
        // coord = [28.7114403, -106.9131596]
        // addMarker(coord, 'Semillas Cosecha de Oro<br>' + new Date());
        // addCircle(coord, 30);
    });
}

function addMarker(coord, text = 'Mi marcador<br>28/10/2019') {
    L.marker(coord).addTo(map)
        .bindPopup(text)
        .openPopup();
}

function addPopup(coord = [28.407, -106.867], text = "Sucursal Banco HSBC") {
    L.popup()
        .setLatLng(coord)
        .setContent(text)
        .openOn(map);
}

function addCircle(coord, radius = 50, status) {
    L.circle(coord, {
        // color: getColor(radius / 10),
        color: status ? 'green' : 'red',
        // fillColor: getColor(radius / 10),
        fillColor: status ? 'lightseagreen' : 'red',
        //fillColor: '#f03',
        fillOpacity: 0.5,
        radius: radius
    }).addTo(map);
}

function addPolygon(polygon = [
    [51.509, -0.08],
    [51.503, -0.06],
    [51.51, -0.047]
]) {
    L.polygon(polygon).addTo(map);
}

function getColor(d) {
    return d > 70 ? '#800026' :
        d > 60 ? '#BD0026' :
            d > 50 ? '#E31A1C' :
                d > 40 ? '#FC4E2A' :
                    d > 30 ? '#FD8D3C' :
                        d > 20 ? '#FEB24C' :
                            d > 10 ? '#FED976' :
                                '#FFEDA0';
}

//#endregion Leaflet
