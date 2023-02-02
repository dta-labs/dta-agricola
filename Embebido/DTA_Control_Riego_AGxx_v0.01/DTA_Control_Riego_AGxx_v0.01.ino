/****************************************************************
 *                                                              *
 *                 Sistemas DTA Serie AGxx v0.2 A               *
 *                                                              *
 *   Automatización de sistemas de Jardinería y Paisajismo      *
 *   ~ Salidas:                                                 *
 *     - 7 canales de 24V alterna                               *
 *     - 1 interruptor multipropósito 110V/220V 10A             *
 *   ~ Entradas:                                                *
 *     - Sensor de presión                                      *
 *     - Sensor de voltage                                      *
 *   ~ Comunicación GSM                                         *
 *                                                              *
 *  Configuraciones: {Rx, Tx, Plots, Pais, Lada, Número}        *
 *                                                              *
 ****************************************************************/

#include <SoftwareSerial.h>
#include <EEPROM.h>
#include <avr/wdt.h>

#pragma region Variables

// Settings
const long config[] = {2, 3, 8, 52, 625, 1477680};          // Rx, Tx, Plots, Pais, Lada, Número
static bool testFunc = true;
static bool testComm = false;
SoftwareSerial gprs(config[0], config[1]);                  // Rx, Tx
static byte plots = config[2];
const String telefono = testFunc ? "111111111111" : (String) config[3] + (String) config[4] + (String) config[5];
const String httpServer = "AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/commj_v2.php?id=" + telefono;
// const String httpServer = "AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/commj_v2.php?id=" + telefono;

// Actuadores y variables
#define pinBomba   4
#define pinRiego1  5
#define pinRiego2  6
#define pinRiego3  7
#define pinRiego4  8
#define pinRiego5  9
#define pinRiego6 10
#define pinRiego7 11
#define pinRiego8 12
#define watchDogPin A5
#define offSet 5
static byte plot = 0;
static unsigned long timeRiego[8] = {0, 0, 0, 0, 0, 0, 0, 0};             // Actions
static unsigned long activeTime = 0;
static unsigned long activationTime = 0;
static String statusVar = "OFF";
static byte commError = 0;                                                // Communications
static byte signalVar = 0;
static bool restartGSM = true;
static bool commRx = true;
static bool firstSettings = true;

struct eeObject {
  char status[3];
  byte plot;
  unsigned long timeRiego[8] = {0, 0, 0, 0, 0, 0, 0, 0};
} eeVar;

#pragma endregion Variables

void setup() {
  wdt_disable();
  Serial.begin(115200);
  pinMode(pinBomba, OUTPUT);
  for (byte i = 0; i < plots; i++) {
    pinMode(i + offSet, OUTPUT);
  }
  apagarTodo();
  Serial.println(F(">>> DTA-Agrícola: Serie AGxx v0.2 A"));
  Serial.print(F("    «")); Serial.print(telefono); Serial.println(F("»"));
  readEEPROM();
  setActivationTime();
  wdt_enable(WDTO_8S);
  activeTime = millis();
}

void loop() {
  Serial.println(F("\n********************* New loop *********************\n"));
  setupGSM();
  comunicaciones();
  systemWatchDog();
  acciones();
  showVars();
  systemWatchDog();
  waitFor(30);                                                            // Demora de 30 segundos
}

#pragma region EEPROM

void readEEPROM() {
  EEPROM.get(0, eeVar);
  statusVar = (String)(eeVar.status == "ON") ? "ON" : "OFF";
  plot = eeVar.plot >= plots ? plots : eeVar.plot;
  for (int i = 0; i < plots; i++) {
    timeRiego[i] = eeVar.timeRiego[i];
  }
  Serial.print(F("EEPROM ")); Serial.print(EEPROM.length());
  Serial.print(F(": ")); Serial.print(statusVar);
  Serial.print(F(" ")); Serial.print(plot);
  for (byte i = 0; i < plots; i++) {
    Serial.print(F(" ")); Serial.print((String)timeRiego[i]);
  }
  Serial.println();
}

