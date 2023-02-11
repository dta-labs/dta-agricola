/****************************************************************************
 *                                                                          * 
 *                    Sistemas DTA Serie Pv66 v0.2.4 A                      *
 *                               2022.11.14                                 *
 *                                                                          *
 *   Sensores:                                                              *
 *   - Presión 150psi............. A0                                       *
 *   - Seguridad efecto Hall...... A1                                       *
 *   - Seguridad lectura directa.. D9                                       *
 *   - Comunicación............... D2, D3                      				*
 *   - GPS........................ D11, D12, D13 (Tarjetas amarillas)       *
 *                                                                          *
 *   Configuración: {Gun, GSMr, GSMt, GPSr, GPSt, Seq, Code, Lada, Number}  *
 *   - Gun: 0 <= Relay FL | 1 <= Relay JQC                                  *
 *   - GSM: RX, TX (2, 3) <= Chip azul | (3, 2) <= Chip rojo                *
 *   - GPS: RX, TX (12, 11) <= Tarjeta blanca | (13, 12) Tarjeta amarilla   *
 *   - Seq: 0 <= Lectura directa | 1 <= Efecto Hall                         *
 *   - Code: Código del país                                                *
 *   - Lada: Código de área                                                 *
 *   - Number: Número de la tarjeta                                         *
 *                                                                          *
 ****************************************************************************/

#include <SoftwareSerial.h>
#include "analogo.h"
#include <EEPROM.h>
#include <avr/wdt.h>
#include <TinyGPS.h>

#pragma region Variables

const long config[] = {0, 3, 2, 12, 11, 0, 52, 625, 1020642};
static bool testFunc = true;
static bool testComm = false;
static bool testGPS = false;
const String telefono = testFunc ? "000000000000" : (String) config[6] + (String) config[7] + (String) config[8];
const String httpServer = "AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/comm_v3.php?id=" + telefono;
// const String httpServer = "AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/comm_v2.php?id=" + telefono;#define pinEngGunControl 4
#define pinEngGunControl 4
#define pinIrrigationControl 5
#define pinActivationTimer 6
#define pinMotorRR 7
#define pinMotorFF 8
#define pinSensorSeguridad 9
#define pinSensorVoltaje 10
#define watchDogPin A3
int serie = config[0];
// int LED = 13;

// Comunicación GSM/GPRS
SoftwareSerial gprs(config[1], config[2]);
unsigned int commDelay = 0;
//.................................................

// Comunicación GPS
TinyGPS gps;
SoftwareSerial ssGPS(config[3], config[4]);
float lat_central = 0.0f;
float lon_central = 0.0f;
float lat_actual = 0.0f;
float lon_actual = 0.0f;
int errorGPS = 0;
//.................................................

// Configuración de sensores
const int sensorPPPin = A0;                     // Presión de agua
Analogo presion = Analogo(sensorPPPin, false);
float sensorPresion = 0;
//.................................................

// Variables 
static String deviceType = "PC";                // PC | PL
static String statusVar = "OFF";
static String directionVar = "FF";
static float sensorPresionVar = 0;
static String autoreverseVar = "OFF";
static String activateAutoreverse = "OFF";
static String endGunVar = "OFF";
static String binsVar = "";
static String dataVar = "";
static int velocityVar = 0;
static float positionVar = 0.0f;
static int positionIni = 0;
static int positionEnd = 0;
static unsigned int activationTimer = 0;
static unsigned int deactivationTimer = 0;
static bool restartGSM = true;
static int signalVar = 0;
static byte commError = 0;
static bool commRx = true;
static bool isSequrity = false;

struct {
  float status;
  float direction;
  float presion;
  float lat_central;
  float lon_central;
  float positionIni;
  float positionEnd;
  float velocity;
  float endGun;
  // String data;
} eeVar;

//.................................................

bool boolData = true;   // Para test

#pragma endregion Variables

