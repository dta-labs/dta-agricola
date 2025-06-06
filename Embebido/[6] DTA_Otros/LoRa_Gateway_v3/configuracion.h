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
 *     {x, x, xxx, xx, xxx, xxx, xxxx}                                      *
 *      |  |   |   |   |    |     └ Número parte 2                          *
 *      |  |   |   |   |    └────── Número parte 1                          *
 *      |  |   |   |   └─────────── Lada                                    *
 *      |  |   |   └─────────────── País                                    *
 *      |  |   └─────────────────── Cantidad de sensores (1 ~ 254)          *
 *      |  └─────────────────────── Tx                                      *
 *      └────────────────────────── Rx                                      *
 *                                                                          *
 ****************************************************************************/

// Settings
const int config[] = {2, 3, 1, 52, 625, 125, 9145};

#pragma region Variables

#define telefono fillNumber(config[3], 2) + fillNumber(config[4], 3) + fillNumber(config[5], 3) + fillNumber(config[6], 4)
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v1.php?id=")

#define gatewayAddress "DTA_FF"
// #define baseNodeAddress "DTA_00"
// String nodeAddress = String(baseNodeAddress);

#define sensor A0
int numSensors = 1;
float measurements[20];
float voltages[20];
String sensorsID = "";
static int sleepingTime = config[2];
static int idx = 0;

SoftwareSerial gprs(config[0], config[1]);     // Comunicaciones
bool restartGSM = true;
byte signalVar = 0;
byte commError = 0;
bool commRx = true;
bool testComm = false;

#pragma endregion Variables
