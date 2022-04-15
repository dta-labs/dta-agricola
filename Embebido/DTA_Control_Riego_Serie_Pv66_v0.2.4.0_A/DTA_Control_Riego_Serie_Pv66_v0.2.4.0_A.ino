/****************************************************************
 *                                                              * 
 *                Sistemas DTA Serie Pv66 v0.2.4 A              *
 *                           2022.04.14                         *
 *                                                              *
 *   Sensores:                                                  *
 *   - Atasco............... D9                                 *
 *   - Presión 150psi....... A0                                 *
 *   - Brújula QMC5883L..... A4 y A5                            *
 *   - Comunicación......... Rx -> D2 | Tx -> D3                *
 *   - GPS.................. Rx -> D12 | Tx -> D11              *
 *                                                              *
 *   Almacenamiento en EEPROM                                   *
 *                                                              *
 ****************************************************************/

#include <SoftwareSerial.h>
#include "analogo.h"
#include <QMC5883LCompass.h>
#include <EEPROM.h>
#include <avr/wdt.h>
#include <TinyGPS.h>

#pragma region Variables

#define telefono "000000000000"
// #define telefono "526258372598"
#define httpServer "AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/comm_v2.php?id=" telefono
// #define httpServer "AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/comm_v2.php?id=" telefono
#define pinEngGunControl 4
#define pinIrrigationControl 5
#define pinActivationTimer 6
#define pinMotorRR 7
#define pinMotorFF 8
#define pinSensorSeguridad 9
#define pinSensorVoltaje 10
#define serie 0                                 // 0 <= FL | 1 <= JQC
#define restart asm("jmp 0x0000")
#define positionSensor "GPS"                    // GPS | Compass

// Comunicación GSM/GPRS
SoftwareSerial gprs(2, 3);                      // RX, TX
unsigned int commDelay = 0;
//.................................................

// Comunicación GPS
TinyGPS gps;
SoftwareSerial ssGPS(12, 11);                   // RX, TX
float lat_central = 0.0f;
float lon_central = 0.0f;
float lat_actual = 0.0f;
float lon_actual = 0.0f;
int frecuence =  1000;
int errorGPS = 0;
//.................................................

// Brújula
QMC5883LCompass compass;
//.................................................

// Configuración de sensores
const int sensorPPPin = A0;                     // Presión de agua
Analogo presion = Analogo(sensorPPPin, false);
float sensorPresion = 0;
//.................................................

// Variables 
static bool testComm = false;
static String deviceType = "PC";                // PC | PL
static String statusVar = "OFF";
static String directionVar = "FF";
static float sensorPresionVar = 0;
static String autoreverseVar = "OFF";
static String activateAutoreverse = "OFF";
static String endGunVar = "OFF";
static String binsVar = "";
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

struct eeObject {
  float status = 0.0f;
  float direction = 0.0f;
  float sensorPresion = 0.0f;
  float velocity = 0.0f;
  float lat_central = 0.0f;
  float lon_central = 0.0f;
  String bins = "";
};

// struct eeObject {
//   float idx = 0.00;
//   String data = "";
// };

eeObject eeVar;
//.................................................

bool boolData = true;   // Para test

#pragma endregion Variables

void setup() { 
  pinMode (pinIrrigationControl, OUTPUT);
  digitalWrite(pinIrrigationControl, LOW);                          // Control de riego Activado 
  wdt_disable();
  // setupCompass();
  Serial.begin(115200);
  ssGPS.begin(9600);
  pinMode (pinSensorVoltaje, INPUT);
  pinMode (pinSensorSeguridad, INPUT);
  pinMode (pinEngGunControl, OUTPUT);
  pinMode (pinActivationTimer, OUTPUT);
  pinMode (pinMotorRR, OUTPUT);
  pinMode (pinMotorFF, OUTPUT);
  // digitalWrite(pinIrrigationControl, HIGH);                           // Control de riego Desactivado 
  apagar();
  Serial.println();
  Serial.println(F(">>> DTA-Agrícola: Serie Pv66 v0.2.4 A"));
  Serial.print(F("    «"));
  Serial.print(telefono);
  Serial.println(F("»"));
  readEEPROM();
  // if (controlVoltaje()) {
  //   digitalWrite(pinIrrigationControl, LOW);                          // Control de riego Activado 
  // }
  wdt_enable(WDTO_8S);
}

