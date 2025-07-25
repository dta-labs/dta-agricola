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
 *     {x, xxxx, xxxx, xxxx, xxxx, xxxx}                                     *
 *      |    |     |     |          └ Sensor 10                             *
 *      |    |     |     └─────────── Sensor 3                              *
 *      |    |     └───────────────── Sensor 2                              *
 *      |    └─────────────────────── Sensor 1                              *
 *      └──────────────────────────── Modo de funcionamiento                *
 *                                                                          *
 ****************************************************************************/


#pragma region Variables

#include <SoftwareSerial.h>

#define strEmpty F("")                        // Variables generales
#define baseAddress F("0x0")
#define startAddress F("0x")
#define commaChar F(",")
#define emptySensor F(",,")
#define watchDogPin A0

const int config[] = {3, 4, 33, 333, 333, 3333};

// #define telefono fillNumber(config[2], 2) + fillNumber(config[3], 3) + fillNumber(config[4], 3) + fillNumber(config[5], 3)
#define telefono "24530080332"
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v6.php?id=")

#define FREQUENCY 915E6                       // 433E6 or 915E6*, the MHz frequency of module

SoftwareSerial gprs(config[0], config[1]);    // Comunicaciones
bool restartGSM = true;
byte signalVar = 0;
byte commError = 0;
bool commRx = true;
#define testComm false
#define responseTime 15
static unsigned long commTimer = 0;

int operationMode = 1;                   // Sensores & Modo de prueba
#define numSensors 10
String dataToSend[numSensors];
String sensorList[numSensors];
#define testData false
bool first = true;

#pragma endregion Variables
