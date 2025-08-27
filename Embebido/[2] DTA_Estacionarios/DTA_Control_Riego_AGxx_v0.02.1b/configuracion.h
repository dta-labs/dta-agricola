#pragma region Variables

SoftwareSerial gprs(2, 3);                  // Rx, Tx: (2, 3) <= Chip azul | (3, 2) <= Chip rojo
#define domainName "dtaamerica.com"
#define domainIP "172.102.246.22"
#define httpServer1 F("AT+HTTPPARA=\"URL\",\"http://")
#define httpServer2 F("/ws/commj_v4.php?id=")
static byte plots = 7;                      // Plots: 3 | 7
// #define telefono fillNumber(config[3], 2) + fillNumber(config[4], 3) + fillNumber(config[5], 3) + fillNumber(config[6], 4)
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/commj_v4.php?id=")
String telefono = "";

// Actuadores y variables
#define testFunc false
#define testComm false
#define responseTime 15
#define strEmpty F("")
#define pinBomba 4
#define pinCommRST 12
#define watchDogPin A5
#define offSet 5
static byte plot = 0;
static unsigned long activeTime[] = {0, 0, 0, 0, 0, 0, 0};
static unsigned long activationTime[] = {0, 0, 0, 0, 0, 0, 0};
static char systemType[] = {'F', 'F', 'F', 'F', 'F', 'F', 'F'};
static bool activationFrecuency[] = {0, 0, 0, 0, 0, 0, 0};
static String statusVar = "OFF";
static char irrigationMode = 'P';
static byte signalVar = 0;                                  // Communications
static byte QoS = 99;
static byte commLoops = 0;
static byte commError = 0;
static bool commRx = true;
static bool systemStart = true;
static bool restartGSM = true;

#pragma endregion Variables
