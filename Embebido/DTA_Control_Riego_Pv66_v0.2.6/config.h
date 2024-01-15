/****************************************************************************
 *                                                                          * 
 *   Configuración: {GUN, GSMr, GSMt, GPSr, GPSt, SEQ}                      *
 *   - GUN: 0 <= Relay FL | 1 <= Relay JQC                                  *
 *   - GSM: Rx, Tx (2, 3) <= Chip azul | (3, 2) <= Chip rojo                *
 *   - GPS: Rx, Tx (12, 11) <= Tarjeta blanca | (13, 12) Tarjeta amarilla   *
 *   - SEQ: 0 <= Lectura directa | 1 <= Efecto Hall                         *
 *                                                                          *
 ****************************************************************************/

#pragma region Definiciones

String fillNumber(int number, byte positions) {
  String numberStr = ((String) number);
  byte cerosLength = positions - numberStr.length();
  String result = "";
  for (byte i = 0; i < cerosLength; i++) {
    result += "0";
  }
  return result + numberStr;
}

// const int config[] = {0, 3, 2, 12, 11, 0, 0, 0, 0, 0};
const int config[] = {0, 3, 2, 12, 11, 0, 52, 625, 120, 1079};
const String telefono = fillNumber(config[6], 2) + fillNumber(config[7], 3) + fillNumber(config[8], 3) + fillNumber(config[9], 4);
// const String httpServer = "AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/comm_v3.php?id=" + telefono;
const String httpServer = "AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/comm_v3.php?id=" + telefono;
#define pinEngGunControl 4 
#define pinIrrigationControl 5
#define pinActivationTimer 6
#define pinMotorRR 7
#define pinMotorFF 8
#define pinSensorSeguridad 9
#define pinSensorVoltaje 10
#define watchDogPin A3
#define commFrec 30

byte serie = config[0];

#pragma endregion Definiciones

#pragma region <<GSM/GPRS>>

SoftwareSerial gprs(config[1], config[2]);

#pragma endregion <<GSM/GPRS>>

#pragma region <<GPS>>

TinyGPS gps;
SoftwareSerial ssGPS(config[3], config[4]);
float lat_central = 0.0f;
float lon_central = 0.0f;
float lat_actual = 0.0f;
float lon_actual = 0.0f;
byte errorGPS = 0;

#pragma endregion <<GPS>>

#pragma region <<Variables Generales>>
 
bool testComm = false;                         // Para test
bool testFunc = false;                         // Para test
bool testData = false;                         // Para test
String deviceType = "PC";                      // PC | PL
String statusVar = "OFF";
String lastDirectionVar = "FF";
String directionVar = "FF";
String autoreverseVar = "OFF";
String endGunVar = "OFF";
byte velocityVar = 0;
float positionVar = 0.0f;                      // Posición
int positionIni = 0;
int positionEnd = 0;
unsigned int activationTimer = 0;              // Temporizadores
unsigned int deactivationTimer = 60000;
bool restartGSM = true;                        // Comunicaciones
byte signalVar = 0;
byte commError = 0;
bool commRx = true;
bool isSequrity = false;                       // Sensores
bool isVoltage = false;
bool isPresure = false;
bool isPosition = false;
float sensorPresionVar = 0;
float actualPresure = 0;

#pragma endregion <<Variables Generales>>

#pragma endregion <<Variables>>

