/****************************************************************
 *                                                              *
 *               Sistemas DTA Serie J0008-1 v0.2 A              *
 *                                                              *
 *   Automatización de sistemas de Jardinería y Paisajismo      *
 *   ~ Salidas:                                                 *
 *     - 7 canales de 24V alterna                               *
 *     - 1 interruptor multipropósito 110V 10A                  *
 *   ~ Entradas:                                                *
 *     - N/A                                                    *
 *   ~ Comunicación GSM                                         *
 *   
 *                                                              *
 ****************************************************************/

#include <SoftwareSerial.h>
#include <EEPROM.h>
#include <avr/wdt.h>

#pragma region Variables

// Comunicación GSM/GPRS
SoftwareSerial gprs(3, 4);                  // RX, TX
// #define telefono = "526251477680"
#define telefono "111111111111"
#define httpServer "AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/commj.php?id=" telefono
// #define httpServer "AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/commj.php?id=" telefono

// Actuadores y variables
static bool testComm = false;
static int pinBomba = 5;
static int pinRiego1 = 6;
static int pinRiego2 = 7;
static int pinRiego3 = 8;
static int pinRiego4 = 9;
static int pinRiego5 = 10;
static int pinRiego6 = 11;
static int pinRiego7 = 12;
static unsigned long int timeRiego1 = 0;
static unsigned long int timeRiego2 = 0;
static unsigned long int timeRiego3 = 0;
static unsigned long int timeRiego4 = 0;
static unsigned long int timeRiego5 = 0;
static unsigned long int timeRiego6 = 0;
static unsigned long int timeRiego7 = 0;
static unsigned long int activeTime = 0;
static unsigned long int activationTime = 0;
static byte plots = 7;
static byte plot = 1;
static String statusVar = "OFF";
static bool restartGSM = true;
static int signalVar = 0;
static byte commError = 0;
static bool commRx = true;

struct eeObject {
  char status[3];
  byte plot;
  unsigned long int timeRiego1;
  unsigned long int timeRiego2;
  unsigned long int timeRiego3;
  unsigned long int timeRiego4;
  unsigned long int timeRiego5;
  unsigned long int timeRiego6;
  unsigned long int timeRiego7;
};

eeObject eeVar;

#pragma endregion Variables

void setup() {
  wdt_disable();
  Serial.begin(115200);
  pinMode(pinBomba, OUTPUT);
  pinMode(pinRiego1, OUTPUT);
  pinMode(pinRiego2, OUTPUT);
  pinMode(pinRiego3, OUTPUT);
  pinMode(pinRiego4, OUTPUT);
  pinMode(pinRiego5, OUTPUT);
  pinMode(pinRiego6, OUTPUT);
  pinMode(pinRiego7, OUTPUT);
  apagar();
  Serial.println();
  Serial.println(F(">>> DTA-Agrícola: Serie J0008-1 v0.2 A"));
  Serial.print("    «");
  Serial.print(telefono);
  Serial.println("»");
  readEEPROM();
  wdt_enable(WDTO_8S);
  setActivationTime();
  activeTime = millis();
}

void loop() {
  Serial.println();
  Serial.println("********************* New loop *********************");
  Serial.println();
  setupGSM();
  comunicaciones();
  acciones();
}

#pragma region EEPROM

void readEEPROM() {
  EEPROM.get(0, eeVar);
  statusVar = (String)(eeVar.status == "ON") ? "ON" : "OFF";
  plot = eeVar.plot;
  timeRiego1 = eeVar.timeRiego1;
  timeRiego2 = eeVar.timeRiego2;
  timeRiego3 = eeVar.timeRiego3;
  timeRiego4 = eeVar.timeRiego4;
  timeRiego5 = eeVar.timeRiego5;
  timeRiego6 = eeVar.timeRiego6;
  timeRiego7 = eeVar.timeRiego7;
  Serial.print(F("EEPROM "));
  Serial.print(EEPROM.length());
  Serial.print(F(": "));
  Serial.print(statusVar);
  Serial.print(F(" "));
  Serial.print(plot);
  Serial.print(F(" "));
  Serial.print((String)timeRiego1);
  Serial.print(F(" "));
  Serial.print((String)timeRiego2);
  Serial.print(F(" "));
  Serial.print((String)timeRiego3);
  Serial.print(F(" "));
  Serial.print((String)timeRiego4);
  Serial.print(F(" "));
  Serial.print((String)timeRiego5);
  Serial.print(F(" "));
  Serial.print((String)timeRiego6);
  Serial.print(F(" "));
  Serial.println((String)timeRiego7);
}

