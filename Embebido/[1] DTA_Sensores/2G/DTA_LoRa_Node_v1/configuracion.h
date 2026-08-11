#pragma region Variables

String NODE_ID_BASE = "DTA-WM1-0x";     // Identificador del nodo DTA-0x
String NODE_ID = NODE_ID_BASE;
#define TTL 5
#define DATA_TYPE F("d")
#define comma F(",")
#define noSensor F("0")
#define SHT F("SHT")
#define DS F("DS")
#define sensorPin A0                    // Pin del sensor de humedad
#define activeHeater false
#define NUM_MUESTRAS 20
int TIMER = 5;                          // Tiempo de espera en minutos
String sensorType;                      // Tipo de sensor SHT | DS
bool calentado = false;
float t_actual = -999;
float h_actual = -1;
float moisture;

#pragma endregion Variables