void setup() { 
  wdt_disable();
  pinMode (pinIrrigationControl, OUTPUT);
  digitalWrite(pinIrrigationControl, LOW);                          // Control de riego Activado 
  Serial.begin(115200);
  ssGPS.begin(9600);
  pinMode (pinSensorVoltaje, INPUT);
  pinMode (pinSensorSeguridad, INPUT);
  pinMode (pinEngGunControl, OUTPUT);
  pinMode (pinActivationTimer, OUTPUT);
  pinMode (pinMotorRR, OUTPUT);
  pinMode (pinMotorFF, OUTPUT);
  // pinMode(LED, OUTPUT);
  // digitalWrite(pinIrrigationControl, HIGH);                           // Control de riego Desactivado 
  apagar();
  // Serial.println();
  Serial.println(F("\n>>> DTA-Agrícola: Serie Pv66 v0.2.4 A"));
  Serial.print(F("    «"));
  Serial.print(telefono);
  Serial.println(F("»"));
  readEEPROM();
  wdt_enable(WDTO_8S);
}

void loop() {
  commDelay = millis();
  // Serial.println();
  Serial.println(F("\n> New loop\n"));
  // Serial.println();
  setupGSM();
  comunicaciones();
  commDelay = millis() - commDelay;
  Serial.print(F("Communication time: "));
  Serial.println(commDelay);
  acciones();
}

#pragma region EEPROM

void readEEPROM() {
  EEPROM.get(0, eeVar);
  if (eeVar.status == -5.0 || eeVar.status == 5.0) {
    statusVar = (eeVar.status > 0 ? "ON" : "OFF");
    directionVar = (eeVar.direction > 0 ? "FF" : "RR");
    sensorPresionVar = eeVar.presion;
    lat_central = eeVar.lat_central;
    lon_central = eeVar.lon_central;
    positionIni = eeVar.positionIni;
    positionEnd = eeVar.positionEnd;
    velocityVar = eeVar.velocity;
    endGunVar = (eeVar.endGun > 0 ? "T" : "F");
    // dataVar = eeVar.data;
    Serial.print(F("EEPROM: ")); Serial.print(statusVar);
    Serial.print(F(" ")); Serial.print(directionVar);
    Serial.print(F(" ")); Serial.print(sensorPresionVar);
    Serial.print(F(" ")); Serial.print(String(lat_central, 5));
    Serial.print(F(" ")); Serial.print(String(lon_central, 5));
    Serial.print(F(" ")); Serial.print(positionIni);
    Serial.print(F(" ")); Serial.print(positionEnd);
    Serial.print(F(" ")); Serial.print(velocityVar);
    Serial.print(F(" ")); Serial.println(endGunVar);
    // Serial.print(F(" ")); Serial.println(dataVar);
  } else {
    clearEEPROM();
  }
}

void clearEEPROM() {
  int length = EEPROM.length();
  for (int i = 0; i < length; i++) {
    EEPROM.put(i, 0);
  }
}

void updateEEPROM() {
  float st = (statusVar == "ON") ? 5.0 : -5.0;
  float di = (directionVar == "FF") ? 5.0 : -5.0;
  float eg = (endGunVar == "T") ? 5.0 : -5.0;
  if (eeVar.status != st || eeVar.direction != di || eeVar.presion != sensorPresionVar || eeVar.lat_central != lat_central || eeVar.lon_central != lon_central || eeVar.positionIni != positionIni || eeVar.positionEnd != positionEnd || eeVar.velocity != velocityVar || eeVar.endGun != eg) {
    eeVar.status = st;
    eeVar.direction = di;
    eeVar.presion = sensorPresionVar;
    eeVar.lat_central = lat_central;
    eeVar.lon_central = lon_central;
    eeVar.positionIni = positionIni;
    eeVar.positionEnd = positionEnd;
    eeVar.velocity = velocityVar;
    eeVar.endGun = eg;
    // eeVar.data = dataVar;
    EEPROM.put(0, eeVar);
    Serial.println(F("EEPROM updated successfully!"));
  }
  
}

#pragma endregion EEPROM

#pragma region Acciones

