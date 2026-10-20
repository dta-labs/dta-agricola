#pragma region Variables

String NODE_ID_BASE = "DTA-SCT-0x"; // Identificador del nodo DTA-0x
String NODE_ID = NODE_ID_BASE;
#define TTL 5
#define DATA_TYPE F("d")
#define comma F(",")
#define noSensor F("0")
#define activeHeater false
#define TEST false
#define HEARTBEAT 3                             // Tiempo en horas para indicar que sigue operativo
int TIMER = 5;                                  // Tiempo de espera en minutos
String sensorType;                              // Tipo de sensor SHT | DS
bool calentado = false;
float i_actual[0];

#define Tmin 0.0                                // Umbral inferior (ejemplo)
#define Tmax 3.0                                // Umbral superior (ejemplo)
unsigned long nextWake = 0;
unsigned long interval = 30UL * 60UL * 1000UL;  // 30 min en ms
const unsigned long jitter = 30UL * 1000UL;     // ±30 s en ms
#pragma endregion Variables