void updateEEPROM() {
  String stVar = (String(eeVar.status) == "ON") ? "ON" : "OFF";
  int pt = eeVar.plot;
  unsigned long int tr1 = eeVar.timeRiego1;
  unsigned long int tr2 = eeVar.timeRiego2;
  unsigned long int tr3 = eeVar.timeRiego3;
  unsigned long int tr4 = eeVar.timeRiego4;
  unsigned long int tr5 = eeVar.timeRiego5;
  unsigned long int tr6 = eeVar.timeRiego6;
  unsigned long int tr7 = eeVar.timeRiego7;
  if (statusVar != stVar || pt != plot || tr1 != timeRiego1 || tr2 != timeRiego2 || tr3 != timeRiego3 || tr4 != timeRiego4 || tr5 != timeRiego5 || tr6 != timeRiego6 || tr7 != timeRiego7) {
    statusVar.toCharArray(eeVar.status, 3);
    eeVar.plot = plot;
    eeVar.timeRiego1 = timeRiego1;
    eeVar.timeRiego2 = timeRiego2;
    eeVar.timeRiego3 = timeRiego3;
    eeVar.timeRiego4 = timeRiego4;
    eeVar.timeRiego5 = timeRiego5;
    eeVar.timeRiego6 = timeRiego6;
    eeVar.timeRiego7 = timeRiego7;
    EEPROM.put(0, eeVar);
    Serial.print(F("EEPROM "));
    Serial.print(EEPROM.length());
    Serial.print(F(": "));
    Serial.print(statusVar);
    Serial.print(F(" "));
    Serial.print(plot);
    Serial.print(F(" "));
    Serial.print((String)eeVar.timeRiego1);
    Serial.print(F(" "));
    Serial.print((String)eeVar.timeRiego2);
    Serial.print(F(" "));
    Serial.print((String)eeVar.timeRiego3);
    Serial.print(F(" "));
    Serial.print((String)eeVar.timeRiego4);
    Serial.print(F(" "));
    Serial.print((String)eeVar.timeRiego5);
    Serial.print(F(" "));
    Serial.print((String)eeVar.timeRiego6);
    Serial.print(F(" "));
    Serial.print((String)eeVar.timeRiego7);
    Serial.println(F("... update successfully!"));
  }
}

#pragma endregion EEPROM

#pragma region Acciones

void acciones() {
  if (statusVar == "ON") {
    digitalWrite(pinBomba, LOW);                        // Bomba de agua encendida
    Serial.print(F("Active plot: "));
    Serial.println(plot);
    digitalWrite(plot + 5, LOW);                        // Encendido
  } else {
    apagar();
  }
  setPlot();
}

void setPlot() {
  delay(60000);
  if ((millis() - activeTime) > activationTime) {
    plot = (plot < 7) ? (plot + 1) : 1;
    setActivationTime();
    activeTime = millis();
  }
}

void setActivationTime() {
  switch(plot) {
    case 1:
      activationTime = timeRiego1;
      break;
    case 2:
      activationTime = timeRiego2;
      break;
    case 3:
      activationTime = timeRiego3;
      break;
    case 4:
      activationTime = timeRiego4;
      break;
    case 5:
      activationTime = timeRiego5;
      break;
    case 6:
      activationTime = timeRiego6;
      break;
    case 7:
      activationTime = timeRiego7;
      break;
  }
}

