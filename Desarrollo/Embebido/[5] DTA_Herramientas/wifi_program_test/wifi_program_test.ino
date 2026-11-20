// HolaCosme.ino - ESP8266 (ESP-01) como punto de acceso con una página web
// 1) Sube este sketch (GPIO0 a GND + reset, subir, soltar GPIO0 + reset)
// 2) En el celular conéctate a la red WiFi "ESP-Cosme" (clave: 12345678)
// 3) Abre en el navegador: http://192.168.4.1

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid     = "ESP-Cosme";
const char* password = "12345678";   // mínimo 8 caracteres

ESP8266WebServer server(80);

const char pagina[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ESP8266</title>
  <style>
    body { font-family: sans-serif; text-align: center; margin-top: 35vh;
           background: #0b3d5c; color: #fff; }
    h1   { font-size: 3em; margin: 0; }
    p    { opacity: .7; }
  </style>
</head>
<body>
  <h1>Hola Cosme</h1>
  <p>Servido desde tu ESP8266</p>
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send_P(200, "text/html", pagina);
}

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println("Iniciando punto de acceso...");

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);

  Serial.print("Red: ");
  Serial.println(ssid);
  Serial.print("IP: ");
  Serial.println(WiFi.softAPIP());   // normalmente 192.168.4.1

  server.on("/", handleRoot);
  server.onNotFound(handleRoot);     // cualquier dirección muestra la página
  server.begin();
  Serial.println("Servidor web listo");
}

void loop() {
  server.handleClient();
}