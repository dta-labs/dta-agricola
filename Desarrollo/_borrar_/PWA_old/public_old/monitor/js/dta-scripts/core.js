var map;

initializeMap();

//#region Controlador Angular

var app = angular.module("Administracion", []);

app.controller("ControladorPrincipal", function ($scope) {

    $scope.selectedWindow = 'mapas';

    $scope.showWindow = windowsName => {
        $scope.selectedWindow = windowsName;
        window.scrollTo(0, 0);
    }

    $scope.setMyPossition = () => {
        getLocation();
    }

});

//#endregion Controlador Angular

//#region Materializes

document.addEventListener('DOMContentLoaded', function () {
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'));
    var instances = M.FormSelect.init(document.querySelectorAll('select'));
});

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
            let campo = campos[idx];
            coordinate = [campo.latitude, campo.longitude];
            let text = "<h6>" + campo.name + "</h6>Cultivo: " + campo.cultures[0].culture + "<br>Estado: " + campo.machine.state + "<br>Riego: " + campo.machine.irrigation + "<br>Lat: " + campo.latitude + "<br>Lng: " + campo.longitude;
            addMarker(coordinate, text);
            addCircle(coordinate, parseInt(campo.machine.length));
        }
        coord = [28.7114403, -106.9131596]
        addMarker(coord, 'Semillas Cosecha de Oro<br>' + new Date());
        addCircle(coord, 30);
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
