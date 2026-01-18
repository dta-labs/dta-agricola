#pragma region Variables

String NODE_ID = "DTA-SHT4-0x";         // Identificador del nodo DTA-SHT-0x0001
#define comma F(",")

#define sensorType "DS"                 // Tipo de sensor SHT | DS
#define sensorPin A0                    // Pin del sensor de humedad
#define VCC A1                          // Pin de alimentación del sensor de humedad
#define activeHeater false
float t_actual;
float h_actual;
byte moisture;

struct Perfil {
  float vSeco;  // voltaje en suelo seco 
  float vCC;    // voltaje en capacidad de campo 
  float vSat;   // voltaje en saturación 
  int   pSeco;  // % en seco (ej. 25–30) 
  int   pCC;    // % en CC (ej. 35–40) 
  int   pSat;   // % en saturación (ej. 55–60)
};

Perfil arenoso = {2.95, 1.25, 0.70, 28, 35, 55};
Perfil franco = {2.85, 1.15, 0.65, 30, 40, 58};
Perfil arcilloso = {2.75, 1.05, 0.60, 32, 42, 60};
Perfil suelo = { 2.82, 1.60, 1.07, 0, 40, 60 };

Perfil mezcla(Perfil A, Perfil B, Perfil C, float wA, float wB) {
  float wC = 1 - (wA + wB);
  Perfil m;
  m.vSeco = wA * A.vSeco + wB * B.vSeco + wC * C.vSeco;
  m.vCC   = wA * A.vCC   + wB * B.vCC   + wC * C.vCC;
  m.vSat  = wA * A.vSat  + wB * B.vSat  + wC * C.vSat;
  m.pSeco = (int)(wA * A.pSeco + wB * B.pSeco + wC * C.pSeco);
  m.pCC   = (int)(wA * A.pCC   + wB * B.pCC   + wC * C.pCC);
  m.pSat  = (int)(wA * A.pSat  + wB * B.pSat  + wC * C.pSat);
  return m;
};

#pragma endregion Variables

