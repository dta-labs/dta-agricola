/****************************************************************************
 *                                                                          * 
 *   Configuración: {GUN, GSMr, GSMt, GPSr, GPSt, SEQ}                      *
 *   - GUN: 0 <= Relay FL | 1 <= Relay JQC                                  *
 *   - GSM: Rx, Tx (2, 3) <= Chip azul | (3, 2) <= Chip rojo                *
 *   - GPS: Rx, Tx (12, 11) <= Tarjeta blanca | (13, 12) Tarjeta amarilla   *
 *   - SEQ: 0 <= Lectura directa | 1 <= Efecto Hall                         *
 *                                                                          *
 ****************************************************************************/

#pragma region Variables

const long config[] = {0, 3, 2, 12, 11, 0, 52, 625, 1020642};
// const String telefono = (String) config[6] + (String) config[7] + (String) config[8];
const String telefono = "000000000000";
const String httpServer = "AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/comm_v3.php?id=" + telefono;
// const String httpServer = "AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/comm_v2.php?id=" + telefono;
#define pinEngGunControl 4
#define pinIrrigationControl 5
#define pinActivationTimer 6
#define pinMotorRR 7
#define pinMotorFF 8
#define pinSensorSeguridad 9
#define pinSensorVoltaje 10
#define watchDogPin A5
int serie = config[0];
// int LED = 13;

#pragma region <<GSM/GPRS>>

SoftwareSerial gprs(config[1], config[2]);
byte commFrec = 0;

#pragma endregion <<GSM/GPRS>>

#pragma region <<GPS>>

TinyGPS gps;
SoftwareSerial ssGPS(config[3], config[4]);
float lat_central = 0.0f;
float lon_central = 0.0f;
float lat_actual = 0.0f;
float lon_actual = 0.0f;
int errorGPS = 0;

#pragma endregion <<GPS>>

#pragma region <<Sensores>>

const int sensorPPPin = A0;                     // Presión de agua
Analogo presion = Analogo(sensorPPPin, false);
float sensorPresion = 0;

#pragma endregion <<Sensores>>

#pragma region <<Variables estáticas>>
 
static bool testComm = false;                   // Para test
static bool testFunc = false;                   // Para test
static bool testData = true;                    // Para test
static String deviceType = "PC";                // PC | PL
static String statusVar = "OFF";
static String directionVar = "FF";
static float sensorPresionVar = 0;
static String autoreverseVar = "OFF";
static String endGunVar = "OFF";
static String binsVar = "";
static String dataVar = "";
static int velocityVar = 0;
static float positionVar = 0.0f;                      // Posición
static int positionIni = 0;
static int positionEnd = 0;
static unsigned long actualTimer = 0;                 // Temporizadores
static unsigned int activationTimer = 0;
static unsigned int deactivationTimer = 60000;
static bool restartGSM = true;                        // Comunicaciones
static int signalVar = 0;
static byte commError = 0;
static bool commRx = true;
static bool isSequrity = false;                       // Sensores
static bool isVoltage = false;
static bool isPresure = false;
static bool isPosition = false;

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

#pragma endregion <<Variables estáticas>>

#pragma region <<Máquina de estado>>

enum Estado {
  INICIAL,
  SENSORES,
  AVANZANDO,
  DETENIDO,
  APAGADO,
  NUEVOCICLO,
  COMUNICACION
} estadoActual = Estado::NUEVOCICLO;

Estado matrizEstados[5][4] = {{ NUEVOCICLO, SENSORES, SENSORES, APAGADO},               // INICIAL
                              { INICIAL, AVANZANDO, DETENIDO, INICIAL},                 // SENSORES
                              { INICIAL, COMUNICACION, INICIAL, INICIAL},               // AVANZANDO
                              { INICIAL, INICIAL, COMUNICACION, INICIAL},               // DETENIDO
                              { INICIAL, COMUNICACION, COMUNICACION, COMUNICACION}};    // APAGADO

#pragma endendregion <<Máquina de estado>>

#pragma endregion <<Variables>>

#pragma endregion Variables