void loop() {
  Serial.println();
  Serial.println(F("> New loop"));
  Serial.println();
  acciones();
  wdt_reset();
  commDelay = millis();
  setupGSM();                                     // Comentar esta línea para test
  wdt_reset();
  comunicaciones();
  commDelay = millis() - commDelay;
  Serial.print(F("Tiempo comunicciones: "));
  Serial.println(commDelay);
}

#pragma region EEPROM

// void readEEPROM() {
//   // EEPROM.get(0, eeVar);
//   // Serial.print(F("EEPROM "));
//   // Serial.print(EEPROM.length());
//   // Serial.print(F(": "));
//   // Serial.println(eeVar.data);
//   // setVariables(eeVar.data);
// }

// void updateEEPROM(String eeValue) {
//   // eeVar.data = eeValue;
//   // EEPROM.put(0, eeVar);
//   // Serial.print(F("EEPROM: "));
//   // Serial.print(eeVar.data);
//   // Serial.println(F("... update successfully!"));
// }

void readEEPROM() {
  // EEPROM.get(0, eeVar);
  // statusVar = (eeVar.status > 0) ? "ON" : "OFF";
  // directionVar = (eeVar.direction > 0) ? "FF" : "RR";
  // sensorPresionVar = eeVar.sensorPresion;
  // velocityVar = (eeVar.velocity > 100) ? 100 : (eeVar.velocity < 0) ? 0 : eeVar.velocity;
  // lat_central = eeVar.lat_central;
  // lon_central = eeVar.lon_central;
  // // binsVar = eeVar.bins;
  // Serial.print(F("EEPROM ")); Serial.print(EEPROM.length());
  // Serial.print(F(": ")); Serial.print(statusVar);
  // Serial.print(F(" ")); Serial.print(directionVar);
  // Serial.print(F(" ")); Serial.print((String)sensorPresionVar);
  // Serial.print(F(" ")); Serial.print((String)velocityVar);
  // Serial.print(F(" ")); Serial.print(String(lat_central, 6));
  // Serial.print(F(" ")); Serial.println(String(lon_central, 6));
  // // Serial.print(F(" ")); Serial.println(binsVar);
}

void updateEEPROM() {
  // String stVar = (eeVar.status > 0) ? "ON" : "OFF";
  // String diVar = (eeVar.direction > 0) ? "FF" : "RR";
  // float spVar = eeVar.sensorPresion;
  // float veVar = eeVar.velocity;
  // float latVar = eeVar.lat_central;
  // float lonVar = eeVar.lon_central;
  // // String biVar = eeVar.bins;
  // if (statusVar != stVar || directionVar != diVar || sensorPresionVar != spVar || velocityVar != veVar || (lat_central != latVar && lat_central != 0.0f) || (lon_central != lonVar && lon_central != 0.0f) /*|| (binsVar != biVar)*/) {
  //   eeVar.status = (statusVar == "ON") ? 5.00 : -5.00;
  //   eeVar.direction = (directionVar == "FF") ? 5.00 : -5.00;;
  //   eeVar.sensorPresion = sensorPresionVar;
  //   eeVar.velocity = velocityVar;
  //   eeVar.lat_central = (lat_central != 0.0f) ? lat_central : eeVar.lat_central;
  //   eeVar.lon_central = (lon_central != 0.0f) ? lon_central : eeVar.lon_central;
  //   // eeVar.bins = binsVar;
  //   EEPROM.put(0, eeVar);
  //   Serial.print(F("EEPROM: ")); Serial.print(eeVar.status);
  //   Serial.print(F(" ")); Serial.print(eeVar.direction);
  //   Serial.print(F(" ")); Serial.print(eeVar.sensorPresion);
  //   Serial.print(F(" ")); Serial.print(eeVar.velocity);
  //   Serial.print(F(" ")); Serial.print(String(eeVar.lat_central, 6));
  //   Serial.print(F(" ")); Serial.print(String(eeVar.lon_central, 6));
  //   // Serial.print(F(" ")); Serial.print(eeVar.bins);
  //   Serial.println(F("... update successfully!"));
  // }
}