void updateEEPROM() {
  String stVar = (String(eeVar.status) == "ON") ? "ON" : "OFF";
  int pt = eeVar.plot >= plots ? plots : eeVar.plot;
  unsigned long tr0 = eeVar.timeRiego[0];
  unsigned long tr1 = eeVar.timeRiego[1];
  unsigned long tr2 = eeVar.timeRiego[2];
  unsigned long tr3 = eeVar.timeRiego[3];
  unsigned long tr4 = eeVar.timeRiego[4];
  unsigned long tr5 = eeVar.timeRiego[5];
  unsigned long tr6 = eeVar.timeRiego[6];
  unsigned long tr7 = eeVar.timeRiego[7];
  if (statusVar != stVar || pt != plot || tr0 != timeRiego[0] || tr1 != timeRiego[1] || tr2 != timeRiego[2] || 
      tr3 != timeRiego[3] || tr4 != timeRiego[4] || tr5 != timeRiego[5] || tr6 != timeRiego[6] || tr7 != timeRiego[7]) {
    statusVar.toCharArray(eeVar.status, 3);
    eeVar.plot = plot;
    for (byte i = 0; i < plots; i++) {
      eeVar.timeRiego[i] = timeRiego[i];
    }
    EEPROM.put(0, eeVar);
    Serial.print(F("~ EEPROM ")); Serial.print(EEPROM.length());
    Serial.print(F(": ")); Serial.print(statusVar);
    Serial.print(F(" ")); Serial.print(plot);
    for (int i = 0; i < plots; i++) {
      Serial.print(F(" ")); Serial.print((String)eeVar.timeRiego[i]);
    }
    Serial.println(F("... update successfully!"));
  }
}

#pragma endregion EEPROM

#pragma region Acciones

void acciones() {
  if (statusVar == "ON") {
    digitalWrite(pinBomba, LOW);                                        // Bomba de agua encendida
    setPlot();
    setActivationTime();
    if (activationTime != 0) { digitalWrite(plot + offSet, LOW); }      // Encendido
  } else {
    apagarTodo();
  }
  updateEEPROM();
}

void setPlot() {
  if ((millis() - activeTime) >= activationTime) {
    plot = (plot + 1 < plots) ? plot + 1 : 0;
    apagar();
    activeTime = millis();
  }
}

void setActivationTime() {
  activationTime = timeRiego[plot];
  Serial.print(F("Active plot: ")); Serial.print(plot); Serial.print(F(" >> ")); Serial.println(activationTime);
}

void apagarTodo() {
  digitalWrite(pinBomba, HIGH);  // Apagado
  apagar();
}

void apagar() {
  for (byte i = 0; i < plots; i++) {
    digitalWrite(i + offSet, HIGH);      // Apagado
  }
}

void waitFor(int time) {
  unsigned long initialTimer = millis();
  time *= 1000;
  while (millis() - initialTimer < time) {
    delay(1000);
    systemWatchDog();
  }
}

void systemWatchDog() {
  wdt_reset();
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, LOW);
  delay(100);                           // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
}

#pragma endregion Acciones

#pragma region Comunicaciones

void setupGSM() {
  if (restartGSM) {
    Serial.println(F("Setup GSM"));
    gprs.begin(9600);
    gprs.listen();
    if (testComm) { testComunicaciones(); }
    // gprs.println(F("AT+CBAND=PCS_MODE"));    // PGSM_MODE, DCS_MODE, PCS_MODE, EGSM_DCS_MODE, GSM850_PCS_MODE, ALL_BAND
    // getResponse(15, testComm); 
    // gprs.println(F("AT+CBAND=ALL_BAND"));
    // getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+CFUN=1"));               // Funcionalidad 0 mínima 1 máxima
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=1,1"));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=2,1"));
    getResponse(15, testComm); 
  }
  wdt_reset();
}

