#pragma region Variables

#define FW_VERSION "v1.261118001"               // v1.aammdd + consecutivo del día; cambiar en cada modificación

#define TEST false                              // true: Id y lecturas simuladas (solo para banco de pruebas)
#define NODE_PREFIX "DTA-SHT-0x"                // Identificador del nodo: DTA-SHT-0x<serie del SHT4x>
#define TEST_SERIAL 0xF46A000UL
#define TTL 5

// ---------- Tiempos ----------
#define DEFAULT_TIMER 5                         // Minutos entre lecturas si no hay otro valor guardado
#define MIN_TIMER 1
#define MAX_TIMER 60
#define USE_GATEWAY_TIMER true                  // Aplicar la frecuencia que envía el gateway en la confirmación
#define HEARTBEAT 1                             // Horas máximas sin transmitir (señal de vida)
#define HEARTBEAT_CYCLES (HEARTBEAT * 3600UL / 8)   // En ciclos de sueño de 8 s

// ---------- Criterios de transmisión ----------
// Se compara contra el último dato confirmado por el gateway: los cambios graduales se acumulan
#define DELTA_T 0.5                             // Cambio de temperatura que se transmite (°C)
#define DELTA_HR 0.5                            // Cambio de humedad que se transmite (%)

// ---------- Confirmación ----------
#define MAX_TX_ATTEMPTS 4                       // Intentos por transmisión
#define ACK_TIMEOUT 8000UL                      // Espera de la confirmación por intento (ms)

// ---------- Falla del sensor ----------
#define ERROR_HR "-1"                           // Hr = -1 indica sensor en falla (T se envía en 0.0)
#define ERROR_T "0.0"

#define PKT_LEN 64

char NODE_ID[24] = "";
uint8_t TIMER = DEFAULT_TIMER;                  // Minutos entre lecturas
float t_actual = 0;
float h_actual = 0;
bool sensorOk = false;
bool loraOk = false;

// Último dato confirmado por el gateway
bool hasSent = false;
float t_sent = 0;
float h_sent = 0;
bool errorSent = false;
uint16_t cyclesSinceTx = 0;                     // Ciclos de 8 s desde la última transmisión confirmada
bool lastTxFailed = false;

#pragma endregion Variables
