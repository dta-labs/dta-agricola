#pragma region Variables

const long config[] = {0, 2, 3, 12, 11, 1, 52, 625, 1020642};
const String telefono = (String) config[6] + (String) config[7] + (String) config[8];
// const String telefono = "000000000000";
const String httpServer = "AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/comm_v3.php?id=" + telefono;
// const String httpServer = "AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/comm_v2.php?id=" + telefono;#define pinEngGunControl 4
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

// Comunicación GSM/GPRS
SoftwareSerial gprs(config[1], config[2]);
unsigned int commDelay = 0;
//.................................................

// Comunicación GPS
float lat_central = 0.0f;
float lon_central = 0.0f;
int errorGPS = 0;
//.................................................

// Configuración de sensores
const int sensorPPPin = A0;                     // Presión de agua
Analogo presion = Analogo(sensorPPPin, false);
float sensorPresion = 0;
//.................................................

// Variables 
static bool testComm = false;
static bool testFunc = false;
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