void testComunicaciones() {
  gprs.println(F("AT+IPR=9600"));      // Velocidad en baudios?
  getResponse(15, testComm); 
  gprs.println(F("AT"));               // Tarjeta SIM Lista? OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CGMI"));          // Fabricante del dispositivo?
  getResponse(15, testComm); 
  gprs.println(F("ATI"));              // Información del producto?
  getResponse(15, testComm); 
  gprs.println(F("AT+CGSN"));          // Número de serie?
  getResponse(15, testComm); 
  gprs.println(F("AT+IPR?"));          // Velocidad en baudios?
  getResponse(15, testComm); 
  gprs.println(F("AT+CBC"));           // Estado de la bateriía
  getResponse(15, testComm); 
  gprs.println(F("AT+CFUN?"));         // Funcionalidad 0 mínima 1 máxima
  getResponse(15, testComm); 
  gprs.println(F("AT+CGATT=1"));       // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CPIN?"));         // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, testComm); 
  gprs.println(F("AT+WIND=1"));        // Indicación de tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CREG?"));         // Tarjeta SIM registrada? +CREG: 0,1 OK 
  getResponse(15, testComm); 
  gprs.println(F("AT+CGATT?"));        // Tiene GPRS? +CGATT: 1 OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CCLK?"));         // Fecha y Hora?
  getResponse(15, testComm); 
  gprs.println(F("AT+COPS?"));         // Comañía telefónica?
  getResponse(15, testComm); 
}

void comunicaciones() {
  Serial.println("Comunicación con el servidor");
  String data = httpRequest();                                      // Get Settings from HTTP
  Serial.print(F("data: ")); Serial.println(data);
  commRx = (data != "") ? true : false;
  String aux = "";
  aux = parse(data, '"', 1);                                        // status
  statusVar = (aux == "ON" || aux == "OFF") ? aux : statusVar;
  if (firstSettings) {                                              // Avisar del cambio de parcela
    aux = parse(data, '"', 2);                                      // initial plot
    plot = (aux != "") ? aux.toInt() : plot;
    firstSettings = false;
  }
  for (byte i = 0; i < plots; i++) {
    aux = parse(data, '"', i + 3);                                  // timeRiego[0..plots]
    timeRiego[i] = (aux != "") ? aux.toInt() : timeRiego[i];
  }
}

void showVars() {
  Serial.print(F("~ Status: ")); Serial.println(statusVar);
  for (byte i = 0; i < plots; i++) {
    Serial.print(F("~ Irrigation time ")); Serial.print(i); Serial.print(F(": ")); Serial.print(timeRiego[i]); 
    if (plot == i) { Serial.println(F(" <")); } else { Serial.println(F("")); }
  }
  Serial.print(F("~ Remaining time: "));
  Serial.print(activationTime != 0 ? millis() - activeTime : 0);
  Serial.print(F("/"));
  Serial.println(activationTime);
}

String httpRequest() {
  signalVar = getSignalValue();
  String param1 = "&st=" + statusVar;
  String param2 = "&tm=" + (String)activationTime;
  String param3 = "&po=" + (String)plot;
  String param4 = "&rx=" + (String)(commRx ? "Ok" : "Er");
  String param5 = "&si=" + (String)signalVar + "\"";
  Serial.println(testFunc ? httpServer + param1 + param2 + param3 + param4 + param5 : "");
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, false); 
  gprs.println(httpServer + param1 + param2 + param3 + param4 + param5);
  getResponse(25, true); 
  wdt_reset();
  gprs.println(F("AT+HTTPACTION=0"));
  String result = getResponse(4000, true); 
  restartGSM = (result.indexOf("ERROR") != -1 || result.indexOf("601") != -1  || result.indexOf("604") != -1 || signalVar < 6) ? true : false;
  gprs.println(F("AT+HTTPREAD"));
  result = getResponse(0, false);
  gprs.println(F("AT+HTTPTERM"));
  commWatchDogReset(signalVar);
  getResponse(30, false); 
  wdt_reset();
  return testFunc ? "\"ON\"1\"60000\"180000\"0\"45000\"50000\"120000\"190000\"0\"" : result;
}

String getResponse(int wait, bool response){
  String result = "";
  delay(wait);
  unsigned long iTimer = millis();
  while(!gprs.available() && (millis() - iTimer) <= 1000) {
    delay(5);    
  }
  while(gprs.available() > 0) {
    result += (char)gprs.read();
    delay(1.5);
  }
  if (response) {
    Serial.println(result);
  }
  return result;
}