void acciones() {
  setActivationTimer();
  showVars();
  systemWatchDog();
  
  if (statusVar == "ON") {
    controlAutomatico();
  } else {
    Serial.println(F("  ~ System off! wait 1 min"));
    apagar();
    waitOneMinute();
  }
  systemWatchDog();
}

void setActivationTimer() {
  activationTimer = 600 * velocityVar;      // 60000 * velocityVar / 100;
  unsigned int dif = 60000 - activationTimer - commDelay;
  // deactivationTimer = dif > commDelay ? (dif - commDelay) : (dif > 0 ? 100 : 0);
  deactivationTimer = velocityVar == 100 ? 0 : dif > 0 ? dif : 10;
}

void showVars() {
  Serial.print(F("> Type: "));
  Serial.println(deviceType == "PC" ? "Central Pivot" : deviceType == "PC" ? "Lineal Pivot" : "Other");
  Serial.print(F("> Status: ")); Serial.println(statusVar);
  Serial.print(F("> Safety: ")); Serial.println(isSequrity ? F("TRUE") : F("FALSE"));
  Serial.print(F("> Direction: ")); Serial.println(directionVar);
  Serial.print(F("> Auto Reverse: ")); Serial.println(autoreverseVar);
  Serial.print(F("> Position: ")); Serial.print((String)positionVar); Serial.println(F("°"));
  Serial.print(F("> End Gun: ")); Serial.println((String)endGunVar);
  Serial.print(F("> Velocity: ")); Serial.print((String)velocityVar); Serial.println(F("%"));
  Serial.print(F("  ~ ON: ")); Serial.print((String)activationTimer); Serial.println(F("ms"));
  Serial.print(F("  ~ OFF: ")); Serial.print((String)deactivationTimer); Serial.println(F("ms"));
}

void controlAutomatico() {
  if (run()) {
    Serial.print(F("   ~ Stop: ")); 
    Serial.print((String)deactivationTimer);
    Serial.println(F("ms"));
    stop();
  } else {
    Serial.println(F("   ~ System off! wait 1 min"));
    apagar();
    waitOneMinute();
  }
}

bool run() {
  Serial.println(F("   System auto"));
  Serial.print(F("   ~ Run: ")); Serial.print((String)activationTimer); 
  Serial.print(F("ms (")); Serial.print((String)velocityVar); Serial.println(F("%)"));
  if (activationTimer > 0) {
    setDirection();
    unsigned long actualTime = millis();
    while ((millis() - actualTime) <= activationTimer) {
      isSequrity = controlSeguridad();
      bool isVoltage = controlVoltaje();
      bool isPosition = positionControl();
      if ((testFunc ? true : isSequrity && isVoltage && isPosition)) {
        digitalWrite(pinActivationTimer, LOW);
        digitalWrite(pinEngGunControl, (endGunVar == "ON") ? (serie == 0 ? LOW : HIGH) : (serie == 0 ? HIGH : LOW));
      } else {
        Serial.print(F("     "));
        Serial.print((!isVoltage) ? F("Voltage") : (!isSequrity) ? F("Sequrity") : (!isPosition) ? F("Position") : F("Unknow"));
        Serial.println(F(" error!"));
        digitalWrite(pinActivationTimer, HIGH);
        return false;
      }
      delay(500);          
      systemWatchDog();
    }
  }
  return true;
}

void setDirection() {
  if (directionVar == "FF") {                                     // Activavión FF
    digitalWrite(pinMotorRR, HIGH);                               // Apagado
    delay(500);
    digitalWrite(pinMotorFF, LOW);                                // Encendido
  } 
  if (directionVar == "RR") {                                     // Activavión RR
    digitalWrite(pinMotorFF, HIGH);                               // Apagado
    delay(500);
    digitalWrite(pinMotorRR, LOW);                                // Encendido
  }
}

