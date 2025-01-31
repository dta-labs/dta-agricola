/****************************************************************************
 *                                                                          * 
 *   Configuración: {GSMr, GSMt, Pais(2), Lada(2), Número(3), Número(4)}    *
 *   - GSM: Rx, Tx (D3, D4)                                                 *
 *   - Vector de configuración config[]                                     *
 *     {x, x, xx, xxx, xxx, xxxx}                                           *
 *      |  |  |   |    |     └ Número parte 2                               *
 *      |  |  |   |    └────── Número parte 1                               *
 *      |  |  |   └─────────── Lada                                         *
 *      |  |  └─────────────── País                                         *
 *      |  └────────────────── Tx                                           *
 *      └───────────────────── Rx                                           *
 *   - Vector de entrada                                                    *
 *     {x, xxxx, xxxx, xxxx, ..., xxxx}                                     *
 *      |    |     |     |          └ Sensor 10                             *
 *      |    |     |     └─────────── Sensor 3                              *
 *      |    |     └───────────────── Sensor 2                              *
 *      |    └─────────────────────── Sensor 1                              *
 *      └──────────────────────────── Modo de funcionamiento                *
 *                                                                          *
 ****************************************************************************/


#pragma region Variables

#include <SoftwareSerial.h>

const int config[] = {3, 4, 33, 333, 333, 3333};
// const int config[] = {3, 4, 52, 625, 125, 9145};

#define telefono fillNumber(config[2], 2) + fillNumber(config[3], 3) + fillNumber(config[4], 3) + fillNumber(config[5], 4)
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v6.php?id=")

#define FREQUENCY 915E6                       // 433E6 or 915E6*, the MHz frequency of module
#define TIMER 2                               // Tiempo de espera en minutos
#define sensor A0

SoftwareSerial gprs(config[0], config[1]);    // Comunicaciones
bool restartGSM = true;
byte signalVar = 0;
byte commError = 0;
bool commRx = true;
bool testComm = false;
const int eeAddress = 0;
static unsigned long commTimer = 0;

String operationMode = "N";                   // Sensores
String dataToSend[10];
String sensorList[10];
bool testData = true;

#pragma endregion Variables