#pragma endregion EEPROM

#pragma region Acciones

void acciones() {
  setActivationTimer();
  showVars();
  wdt_reset();
  bool isVoltaje = controlVoltaje();
  bool isPresure = controlPresion();
  bool isPosition = positionControl();
  Serial.print("volt: ");
  Serial.print(isVoltaje);
  Serial.print("  presure: ");
  Serial.print(isPresure);
  Serial.print("  pos: ");
  Serial.println(isPosition);
  if (isVoltaje && isPresure /*&& isPosition*/) {
    Serial.println(F("> Actions:"));
    control();
  } else {
    Serial.println(F("> Actions: low presure/voltage... system waiting for restoration"));
    apagar();                                                         // Control de riego Desactivado 
    for (int i = 0; i < 60; i++) {
      delay(1000);
      isVoltaje = controlVoltaje();
      isPresure = controlPresion();
      if (isVoltaje && isPresure) {
        control();
        break;
      }
      wdt_reset();
    }
  }
}

void setActivationTimer() {
  // Serial.println("velocityVar " + (String)velocityVar);
  // Serial.println("autoreverseVar " + autoreverseVar);
  // Serial.println("activateAutoreverse " + activateAutoreverse);
  // activateAutoreverse = (activateAutoreverse == "ON" && velocityVar != 0) ? "OFF" : activateAutoreverse;
  // if (autoreverseVar == "ON" && velocityVar == 0 && activateAutoreverse == "OFF") {
  //   velocityVar = 100;
  //   directionVar = (directionVar == "FF") ? "RR": "FF";
  //   activateAutoreverse = "ON";
  // }
  // unsigned int stopTime = (60000 - activationTimer) >= commDelay ? (60000 - activationTimer - commDelay) : activationTimer == 60000 ? 100 : commDelay - (60000 - activationTimer);
  activationTimer = 60000 * velocityVar / 100;
  deactivationTimer = (60000 - activationTimer) >= commDelay ? (60000 - activationTimer - commDelay) : (60000 - activationTimer) > 0 ? 1 : 0;
}

void showVars() {
  Serial.print(F("> Type: "));
  Serial.println(deviceType == "PC" ? "Central Pivot" : deviceType == "PC" ? "Lineal Pivot" : "Other");
  Serial.print(F("> Status: "));
  Serial.println(statusVar);
  Serial.print(F("> Direction: "));
  Serial.println(directionVar);
  Serial.print(F("> Auto Reverse: "));
  Serial.println(autoreverseVar);
  Serial.print(F("> Position: "));
  Serial.println((String)positionVar + "°");
  Serial.print(F("> End Gun: "));
  Serial.println((String)endGunVar);
  Serial.print(F("> Velocity: "));
  Serial.println((String)velocityVar + "%");
  Serial.print(F("  ~ ON: "));
  Serial.println((String)activationTimer + "ms");
  Serial.print(F("  ~ OFF: "));
  Serial.println((String)deactivationTimer + "ms");
}

void control() {
  if (statusVar == "ON") {
    setDirection();
    wdt_reset();
    controlAutomatico();
  } else {
    Serial.println(F("  ~ Sistem off! wait 1min"));
    apagar();
    for (int i = 0; i < 60; i++){                       // Esperar 1 minuto
      delay(1000);
      wdt_reset();
    }
  }
  wdt_reset();
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
  int waitTime = 0;
  while (!digitalRead(pinSensorSeguridad) && statusVar == "ON" && waitTime < 3000) {
    delay(500);
    waitTime += 500;
  };
}

void controlAutomatico() {
  Serial.println(F("   Sistem auto"));
  Serial.print(F("   ~ Run: "));
  Serial.print((String)activationTimer);
  Serial.print(F("ms ("));
  Serial.print((String)velocityVar);
  Serial.println(F("%)"));
  run();
  Serial.print(F("   ~ Stop: "));
  Serial.print((String)deactivationTimer);
  Serial.println(F("ms"));
  stop();
}