void stop() {
  statusVar = (activationTimer == 0 && autoreverseVar == "OFF") ? "OFF" : statusVar;         // Control de apagado
  if (deactivationTimer > 0) {
    digitalWrite(pinActivationTimer, HIGH);
    unsigned long actualTime = millis();
    while ((millis() - actualTime) < deactivationTimer) {
      delay(500);
      systemWatchDog();
    }
  }
}

bool positionControl() {
  // return true; 
  positionVar = getPosition();
  systemWatchDog();
  if (lat_actual == 0.0f && lon_actual == 0.0f) {                     // Control de apagado
    statusVar = "OFF";
    return false;
  }
  return (positionIni <= positionVar && positionVar < positionEnd) ? true : false;
}

void apagar() {
  digitalWrite(pinEngGunControl, serie == 0 ? HIGH : LOW);        // Apagado
  digitalWrite(pinMotorFF, HIGH);                                 // Apagado
  digitalWrite(pinMotorRR, HIGH);                                 // Apagado
  digitalWrite(pinActivationTimer, HIGH);                         // Apagado
}

void waitOneMinute() {
  for (int i = 0; i < 60; i++){
    delay(1000);
    systemWatchDog();
  }
}

#pragma endregion Acciones

#pragma region Sensores

bool isSequre() {
  return (config[5] == 0) ? controlSeguridad1() : controlSeguridad2();
}

bool controlSeguridad() {
  if (!isSequre()) {
    Serial.println(F("     Sequrity error... try again!"));
    if (!isSequre()) {
      Serial.println(F("     Sequrity error... try again!"));
      return isSequre();
    }
  }
  return true;
}

bool controlSeguridad1() {
  delay(500);
  return digitalRead(pinSensorSeguridad);
}

bool controlSeguridad2() {
  float Sensibilidad = 0.185;
  float voltajeSensor;
  float corriente = 0;
  float Imax = 0;
  float Imin = 0;
  long tiempo = millis();
  while(millis() - tiempo < 500){ 
    voltajeSensor = analogRead(A1) * (5.0 / 1023.0);
    corriente = 0.9 * corriente + 0.1 * ((voltajeSensor - 2.5) / Sensibilidad); 
    if(corriente>Imax){ Imax = corriente; }
    if(corriente<Imin){ Imin = corriente; }
  }
  float Irms = (((Imax-Imin)/2)) * 0.707;
  Serial.print(F("          Irms: ")); Serial.println(Irms, 2);
  return Irms >= 0.1 ? true : false;
}

bool controlVoltaje() {
  return digitalRead(pinSensorVoltaje);
}

bool controlPresion() {
  bool result = true;
  if (sensorPresionVar >= 1) {
    result = (controlPresionAnalogica() > 1) ? true : false;
  }
  return result;
}

float controlPresionAnalogica() {
  float presionActual = 0.0f;
  for (int i = 0; i < 3; i++) {
    float pAnalog = presion.getAnalogValue();
    float temp = presion.fmap(pAnalog, 100, 1023, 0.0, sensorPresionVar);
    presionActual += temp > 0 ? temp : 0;
    // float temp = presion.fmap(pAnalog, 0, 1023, 0.0, sensorPresionVar) - 1.25;
    // temp = (temp + 0.4018) / 0.7373;
    // presionActual += pAnalog > 0 ? pAnalog : 0;
    delay(10);
  }
  presionActual = presionActual / 3;
  Serial.print(F("PresionF: "));
  Serial.println((String) presionActual);
  return presionActual;
}

float getPosition() {
  float azimut = positionVar;
  bool newData = parseGPSData();
  lat_central = (lat_central == 0) ? eeVar.lat_central : lat_central;
  lon_central = (lon_central == 0) ? eeVar.lon_central : lon_central;
  if (newData) {
    unsigned long age;
    gps.f_get_position(&lat_actual, &lon_actual, &age);
    azimut = gps.course_to(lat_central, lon_central, lat_actual, lon_actual);
    errorGPS = gps.hdop() == TinyGPS::GPS_INVALID_HDOP ? 0 : gps.hdop();
    // printGPSData(lat_actual, lon_actual, azimut, errorGPS);
  }
  checkGPSConnection();
  return azimut;
}

