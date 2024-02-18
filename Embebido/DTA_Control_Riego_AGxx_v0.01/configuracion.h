/****************************************************************************
 *                                                                          * 
 *   Configuración: {GSMr, GSMt, PLT, Pais, Lada, Número(3), Número(4)}     *
 *   - GSM: Rx, Tx (2, 3) <= Chip azul | (3, 2) <= Chip rojo                *
 *   - PLT: 3 | 7 <= Plots                                                  *
 *                                                                          *
 ****************************************************************************/

// Settings
// const int config[] = {2, 3, 7, 11, 111, 111, 1111};          // Rx, Tx, Plots, Pais, Lada, Número
const int config[] = {2, 3, 7, 52, 625, 102, 596};          // Rx, Tx, Plots, Pais, Lada, Número

#pragma region Variables

SoftwareSerial gprs(config[0], config[1]);                  // Rx, Tx
static byte plots = config[2];
#define telefono fillNumber(config[3], 2) + fillNumber(config[4], 3) + fillNumber(config[5], 3) + fillNumber(config[6], 4)
// #define httpServer F("AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/commj_v2.php?id=")
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/commj_v2.php?id=")

// Actuadores y variables
#define testFunc false
#define testComm false
#define pinBomba 4
#define watchDogPin A5
#define offSet 5
#define ON F("ON")
#define OFF F("OFF")
#define OK F("OK")
static byte plot = 0;
static unsigned long activeTime = 0;
static unsigned long activationTime = 0;
static char systemType = 'F';
static String statusVar = "OFF";
static byte signalVar = 0;
static String commStr = "";
static byte commLoops = 0;
static byte commError = 0;                                  // Communications
static bool commRx = true;
static bool restartGSM = true;
static bool firstSettings = true;
static bool cyclic = false;

struct eeObject {
  char status[3];
  byte plot = 0;
  unsigned long enlapsedTime;
} eeVar;

#pragma endregion Variables