void run() {
  unsigned long actualTime = millis();
  if (activationTimer > 0) {
    while ((millis() - actualTime) < activationTimer) {
      bool isVoltaje = controlVoltaje();
      bool isPosition = positionControl();
      bool isSecure = controlSeguridad();
      if (isVoltaje && isSecure /*&& isPosition*/) {
        digitalWrite(pinActivationTimer, LOW);
        digitalWrite(pinEngGunControl, (endGunVar == "ON") ? (serie == 0 ? LOW : HIGH) : (serie == 0 ? HIGH : LOW));
      } else {
        String msg = !isVoltaje ? "voltage" : !isPosition ? "position" : !isSecure ? "security" : "unknow";
        Serial.print(F("Error: "));
        Serial.println(msg);
        digitalWrite(pinActivationTimer, HIGH);
      }
      delay(500);          
      wdt_reset();
    }
  }
}

void stop() {
  statusVar = (activationTimer == 0) ? "OFF" : statusVar;         // Control de apagado
  if (deactivationTimer > 0) {
    digitalWrite(pinActivationTimer, HIGH);
    for (int i = 0; i < deactivationTimer / 100; i++){
      delay(100);
      wdt_reset();
    }
  }
}

bool positionControl() {
  positionVar = getPosition();
  return (positionIni <= positionVar && positionVar < positionEnd) ? true : false;
}

void apagar() {
  digitalWrite(pinEngGunControl, serie == 0 ? HIGH : LOW);        // Apagado
  digitalWrite(pinMotorFF, HIGH);                                 // Apagado
  digitalWrite(pinMotorRR, HIGH);                                 // Apagado
  digitalWrite(pinActivationTimer, HIGH);                         // Apagado
  delay(1000);
  wdt_reset();
}

#pragma endregion Acciones

#pragma region Sensores

bool controlSeguridad() {
  bool sensorSeguridad = true;
  // bool sensorSeguridad = digitalRead(pinSensorSeguridad);
  if (!sensorSeguridad) {
    Serial.println(F("    Falla sensor de seguridad... reintentando!"));
    setDirection();
    wdt_reset();
    sensorSeguridad = digitalRead(pinSensorSeguridad);
    if (!sensorSeguridad) {
      Serial.println(F("    Falla sensor de seguridad... reintentando nuevamente!"));
      setDirection();
      wdt_reset();
    }
    sensorSeguridad = digitalRead(pinSensorSeguridad);
  }
  return sensorSeguridad;
}

bool controlVoltaje() {
  bool sensorVoltaje = true;
  // bool sensorVoltaje = digitalRead(pinSensorVoltaje);
  if (!sensorVoltaje) {
    Serial.println(F("Sistem off: Electric alarm!"));
    apagar();
  }
  return sensorVoltaje;
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
  float newPosition = (positionSensor == "GPS") ? getGPSPosition() : getCompassPosition();
  // if (lat_central * lon_central != 0.0f) { 
  //   float movementEstimation = velocityVar / 100;
  //   if (directionVar == "FF") {             // Filtro ascendente
  //     newPosition = (statusVar == "OFF") ? positionVar : (positionVar <= newPosition && newPosition <= positionVar + 2) || (positionVar == 359 && (newPosition == 360 || (0 <= newPosition && newPosition <= 2))) ? newPosition : (positionVar + movementEstimation > 360) ? positionVar + movementEstimation - 360 : positionVar + movementEstimation;
  //   } else {                                // Filtro descendente
  //     newPosition = (statusVar == "OFF") ? positionVar : (positionVar - 2 <= newPosition && newPosition <= positionVar) || (positionVar == 0 && (newPosition == 360 || (358 <= newPosition && newPosition <= 360))) ? newPosition : (positionVar - movementEstimation < 0) ? positionVar - movementEstimation + 360 : positionVar - movementEstimation;
  //   }
  // }
  // Serial.print("newPosition filtered: ");
  // Serial.println(newPosition);
  return newPosition;
}

float getGPSPosition() {                  // Posición por GPS
  float azimut = positionVar;
  bool newData = parseGPSData();
  // lat_central = (lat_central == 0) ? eeVar.lat_central : lat_central;
  // lon_central = (lon_central == 0) ? eeVar.lon_central : lon_central;
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
  for (unsigned long start = millis(); millis() - start < frecuence;) {
    while (ssGPS.available()) {
      char c = ssGPS.read();
      // Serial.write(c);   // descomentar para ver el flujo de datos del GPS
      if (gps.encode(c))    // revisa si se completó una nueva cadena
        newData = true;
    }
  }
  return newData;
}