bool parseGPSData() {
  bool newData = false;
  ssGPS.listen();
  // Se parsean por un segundo los datos del GPSy se reportan algunos valores clave
  for (unsigned long start = millis(); millis() - start < 1000;) {
    while (ssGPS.available()) {
      char c = ssGPS.read();
      if (testGPS) Serial.write(c);         // descomentar para ver el flujo de datos del GPS
      if (gps.encode(c)) newData = true;    // revisa si se completó una nueva cadena
    }
  }
  return newData;
}

float printGPSData(float flat, float flon, float azimut, int errorGPS) {
  Serial.print(lat_central, 6);
  Serial.print(F(","));
  Serial.print(lon_central, 6);
  Serial.print(F(" "));
  Serial.print(flat == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flat, 6);
  Serial.print(F(","));
  Serial.print(flon == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flon, 6);
  Serial.print(F(" "));
  Serial.print(gps.satellites() == TinyGPS::GPS_INVALID_SATELLITES ? 0 : gps.satellites());
  Serial.print(F(" "));
  Serial.print((int)azimut);
  Serial.print(F(" "));
  Serial.println(errorGPS);
}

void checkGPSConnection() {
  unsigned long chars;
  unsigned short sentences, failed;
  gps.stats(&chars, &sentences, &failed);
  if (chars == 0) {
    Serial.println(F("     Problema de conectividad con el GPS: revise el cableado"));
  }
}

#pragma endregion Sensores

#pragma region Comunicaciones

