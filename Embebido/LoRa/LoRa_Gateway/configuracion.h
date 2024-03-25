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
const int config[] = {3, 2, 1, 33, 333, 333, 3333};

#pragma region Variables

SoftwareSerial gprs(config[0], config[1]);
#define telefono fillNumber(config[3], 2) + fillNumber(config[4], 3) + fillNumber(config[5], 3) + fillNumber(config[6], 4)
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v1.php?id=")

#define gatewayAddress "DTA_192.168.1.0"
String nodeAddress = "DTA_192.168.1.";

const int numSensors = 5;
static String PHASE = "Unknow";
static int SLEEP = config[2];
static String IRRIGATION = "OFF";

float measurement[numSensors];

#define testComm false
static byte signalVar = 0;
static byte commError = 0; 
static bool commRx = true;
static bool restartGSM = true;

#pragma endregion Variables
