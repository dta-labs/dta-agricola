/****************************************************************************
 *                                                                          * 
 *   Configuración: {GSMr, GSMt, PLT, Pais, Lada, Número(3), Número(4)}     *
 *   - GSM: Rx, Tx (D3, D2) <= Chip azul | (D2, D3) <= Chip rojo            *
 *   - A0: Entrada analógica                                                *
 *   - Comunicación LoRA                                                    *
 *     . D9 : RST                                                           *
 *     . D10: SS                                                            *
 *     . D11: MOSI                                                          *
 *     . D12: MISO                                                          *
 *     . D13: SCK                                                           *
 *   - Vector de configuración config[]                                     *
 *     {x, x, xx, xxx, xxx, xxxx}                                           *
 *      |  |  |   |    |     └ Número parte 2                               *
 *      |  |  |   |    └────── Número parte 1                               *
 *      |  |  |   └─────────── Lada                                         *
 *      |  |  └─────────────── País                                         *
 *      |  └────────────────── Tx                                           *
 *      └───────────────────── Rx                                           *
 *   - Vector de entrada                                                    *
 *     {xxx, xxx, xxxx, xxxx, ..., xxxx}                                    *
 *       |    |     |     |          └ Sensor N                             *
 *       |    |     |     └─────────── Sensor 2                             *
 *       |    |     └───────────────── Sensor 1 (conectado al Gateway)      *
 *       |    └─────────────────────── Candidad de sensores                 *
 *       └──────────────────────────── Tiempo de dormancia                  *
 *                                                                          *
 ****************************************************************************/


#pragma region Variables

#include <SoftwareSerial.h>

const int config[] = {2, 3, 33, 333, 333, 3333};
// const int config[] = {2, 3, 52, 625, 125, 9145};

#define telefono fillNumber(config[2], 2) + fillNumber(config[3], 3) + fillNumber(config[4], 3) + fillNumber(config[5], 4)
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v1.php?id=")

#define FREQUENCY 915E6                       // 433E6 or 915E6*, the MHz frequency of module
#define TIMER 2                               // Tiempo de espera en minutos
#define sensor A0

SoftwareSerial gprs(config[0], config[1]);    // Comunicaciones
bool restartGSM = true;
byte signalVar = 0;
byte commError = 0;
bool commRx = true;
bool testComm = true;
const int eeAddress = 0;
static unsigned long commTimer = 0;

static String sensorsID = "";                 // Sensores
String dataToSend[10];
String sensorList[10];

#pragma endregion Variables
