var map;

// initializeMap();

//#region Controlador Angular

var app = angular.module("Administracion", ['ngRoute']);

// app.config(['$routeProvider', function ($routeProvider) {
//     $routeProvider
//         .when("/", {
//             templateUrl: "login.html",
//             controller: "ControladorPrincipal"
//         })
//         .when("/ayuda", {
//             templateUrl: "ayuda.html",
//             controller: "ControladorPrincipal"
//         });
// }]);

app.controller("ControladorPrincipal", function ($scope) {

    let listeners = {};
    $scope.logs = {};
    $scope.systems = {};
    $scope.selectedEnterprise = {};
    $scope.meteo = [];
    $scope.selectedProductor = "";
    $scope.selectedWindow = 'mapas';

    $scope.showWindow = windowsName => {
        $scope.selectedWindow = windowsName;
        window.scrollTo(0, 0);
    }

    $scope.setMyPossition = () => {
        getLocation();
    }

    // #region USER

    listenUserStatus = () => {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                $scope.authUser = user;
                getUserEnterprises();
                getProductors();
            } else {
                $scope.$apply(function () {
                    $scope.authUser = null;
                });
            }
        });
    };

    getUserEnterprises = () => {
        findUserEnterprises().then(result => {
            $scope.enterprises = [];
            for (item in result) {
                if (result[item].owner == $scope.authUser.email) {
                    $scope.enterprises.push(result[item]);
                }
            }
            mappingEnterprisesPartners();
            $scope.$apply();
        });
    }

    mappingEnterprisesPartners = () => {
        for (idx in $scope.enterprises) {
            mappingPartnersOfEnterprise($scope.enterprises[idx].partners);
        }
    }

    mappingPartnersOfEnterprise = (partners) => {
        for (idx in partners) {
            $scope.showPartnerFields(partners[idx]);
        }
    }

    $scope.showPartnerFields = (userEmail) => {
        loadUserLocations(userEmail).then(result => {
            userSystems = result[userEmail];
            loadSystems(userSystems);
            // $scope.$apply();
        });
    }

    loadSystems = (userSystems) => {
        if (userSystems.systems) {
            for (let locationKey in userSystems.systems) {
                if (!listeners[locationKey]) {
                    listeners[locationKey] = firebase.database().ref("systems/" + locationKey + "/settings");
                    listeners[locationKey].on("value", system => {
                        if (system.val()) {
                            $scope.systems[locationKey] = system.val();
                            $scope.systems[locationKey].key = locationKey;
                            // showField($scope.systems[locationKey]);
                            $scope.loadSystemLog(locationKey, 1);
                            getMetorologicalData(locationKey);
                            $scope.$apply();
                        }
                    });
                }
            }
            $scope.showWindow('dashboard');
        }
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
                if (document.getElementById('pos_' + locationKey)) {
                    document.getElementById('pos_' + locationKey).style.transform = 'rotate(' + position + 'deg)';
                }
                updateCompass();
                invertLog();
                // $scope.$apply();
            }
        });
    }

    // #endregion USER

    // #region EMPRESA

    $scope.setSelectedEnterprise = (key) => {
        for (idx in $scope.enterprises) {
            if ($scope.enterprises[idx].key == key) {
                $scope.selectedEnterprise = $scope.selectedEnterprise != $scope.enterprises[idx] ? $scope.enterprises[idx] : {};
            }
        }
        if ($scope.selectedEnterprise.partners) {
            // getProductors();
            $scope.usuarios = [];
            for (idx in $scope.listaUsuarios) {
                if ($scope.selectedEnterprise.partners.includes($scope.listaUsuarios[idx].key)) {
                    $scope.usuarios.push($scope.listaUsuarios[idx]);
                }
            }
        //     $scope.showWindow('productores');
        // } else {
        //     $scope.showWindow('dashboard');
        }
        $scope.showWindow('dashboard');
        // removeMarkers();
        // if ($scope.selectedEnterprise.partners) {
        //     showEnterpriseMarkers(key);
        // } else {
        //     showAllMarkers();
        // }
    }

    // showEnterpriseMarkers = (key) => {
    //     for (idx in $scope.systems) {
    //         if ($scope.systems[idx] in $scope.selectedEnterprise) {
    //             showField($scope.systems[idx]);
    //         }
    //     }
    // }

    // showAllMarkers = () => {
    //     for (idx in $scope.systems) {
    //         showField($scope.systems[idx]);
    //     }
    // }

    $scope.showEnterprises = (key) => {
        for (idx in $scope.empresas) {
            let div_obj = document.getElementById('div_' + $scope.empresas[idx].key)
            let ul_obj = document.getElementById('ul_' + $scope.empresas[idx].key)
            if ($scope.empresas[idx].key == key) {
                let value = div_obj.style.display == "block" ? "none" : "block"
                div_obj.style.display = value;
                ul_obj.style.display = value;
            } else {
                div_obj.style.display = "none";
                ul_obj.style.display = "none";
            }
        }
    }

    // #endregion EMPRESA

    // #region PRODUCTOR

    $scope.resumenProductor = (key) => {
        $scope.selectedProductor = $scope.usuarios.find(usuario => usuario.key == key);
        $scope.showWindow('resumenProductor');
    }

    getProductors = () => {
        loadUsersFromFB().then(result => {
            $scope.listaUsuarios = [];
            for (let idx in result) {
                $scope.listaUsuarios.push(result[idx]);
            }
            $scope.$apply();
        });
    }

    $scope.getFields = () => {
        loadCamposFromFB().then(result => {
            $scope.sistemas = [];
            for (let idx in result) {
                if (result[idx].settings) {
                    $scope.sistemas.push(result[idx]);
                }
            }
            $scope.$apply();
        });
    }

    // #endregion PRODUCTOR

    // #region MISELANEAS

    $scope.getJsonLength = (json) => {
        return Object.keys(json).length;
    }

    $scope.getRandomInt = (max) => {
        return Math.floor(Math.random() * max);
    }

    $scope.obj2Array = (obj) => {
        return Object.values(obj);
    }

    invertLog = () => {
        $scope.invertedRegisters = [];
        if ($scope.actualSystem && $scope.logs[$scope.actualSystem.key]) {
            registers = $scope.logs[$scope.actualSystem.key];
            registersArr = Object.values(registers);
            $scope.invertedRegisters = registersArr.reverse();
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
                $scope.meteo[key].weather["iconUrl"] = `http://openweathermap.org/img/w/${$scope.meteo[key].weather["0"].icon}.png`;
                $scope.$apply();
            }
        });
    }

    // #endregion MISELANEAS

    $scope.inicializacion = () => {
        $scope.showWindow("empty");
        listenUserStatus();
        setTimeout(function () {
            if (!$scope.authUser) {
                $scope.showWindow('login');
                $scope.$apply();
            } else {
                $scope.showWindow('start');
                $scope.$apply();
            }
        }, 2000);
    }
});