void setupGSM() {
  if (restartGSM) {
    Serial.println(F("Setup GSM"));
    gprs.begin(9600);
    gprs.listen();
    if (testComm) { testComunicaciones(); }
    // gprs.println(F("AT+CBAND=PCS_MODE"));		// PGSM_MODE, DCS_MODE, PCS_MODE, EGSM_DCS_MODE, GSM850_PCS_MODE, ALL_BAND
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
  systemWatchDog();
}

void testComunicaciones() {
  gprs.println(F("AT+IPR=9600"));      // Velocidad en baudios?
  getResponse(15, testComm); 
  gprs.println(F("AT"));               // Tarjeta SIM Lista? OK
  getResponse(15, testComm); 
  // gprs.println(F("AT+CGMI"));          // Fabricante del dispositivo?
  // getResponse(15, testComm); 
  // gprs.println(F("ATI"));              // Información del producto?
  // getResponse(15, testComm); 
  // gprs.println(F("AT+CGSN"));          // Número de serie?
  // getResponse(15, testComm); 
  // gprs.println(F("AT+IPR?"));          // Velocidad en baudios?
  // getResponse(15, testComm); 
  // gprs.println(F("AT+CBC"));           // Estado de la bateriía
  // getResponse(15, testComm); 
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
  // gprs.println(F("AT+CCLK?"));         // Fecha y Hora?
  // getResponse(15, testComm); 
  // gprs.println(F("AT+COPS?"));         // Comañía telefónica?
  // getResponse(15, testComm); 
}

void comunicaciones() {
  Serial.println(F("Server communication"));
  positionVar = getPosition();
  // systemWatchDog();
  String data = httpRequest();                                                       // Get Settings from HTTP
  data = data.substring(data.indexOf('"'), data.indexOf("OK"));
  // Para test
  // if (testFunc) {
  //   data = (boolData) ? "\"ON\"FF\"0\"OFF\"30.73081\"-107.86308\"PC\"1\"0\"360\"50\"F\"" : "\"ON\"RR\"0\"OFF\"30.73081\"-107.86308\"PC\"1\"0\"360\"50\"F\"";
  //   commError = 0;
  //   boolData = boolData == true ? false : true;
  // }
  if (data != "" && (data.indexOf("ON") != -1 || data.indexOf("OFF") != -1)) {
    setVariables(data);
    updateEEPROM();
  } else {
    Serial.print(F("lat_central: ")); Serial.print(lat_central, 2); Serial.print(F(" lon_central: ")); Serial.println(lon_central, 2);
    Serial.println(F("data: Error!"));
  }
}

void setVariables(String data) {
  Serial.print(F("data: ")); Serial.println(data);
  commRx = (data != "") ? true : false;
  int idx = data.indexOf('"');
  String aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  statusVar = (aux == "ON" || aux == "OFF") ? aux : statusVar;                       // > status
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  directionVar = (aux == "FF" || aux == "RR") ? aux : directionVar;                  // > direction
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  sensorPresionVar = (aux == "") ? sensorPresionVar : (aux.toFloat() > 0) ? aux.toFloat() : 0;    // > sensor de presión
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  autoreverseVar = (aux == "ON" || aux == "OFF") ? aux : autoreverseVar;             // > autoreverse
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  lat_central = (aux != "") ? aux.toFloat() : lat_central;                           // > lat_central
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  lon_central = (aux != "") ? aux.toFloat() : lon_central;                           // > lon_central
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  deviceType = (aux != "") ? aux : deviceType;                                       // > deviceType
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  int bindsNo = (aux != "") ? aux.toInt() : 0;                                       // > bins
  if (bindsNo > 0) {
    binsVar = data.substring(idx + 1);
    for (int i = 0; i < bindsNo; i++) {
      idx = data.indexOf('"', idx + 1);
      positionIni = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();   // inicio
      idx = data.indexOf('"', idx + 1);
      positionEnd = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();   // fin
      idx = data.indexOf('"', idx + 1);
      int bindVel = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();   // velocidad
      idx = data.indexOf('"', idx + 1);
      String bindEndGun = (data.substring(idx + 1, data.indexOf('"', idx + 1)));     // end gun
      if (positionIni <= positionVar && positionVar < positionEnd) {
        velocityVar = (bindVel > 100) ? 100 : (bindVel < 0) ? 0 : bindVel;
        endGunVar = (bindEndGun == "T") ? "ON" : "OFF";
        break;
      }
    }
  }
  systemWatchDog();
}

String httpRequest() {
  gprs.listen();
  String param1 = "&st=" + statusVar;
  String param2 = "&sa=" + (String)(isSequrity ? "true" : "false");
  String param3 = "&di=" + directionVar;
  String param4 = "&vo=" + (String)(controlVoltaje() ? "true" : "false");
  String param5 = "&ar=" + activateAutoreverse;
  String param6 = "&sp=" + (String)velocityVar;
  String param7 = "&pr=" + (String)controlPresionAnalogica();
  String param8 = "&po=" + String(positionVar, 1);
  String param9 = "&la=" + String(lat_actual, 5);
  String param10 = "&lo=" + String(lon_actual, 5);
  String param11 = "&er=" + (String)errorGPS;
  String param12 = "&rx=" + (String)(commRx ? "Ok" : "Er");
  signalVar = getSignalValue();
  String param13 = "&si=" + (String)signalVar + "\"";
  if (testComm) Serial.println(httpServer + param1 + param2 + param3 + param4 + param5 + param6 + param7 + param8 + param9 + param10 + param11 + param12 + param13);
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, true); 
  gprs.println(httpServer + param1 + param2 + param3 + param4 + param5 + param6 + param7 + param8 + param9 + param10 + param11 + param12 + param13);
  getResponse(25, true); 
  systemWatchDog();
  gprs.println(F("AT+HTTPACTION=0"));
  String result = getResponse(6000, true); 
  systemWatchDog();
  restartGSM = (result.indexOf("ERROR") != -1 || result.indexOf("601") != -1  || result.indexOf("604") != -1 || signalVar < 6) ? true : false;
  gprs.println(F("AT+HTTPREAD"));
  result = getResponse(0, false);
  gprs.println(F("AT+HTTPTERM"));
  getResponse(30, false); 
  commWatchDogReset(signalVar);
  systemWatchDog();
  return result;
}

