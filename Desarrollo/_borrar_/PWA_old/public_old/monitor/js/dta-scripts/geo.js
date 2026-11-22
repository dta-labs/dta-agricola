var latitud = document.getElementById("latitud");
var longitud = document.getElementById("longitud");
var precision = document.getElementById("precision");
var mapa = document.getElementById("mapa");
var milatitud, milongitud, accuracy;
var latlng;

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, error, { maximumAge: 60000, timeout: 4000 });
    } else {
        longitud.innerHTML = "Geolocation is not supported by this browser.";
    }
}

function showPosition(position) {
    milatitud = position.coords.latitude;
    milongitud = position.coords.longitude;
    latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    accuracy = position.coords.accuracy;
    latitud.innerHTML = "Latitud: " + milatitud + "° ";
    longitud.innerHTML = "Longitud: " + milongitud + "° ";
    precision.innerHTML = "Precisión: " + accuracy + "m ";
    var latlon = milatitud + "," + milongitud;
    sowMap(latlon);
}

function error() {
    alert("Geolocalización no soportada")
}

function sowMap(latlon) {
    var img_url = "http://maps.googleapis.com/maps/api/staticmap?center=" + latlon +
        "&zoom=15&size=400x400&sensor=false";
    mapa.innerHTML = "<img src='" + img_url + "'>";
    if (document.getElementById("mapa").childElementCount != 0) {
        document.getElementById("puntero").style.display = "block";
    }

}

function getNewLocation(position) {
    var distancia = document.getElementById("distancia").value * 0.00001;
    var angulo = document.getElementById("angulo").value;
    var anguloRad = getRadianes(angulo);
    var newLatitude = milatitud + distancia * Math.cos(anguloRad);
    var newLongitude = milongitud + distancia * Math.sin(anguloRad);
    var latlon = newLatitude + "," + newLongitude;

    //sowMap(latlon);
    sowMap(latlon);
}

function getRadianes(angulo) {
    return angulo * 0.0174533;
}

function marcador(latlon) {
    var myOptions = {
        zoom: 13,
        center: latlng,
        mapTypeControl: false,
        navigationControlOptions: {
            style: google.maps.NavigationControlStyle.SMALL
        },
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("mapa"), myOptions);

    var marker = new google.maps.Marker({
        position: latlng,
        map: map,
        title: "¡Usted está aquí!"
    });
}