//#endregion Controlador Angular

//#region Materializes

// document.addEventListener('DOMContentLoaded', function () {
//     M.AutoInit();
// });

//#endregion Materializes

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

let markers = [];

function initializeMap() {
    // let coordCasa = [28.407193, -106.863354];
    let coord = [28.7114403, -106.9131596];
    map = L.map('mapa').setView(coord, 4.3);

    // geoLocation();
    addLayers();
    // showFields();
}

function geoLocation() {
    map.locate({
        setView: true,
        maxZoom: 20
    });
    // map.on('locationfound', onLocationFound);
    // map.on('locationerror', onLocationError);
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
        "Calles": Calles,
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
            if (campos[idx].settings) {
                let campo = campos[idx].settings;
                showField(campo);
            }
        }
    });
}

function showField(campo) {
    coordinate = [campo.latitude, campo.longitude];
    let text = `<h6> ${campo.name} </h6> <b> ${campo.key} </b><br/><span style='font-size: .8em;'> [${campo.latitude}, ${campo.longitude}]</span>`;
    addMarker(coordinate, text);
}

function addMarker(coord, text = 'DTA-Agricola') {
    let marker = L.marker(coord).addTo(map).bindPopup(text);
    // .openPopup();
    markers.push(marker);
}

function removeMarkers() {
    for (idx in markers) {
        map.removeLayer(markers[idx]);
    }
    markers = [];
}

function addPopup(coord = [28.407, -106.867], text = "Sucursal Banco HSBC") {
    L.popup()
        .setLatLng(coord)
        .setContent(text)
        .openOn(map);
}

function addCircle(coord, radius = 50) {
    L.circle(coord, {
        color: getColor(radius / 10),
        fillColor: getColor(radius / 10),
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
