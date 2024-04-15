/****************************************************************************
 *                                                                          * 
 *   Configuración: {GSMr, GSMt, PLT, Pais, Lada, Número(3), Número(4)}     *
 *   - GSM: Rx, Tx (D2, D3) <= Chip azul | (D3, D2) <= Chip rojo            *
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

// Settings
const int config[] = {2, 3, 33, 333, 333, 3333};

#pragma region Variables

#define telefono fillNumber(config[2], 2) + fillNumber(config[3], 3) + fillNumber(config[4], 3) + fillNumber(config[5], 4)
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v1.php?id=")

#define gatewayAddress "DTA_FF"
#define nodeAddress "DTA_00"
#define sensor A0

const long frequency = 433E6; // 433E6 or 915E6, the MHz speed of module

static String sensorsID = "";
// String nodes[50];
float measurements[50];
float voltages[50];
String nodes[] = {"DTA_00","DTA_01","DTA_02","DTA_03","DTA_04"};
byte idx = 0;
byte numSensors = 5;
byte repeat = 0;
int sleepingTime = 0;

SoftwareSerial gprs(config[0], config[1]);     // Comunicaciones
bool restartGSM = true;
byte signalVar = 0;
byte commError = 0;
bool commRx = true;
bool testComm = false;
const int eeAddress = 0;

#pragma endregion Variables
