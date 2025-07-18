#pragma region Variables

String NODE_ID = "DTA-SHT4-0x";         // Identificador del nodo DTA-SHT-0x0001
#define comma F(",")

#define sensorType "DS"                 // Tipo de sensor SHT | DS
#define sensorPin A0                    // Pin del sensor de humedad
#define VCC A1                          // Pin de alimentación del sensor de humedad
#define valAire 2820
#define valAgua 1120
float t_actual;
float h_actual;

#pragma endregion Variables

