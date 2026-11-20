#pragma region Configuracion

#define FW_VERSION "v1.261119002"             // v1.aammdd + consecutivo del día; cambiar en cada modificación

#include <SoftwareSerial.h>

// ---------- Pines ----------
// A0/A1: módulo WiFi ESP8266 (D-036). Ya no hay LED de estado ni watchdog externo.
SoftwareSerial gprs(4, 3);                    // Módem GSM (Rx: D4, Tx: D3)
SoftwareSerial espSerial(A0, A1);             // ESP8266 (Rx: A0 ← Tx del ESP · Tx: A1 → divisor 1k/2k → Rx del ESP)

// ---------- LoRa ----------
#define FREQUENCY         915E6               // 433E6 o 915E6, frecuencia del módulo
#define TTL               5
#define LORA_INIT_RETRIES 5                   // Intentos para inicializar el radio LoRa

// ---------- Servidor ----------
#define DOMAIN_NAME "dtaamerica.com"
#define DOMAIN_IP   "172.102.246.22"
#define SERVER_PATH "/ws/sensor_v6.php?id="
#define TEST_SYSTEM false                     // true: lista de sensores fija y sin GSM
#define TEST_COMM   false                     // true: imprime todas las respuestas AT

// ---------- Tamaños (memoria estática, sin String) ----------
// Ajustados al máximo real (D-025)
#define MAX_SENSORS  10                       // Sensores por gateway
#define ID_LEN       19                       // Id como texto: "0x" + 16 dígitos hex + '\0' (solo buffers locales)
#define DATA_LEN     16                       // "100.0,100.0,6.0" (SCT) + '\0'
#define PKT_LEN      56                       // Trama más larga: SCT con Id de 16 dígitos = 51 + '\0'
#define RXQ_SIZE     2                        // Paquetes LoRa en espera (solo fuera de la sesión GSM)
// Respuesta del servidor más larga: modo de 3 dígitos + 10 Ids de 16 dígitos = 195 B.
// Se reservan 300 B: eco (20) + encabezado +HTTPREAD (18) + lectura (250) + OK (6) + fin de texto.
#define RESP_SIZE    300                      // Respuesta del módem (buffer local de comunicaciones(), no global)
#define HTTPREAD_CMD "AT+HTTPREAD=0,250"
#define RAM_WARNING  150                      // Aviso si la memoria mínima libre baja de este valor
#define RETRY_AFTER_FAIL 60000UL               // Reintento 1 min después de un envío fallido (D-034)
#define GSM_FULL_SETUP_AFTER 2                // Fallas seguidas antes de reconfigurar el GSM completo
#define DEFAULT_MODE 5                        // Minutos entre envíos si no hay configuración guardada

// ---------- WiFi: ESP8266 con firmware DTA_Gateway_WiFi_ESP8266 (D-037) ----------
#define ESP_BAUD        9600
#define ESP_STATUS_MS   1000UL                // Tiempo límite de #ST
#define ESP_HTTP_MS     15000UL               // Tiempo límite de #GET (el ESP corta a los 10 s)
#define ESP_CONN_FAILED -1                    // #R,-1: falla de conexión o DNS → se repite con la IP
#define ESP_NO_RESULT   -30                   // No llegó #R en el tiempo límite

// ---------- Configuración persistente (EEPROM) ----------
struct Config {
  int16_t mode;                               // 0: descubrimiento, >0: minutos entre envíos
  uint8_t count;                              // Número de sensores registrados
  uint64_t ids[MAX_SENSORS];                  // Ids de los sensores como número (0x1A2B -> 0x1A2B)
};
Config cfg;

// ---------- Estado ----------
char dataToSend[MAX_SENSORS][DATA_LEN];       // Última lectura conocida de cada sensor (se conserva como histórico)
// Transmisiones confirmadas desde el último dato nuevo de cada posición (0 = dato nuevo).
// Se informa como &lo=[1 - edad]: 1 nuevo, 0 mismo dato que la vez anterior, -1, -2... ciclos sin datos.
#define MAX_DATA_AGE 100                      // Límite: lo = -99
uint8_t dataAge[MAX_SENSORS];
char gatewayId[16] = "";                      // IMEI del módem (15 dígitos)
char* resp = NULL;                            // Apunta al buffer local de comunicaciones()
uint16_t respLen = 0;

bool loraOk = false;                          // Radio LoRa inicializado (se informa al servidor en &lr=)
bool netRegistered = false;                   // Registrado en la red celular
bool serverOk = false;                        // Último envío al servidor exitoso
bool restartGSM = true;                       // Configuración completa del GSM (al arrancar o tras fallas seguidas)
bool gsmSession = false;                      // Durante la sesión GSM el radio LoRa duerme
bool systemStart = true;
uint8_t signalVar = 0;
uint8_t QoS = 99;
uint8_t commError = 0;
unsigned long commTimer = 0;

// Estado de la WiFi según el ESP8266 (#ST)
enum WifiState : int8_t { ESP_NO_REPLY = -1, WIFI_NOT_SET = 0, WIFI_DISCONNECTED = 1, WIFI_CONNECTED = 2 };
int8_t wifiState = ESP_NO_REPLY;
int8_t wifiRssi = 0;                          // dBm
char lastChannel = '-';                       // Canal del último envío: 'w' WiFi, 'g' GSM

void loraPoll();                              // Definida en loraComm.h
bool wifiRequest();                           // Definida en wifi.h

#pragma endregion Configuracion