int getSignalValue() {
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  String aux1 = getResponse(15, false);
  String aux2 = parse(aux1, ' ', 1);
  String aux3 = parse(aux2, ',', 0);
  int result = aux3.toInt(); 
  return result;
}

void commWatchDogReset(int signalValue) {
  commError = ((signalValue < 6 || restartGSM) && !testFunc) ? commError + 1 : 0;
  Serial.print(F("commError: "));
  Serial.println(commError);
  if (commError == 5) {
    while (true) { delay(1000); }
  }
}

String parse(String dataString, char separator, int index) {
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = dataString.length()-1;
  for(int i = 0; i <= maxIndex && found <= index; i++) {
    if(dataString.charAt(i) == separator || i == maxIndex) {
        found++;
        strIndex[0] = strIndex[1]+1;
        strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }
  return found > index ? dataString.substring(strIndex[0], strIndex[1]) : "";
}

#pragma endregion Comunicaciones

/****************************************************************
 *                                                              *
 * Errores HTTP:                                                *
 *                                                              * 
 * 502  Bad Gateway The remote server returned an error.        *
 * 600* Empty access token.                                     *
 *                                                              *
 * 601* Access token invalid                                    *
 * 602* Access token expired                                    *
 * 603  Access denied                                           *
 * 604* Request timed out                                       *
 * 605* HTTP Method not supported                               *
 * 606  Max rate limit ‘%s’ exceeded with in ‘%s’ secs          *
 * 607  Daily quota reached                                     *
 *                                                              *
 * 608* API Temporarily Unavailable                             *
 * 609  Invalid JSON                                            *
 * 610  Requested resource not found                            *
 * 611* System error  All unhandled exceptions                  *
 * 612  Invalid Content Type                                    *
 * 613  Invalid Multipart Request                               *
 * 614  Invalid Subscription                                    *
 * 615  Concurrent access limit reached                         *
 * 616  Invalid subscription type                               *
 * 701  %s cannot be blank                                      *
 * 702  No data found for given search scenario                 *
 *                                                              *
 * 703  Feature is not enabled for the subscription             *
 * 704  Invalid date format                                     *
 * 709  Business Rule Violation                                 *
 * 710  Parent Folder Not Found                                 *
 * 711  Incompatible Folder Type                                *
 * 712  Merge to person Account operation is invalid            *
 * 713  A system resource was temporarily unavailable           *
 * 714  Unable to find default record type                      *
 * 718  ExternalSalesPersonID not found                         *
 *                                                              *
 ****************************************************************/

/****************************************************************
 *                                                              *
 * Valor  dB   Condición                                        *
 * ===== ====  =========                                        *
 *  2   -109  Marginal                                          *
 *  3   -107  Marginal                                          *
 *  4   -105  Marginal                                          *
 *  5   -103  Marginal                                          *
 *  6   -101  Marginal                                          *
 *  7    -99  Marginal                                          *
 *  8    -97  Marginal                                          *
 *  9    -95  Marginal                                          *
 * 10    -93  OK                                                *
 * 11    -91  OK                                                *
 * 12    -89  OK                                                *
 * 13    -87  OK                                                *
 * 14    -85  OK                                                *
 * 15    -83  Good                                              *
 * 16    -81  Good                                              *
 * 17    -79  Good                                              *
 * 18    -77  Good                                              *
 * 19    -75  Good                                              *
 * 20    -73  Excellent                                         *
 * 21    -71  Excellent                                         *
 * 22    -69  Excellent                                         *
 * 23    -67  Excellent                                         *
 * 24    -65  Excellent                                         *
 * 25    -63  Excellent                                         *
 * 26    -61  Excellent                                         *
 * 27    -59  Excellent                                         *
 * 28    -57  Excellent                                         *
 * 29    -55  Excellent                                         *
 * 30    -53  Excellent                                         *
 *                                                              *
 ****************************************************************/