String getResponse(int wait, bool response){
  String result = "";
  delay(wait);
  systemWatchDog();
  unsigned long iTimer = millis();
  while(!gprs.available() && (millis() - iTimer) <= 1000) {
    delay(5);    
  }
  while(gprs.available() > 0) {
    result += (char)gprs.read();
    delay(1.5);
  }
  result = result != "" ? result : "ERROR";
  if (response) {
    Serial.println(result);
  }
  // systemWatchDog();
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
  commError += (signalValue < 6 || restartGSM) ? 1 : 0;
  Serial.print(F("commError: "));
  Serial.println(commError);
  if (commError == 5) {
    while (true) { delay(1000); }
  }
}

#pragma endregion Comunicaciones

#pragma region Generales

void systemWatchDog() {
  wdt_reset();
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, HIGH);
  delay(50);                           // Give enough time for C2 to discharge (should discharge in 50 ms)     
  digitalWrite(watchDogPin, LOW);          // Return to high impedance
}

void systemWatchDog2() {
  wdt_reset();
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, LOW);
  delay(100);                           // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
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
 * Errores HTTP:                                              	*
 *                                                              * 
 * 502	Bad Gateway	The remote server returned an error.        *
 * 600*	Empty access token.                                     *
 *                                                              *
 * 601*	Access token invalid                                    *
 * 602*	Access token expired                                    *
 * 603	Access denied                                           *
 * 604*	Request timed out                                       *
 * 605*	HTTP Method not supported                               *
 * 606	Max rate limit ‘%s’ exceeded with in ‘%s’ secs          *
 * 607	Daily quota reached                                     *
 *                                                              *
 * 608*	API Temporarily Unavailable	                            *
 * 609	Invalid JSON                                            *
 * 610	Requested resource not found                            *
 * 611*	System error	All unhandled exceptions                  *
 * 612	Invalid Content Type                                    *
 * 613	Invalid Multipart Request                               *
 * 614	Invalid Subscription                                    *
 * 615	Concurrent access limit reached                         *
 * 616	Invalid subscription type                               *
 * 701	%s cannot be blank                                      *
 * 702	No data found for given search scenario                 *
 *                                                              *
 * 703	Feature is not enabled for the subscription             *
 * 704	Invalid date format                                     *
 * 709	Business Rule Violation                                 *
 * 710	Parent Folder Not Found                                 *
 * 711	Incompatible Folder Type                                *
 * 712	Merge to person Account operation is invalid            *
 * 713	A system resource was temporarily unavailable           *
 * 714	Unable to find default record type                      *
 * 718	ExternalSalesPersonID not found                         *
 *                                                              *
 ****************************************************************/

/****************************************************************
  *                                                              *
  * Valor  dB   Condición                                        *
  * ===== ====  =========                                        *
  *  2	  -109	Marginal                                          *
  *  3	  -107	Marginal                                          *
  *  4	  -105	Marginal                                          *
  *  5	  -103	Marginal                                          *
  *  6	  -101	Marginal                                          *
  *  7	   -99	Marginal                                          *
  *  8	   -97	Marginal                                          *
  *  9	   -95	Marginal                                          *
  * 10	   -93	OK                                                *
  * 11	   -91	OK                                                *
  * 12	   -89	OK                                                *
  * 13	   -87	OK                                                *
  * 14	   -85	OK                                                *
  * 15	   -83	Good                                              *
  * 16	   -81	Good                                              *
  * 17	   -79	Good                                              *
  * 18	   -77	Good                                              *
  * 19	   -75	Good                                              *
  * 20	   -73	Excellent                                         *
  * 21	   -71	Excellent                                         *
  * 22	   -69	Excellent                                         *
  * 23	   -67	Excellent                                         *
  * 24	   -65	Excellent                                         *
  * 25	   -63	Excellent                                         *
  * 26	   -61	Excellent                                         *
  * 27	   -59	Excellent                                         *
  * 28	   -57	Excellent                                         *
  * 29	   -55	Excellent                                         *
  * 30	   -53	Excellent                                         *
  *                                                              *
  ****************************************************************/
