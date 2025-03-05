#include <SoftwareSerial.h>
#include <EEPROM.h>

#pragma region Variables

#define RX_PIN 3
#define TX_PIN 4

SoftwareSerial esp8266(RX_PIN, TX_PIN);                                 // RX, TX

const char* initialSSID = "DTA-Gateway";
const char* initialPassword = "dta12345";
const char* initialIP = "192.168.4.1";                                  // IP del ESP8266 en modo AP
String ssid = "";
String password = "";

#pragma endregion Variables

#pragma region Programa principal

void setup() {
  Serial.begin(19200);
  initWiFi();
}

void loop() {
  if (ssid.length() == 0 || password.length() == 0) {                   // Si estamos en modo AP, manejar la configuración
    handleConfiguration();
  } else {
    handleWebService();                                                 // Si estamos conectados a la red WiFi, enviar y recibir datos
  }
}

#pragma endregion Programa principal

#pragma region WiFi

void initWiFi() {
  esp8266.begin(19200);
  delay(1000);
  sendCommand("AT+CIOBAUD=19200", 1000);
  esp8266.begin(19200);
  delay(1000);
  // sendCommand("AT+UART_DEF=9600,8,1,0,0", 1000);
  sendCommand("AT", 1000);
  deleteEEPROM();
  readConfigFromEEPROM();
  Serial.print("SSID: "); Serial.println(ssid);
  Serial.print("PWD: "); Serial.println(password);
  if (ssid.length() > 0 && password.length() > 0) {
    connectToWiFi();       // Conectar a la red WiFi guardada
  } else {
    startAPMode();         // Iniciar en modo AP para configuración
  }
}

void connectToWiFi() {
  Serial.println(F("Configurar ciente WiFi!"));
  sendCommand("AT+CWMODE=1", 1000);                                     // Configurar como cliente WiFi
  sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", 5000);  // Conectar a la red WiFi
  sendCommand("AT+CIFSR", 1000);                                        // Obtener dirección IP
}

void startAPMode() {
  Serial.println(F("Configurar punto de acceso!"));
  sendCommand("AT+CWMODE=2", 1000);                                     // Configurar como punto de acceso
  sendCommand("AT+CWSAP=\"" + String(initialSSID) + "\",\"" + String(initialPassword) + "\",1,4", 1000); // Configurar AP
  sendCommand("AT+CIPMUX=1", 1000);                                     // Habilitar múltiples conexiones
  sendCommand("AT+CIPSERVER=1,80", 1000);                               // Iniciar servidor en el puerto 80
}

void handleConfiguration() {
  if (esp8266.available()) {
    String response = esp8266.readString();
    Serial.println(response);
    if (response.indexOf("+IPD") != -1) {                               // Enviar formulario de configuración
      sendForm(response);
    }
    if (response.indexOf("GET /config?ssid=") != -1) {                  // Si se recibe la configuración, guardarla en la EEPROM
      receiveFormResponse(response);
    }
  }
}

void sendForm(String response) {
  int connectionId = response.charAt(response.indexOf("+IPD") + 5) - '0'; // Obtener ID de conexión
  String webpage;
  webpage += F("<h1>Configuración de WiFi</h1>");
  webpage += F("<form method='get' action='config'>");
  webpage += F("SSID: <input type='text' name='ssid'><br>");
  webpage += F("Password: <input type='password' name='password'><br>");
  webpage += F("<input type='submit' value='Guardar'>");
  webpage += F("</form>");
  String cipSend = "AT+CIPSEND=" + String(connectionId) + "," + String(webpage.length());
  sendCommand(cipSend, 1000);
  sendCommand(webpage, 1000);
  String closeCommand = "AT+CIPCLOSE=" + String(connectionId);
  sendCommand(closeCommand, 1000);
}