float printGPSData(float flat, float flon, float azimut, int errorGPS) {
  Serial.print(lat_central, 6);
  Serial.print(",");
  Serial.print(lon_central, 6);
  Serial.print(" ");
  Serial.print(flat == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flat, 6);
  Serial.print(",");
  Serial.print(flon == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flon, 6);
  Serial.print(" ");
  Serial.print(gps.satellites() == TinyGPS::GPS_INVALID_SATELLITES ? 0 : gps.satellites());
  Serial.print(" ");
  Serial.print((int)azimut);
  Serial.print(" ");
  Serial.println(errorGPS);
}

void checkGPSConnection() {
  unsigned long chars;
  unsigned short sentences, failed;
  gps.stats(&chars, &sentences, &failed);
  if (chars == 0) {
    Serial.println("Problema de conectividad con el GPS: revise el cableado");
  }
}

float getCompassPosition() {               // Posición por Brújula
  compass.read();
  delay(1000);
  return (float) compass.getAzimuth();
}

void setupCompass() {
  compass.init();                                             // Inicializar brújula
  // compass.setMode(0x01,0x0C,0x10,0xC0);
  compass.setSmoothing(10, true);  
  compass.setCalibration(-511, 1017, 0, 2027, 0, 315);    // Calibrar brújula
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
  Serial.println(F("Server communication"));
  positionVar = getPosition();
  String data = httpRequest();                                                       // Get Settings from HTTP
  data = data.substring(data.indexOf('"'), data.indexOf("OK"));
  // Para test
  // String data = (boolData) ? "\"ON\"FF\"0\"OFF\"30.73081\"-107.86308\"PC\"1\"0\"360\"100\"F\"" : "\"ON\"RR\"0\"OFF\"30.73081\"-107.86308\"PC\"1\"0\"360\"100\"F\"";
  // boolData = boolData == true ? false : true;
  setVariables(data);
  updateEEPROM();
}

void setVariables(String data) {
  // data = data != "" ? data : eeVar.data;
  Serial.print(F("data: "));
  Serial.println(data);
  commRx = (data != "") ? true : false;
  int idx = data.indexOf('"');
  String aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  statusVar = (aux == "ON" || aux == "OFF") ? aux : statusVar;                       // > status
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  directionVar = (aux == "FF" || aux == "RR") ? aux : directionVar;                  // > direction
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  sensorPresionVar = (aux == "") ? sensorPresionVar : (aux.toFloat() > 0) ? aux.toFloat() : 0;                 // > sensor de presión
  // Set velocity
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
  int bindsNo = (aux != "") ? aux.toInt() : 0;                                         // > bins
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
  wdt_reset();
}

String httpRequest() {
  gprs.listen();
  String param1 = "&st=" + statusVar;
  String param2 = "&sa=" + (String)(digitalRead(pinSensorSeguridad) ? "true" : "false");
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
  // Serial.println(httpServer + param1 + param2 + param3 + param4 + param5 + param6 + param7 + param8 + param9 + param10 + param11 + param12 + param13);
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, true); 
  gprs.println(httpServer + param1 + param2 + param3 + param4 + param5 + param6 + param7 + param8 + param9 + param10 + param11 + param12 + param13);
  getResponse(25, true); 
  wdt_reset();
  gprs.println(F("AT+HTTPACTION=0"));
  String result = getResponse(6000, true); 
  wdt_reset();
  restartGSM = (result.indexOf("ERROR") != -1 || result.indexOf("601") != -1  || result.indexOf("604") != -1 || signalVar < 6) ? true : false;
  gprs.println(F("AT+HTTPREAD"));
  result = getResponse(0, false);
  wdt_reset();
  gprs.println(F("AT+HTTPTERM"));
  getResponse(30, false); 
  commWatchDogReset(signalVar);
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
  if (commError == 2) {
    wdt_enable(WDTO_15MS);
    delay(100);
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