void apagar() {
  digitalWrite(pinBomba, HIGH);  // Apagado
  digitalWrite(pinRiego1, HIGH); // Apagado
  digitalWrite(pinRiego2, HIGH); // Apagado
  digitalWrite(pinRiego3, HIGH); // Apagado
  digitalWrite(pinRiego4, HIGH); // Apagado
  digitalWrite(pinRiego5, HIGH); // Apagado
  digitalWrite(pinRiego6, HIGH); // Apagado
  digitalWrite(pinRiego7, HIGH); // Apagado
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
  String data = httpRequest();                               // Get Settings from HTTP
  Serial.print(F("data: "));
  Serial.println(data);
  commRx = (data != "") ? true : false;
  String aux = "";
  aux = parse(data, '"', 1);                                 // > status
  String lastStatus = statusVar;
  statusVar = (aux == "ON" || aux == "OFF") ? aux : statusVar;
  if (lastStatus != statusVar) {                             // Avisar del cambio de estado
    httpRequest();
  }
  aux = parse(data, '"', 2);                                 // > initial plot
  byte lastPlot = plot;
  plot = (aux != "") ? aux.toInt() : plot;
  if (lastPlot != plot) {                                    // Avisar del cambio de estado
    setActivationTime(); 
  }
  aux = parse(data, '"', 3);                                 // > timeRiego1
  timeRiego1 = (aux != "") ? aux.toInt() : timeRiego1;
  aux = parse(data, '"', 4);                                 // > timeRiego2
  timeRiego2 = (aux != "") ? aux.toInt() : timeRiego2;
  aux = parse(data, '"', 5);                                 // > timeRiego3
  timeRiego3 = (aux != "") ? aux.toInt() : timeRiego3;
  aux = parse(data, '"', 6);                                 // > timeRiego4
  timeRiego4 = (aux != "") ? aux.toInt() : timeRiego4;
  aux = parse(data, '"', 7);                                 // > timeRiego5
  timeRiego5 = (aux != "") ? aux.toInt() : timeRiego5;
  aux = parse(data, '"', 8);                                 // > timeRiego6
  timeRiego6 = (aux != "") ? aux.toInt() : timeRiego6;
  aux = parse(data, '"', 9);                                 // > timeRiego7
  timeRiego7 = (aux != "") ? aux.toInt() : timeRiego7;
  showVars();
}

void showVars() {
  Serial.print(F("> Status: "));
  Serial.println(statusVar);
  Serial.print(F("> Actual plot: "));
  Serial.println(plot);
  Serial.print(F("> Time Riego 1: "));
  Serial.println(timeRiego1);
  Serial.print(F("> Time Riego 2: "));
  Serial.println(timeRiego2);
  Serial.print(F("> Time Riego 3: "));
  Serial.println(timeRiego3);
  Serial.print(F("> Time Riego 4: "));
  Serial.println(timeRiego4);
  Serial.print(F("> Time Riego 5: "));
  Serial.println(timeRiego5);
  Serial.print(F("> Time Riego 6: "));
  Serial.println(timeRiego6);
  Serial.print(F("> Time Riego 7: "));
  Serial.println(timeRiego7);
}

String httpRequest() {
  String param1 = "&st=" + statusVar;
  String param2 = "&tm=" + (String)activationTime;
  String param3 = "&po=" + (String)plot;
  String param4 = "&rx=" + (String)(commRx ? "Ok" : "Er");
  String param5 = "&si=" + (String)signalVar + "\"";
  // Serial.println(httpServer + param1 + param2 + param3 + param4 + param5);
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, true); 
  gprs.println(httpServer + param1 + param2 + param3 + param4 + param5);
  getResponse(25, false); 
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
  return result;
}

String getResponse(int wait, bool response){
  String result = "";
  delay(wait);
  while(!gprs.available()) {}
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
  commError = (signalValue < 6 || restartGSM) ? commError + 1 : 0;
  Serial.print("commError: ");
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