void receiveFormResponse(String response) {
  int ssidStart = response.indexOf("ssid=") + 5;                        // Obtener el SSID
  int ssidEnd = response.indexOf("&", ssidStart);
  ssid = response.substring(ssidStart, ssidEnd);
  ssid.replace("+", " ");
  int passwordStart = response.indexOf("password=") + 9;                // Obtener el PWD
  int passwordEnd = response.indexOf(" ", passwordStart);
  password = response.substring(passwordStart, passwordEnd);
  password.replace("+", " ");
  writeConfigToEEPROM();
  sendCommand("AT+RST", 5000);                                          // Reiniciar el ESP8266 para aplicar la nueva configuración
}

void handleWebService() {
  
  int sensorValue = analogRead(A0);                                               // Leer el valor del sensor en el pin A0
  
  String url = "/ws/sensor?value=" + String(sensorValue);                         // Crear la URL con el valor del sensor
  String request = "GET " + url + " HTTP/1.1\r\nHost: dtaamerica.com\r\n\r\n";    // Crear la solicitud HTTP GET
  sendCommand("AT+CIPSTART=\"TCP\",\"dtaamerica.com\",80", 2000);                 // Conectar al servidor
  String CIPSEND = "AT+CIPSEND=";
  sendCommand(CIPSEND + String(request.length()), 1000);                          // Enviar la longitud de la solicitud
  sendCommand(request, 1000);                                                     // Enviar la solicitud
  String response = getResponse(5000);                                            // Esperar la respuesta del servidor
  delay(5000);                                                                    // Esperar 5 segundos antes de la próxima lectura
}

void sendCommand_old(String command, int timeout) {
  Serial.print("Enviando comando: "); Serial.println(command);
  esp8266.println(command);
  delay(timeout);
  while (esp8266.available()) {
    String response = esp8266.readString();
    Serial.println(response);
  }
}

void sendCommand(String command, int timeout) {
  Serial.print("Enviando comando: "); Serial.println(command);
  esp8266.println(command);
  String response = "";
  unsigned long startTime = millis();
  while (millis() - startTime < timeout) {
    if (esp8266.available()) {
      char c = esp8266.read(); // Leer un byte
      response += c; // Agregar el byte a la respuesta
    }
  }
  if (response.length() > 0) {
    Serial.println("Respuesta del ESP8266: " + response);
  } else {
    Serial.println("No se recibió respuesta del ESP8266.");
  }
}

String getResponse(int time) {
  String response;
  unsigned long startTime = millis();
  while (millis() - startTime < time) {                               // Esperar hasta 5 segundos para la respuesta
    if (esp8266.available()) {
      response += esp8266.readString();
    }
  }
  if (response.indexOf("200 OK") != -1) {                          // Verificar si la respuesta contiene un código de éxito (por ejemplo, "200 OK")
    Serial.println("Datos enviados correctamente.");
  } else {
    Serial.println("Error al enviar los datos.");
  }
  sendCommand("AT+CIPCLOSE", 1000);
  return response;
}

#pragma endregion WiFi

#pragma region EEPROM

void readConfigFromEEPROM() {
  ssid = readStringFromEEPROM(0);
  password = readStringFromEEPROM(50);
}

void writeConfigToEEPROM() {
  writeStringToEEPROM(0, ssid);
  writeStringToEEPROM(50, password);
}

String readStringFromEEPROM(int address) {
  String data = "";
  char ch = EEPROM.read(address);
  while (ch != '\0' && address < 512) {
    data += ch;
    address++;
    ch = EEPROM.read(address);
  }
  return data;
}

void writeStringToEEPROM(int address, String data) {
  for (int i = 0; i < data.length(); i++) {
    EEPROM.write(address + i, data[i]);
  }
  EEPROM.write(address + data.length(), '\0');
}

void deleteEEPROM() {
  for (int i = 0; i < EEPROM.length(); i++) {
    EEPROM.write(i, 0); // Escribir 0 en cada posición
  }
  Serial.println("EEPROM borrada correctamente.");
}

#pragma endregion EEPROM
