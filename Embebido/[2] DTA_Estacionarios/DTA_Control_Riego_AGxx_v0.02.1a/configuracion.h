/****************************************************************************
 *                                                                          * 
 *   Configuración: {GSMr, GSMt, PLT, Pais, Lada, Número(3), Número(4)}     *
 *   - GSM: Rx, Tx (2, 3) <= Chip azul | (3, 2) <= Chip rojo                *
 *   - PLT: 3 | 7 <= Plots                                                  *
 *                                                                          *
 ****************************************************************************/

// Settings
// const int config[] = {2, 3, 7, 11, 111, 111, 1112};         // Rx, Tx, Plots, Pais, Lada, Número
// const int config[] = {2, 3, 7, 52, 614, 366, 4779};         // Rx, Tx, Plots, Pais, Lada, Número -> Nieves 1 - Avena
const int config[] = {2, 3, 7, 52 , 614, 366, 4806};         // Rx, Tx, Plots, Pais, Lada, Número -> Nieves 2 - Cesped

#pragma region Variables

SoftwareSerial gprs(config[0], config[1]);                  // Rx, Tx
static byte plots = config[2];
#define telefono fillNumber(config[3], 2) + fillNumber(config[4], 3) + fillNumber(config[5], 3) + fillNumber(config[6], 4)
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/commj_v4.php?id=")

// Actuadores y variables
#define testFunc false
#define testComm false
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
static String commStr = "";
static byte commLoops = 0;
static byte commError = 0;
static bool commRx = true;
static bool systemStart = true;
static bool restartGSM = true;

#pragma endregion Variables
