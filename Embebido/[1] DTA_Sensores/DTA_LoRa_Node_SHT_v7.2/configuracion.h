#pragma region Variables

String NODE_ID = "DTA-SHT4-0x";         // Identificador del nodo DTA-SHT-0x0001
#define comma F(",")

#define sensorType "SHT"                 // Tipo de sensor SHT | DS
#define sensorPin A0                    // Pin del sensor de humedad
#define VCC A1                          // Pin de alimentación del sensor de humedad
#define valAire 2769
#define valAgua 1071
#define activeHeater false
float t_actual;
float h_actual;
byte moisture;

#pragma endregion Variables

