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

// Settings
const int config[] = {2, 3, 33, 333, 333, 3335};

#pragma region Variables

#define telefono fillNumber(config[2], 2) + fillNumber(config[3], 3) + fillNumber(config[4], 3) + fillNumber(config[5], 4)
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v1.php?id=")

#define I2C_ADDR 0x27                           // Sensores
byte numSensors = 3;
static int data = 0;

LiquidCrystal_I2C lcd(I2C_ADDR, 16, 2);         // LCD

#define pinCommReset 4                          // Comunicaciones
SoftwareSerial gprs(config[0], config[1]);
bool restartGSM = true;
byte signalVar = 0;
byte commError = 0;
bool commRx = true;
bool testComm = false;
const int eeAddress = 0;

#pragma endregion Variables
