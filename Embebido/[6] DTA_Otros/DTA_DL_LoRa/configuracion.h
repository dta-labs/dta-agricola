#ifndef SoftwareSerial_h 
#include <SoftwareSerial.h> 
#endif

#pragma region Variables

String NODE_ID = "DTA-SCP-0x4454412D001"; // Identificador del nodo DTA-SHT-00x0001

#define hallSensorPin A0                  // Caudalimétro Hall (pulsos)
volatile int hallSensorCounter = 0;

#define I2C_ADDR 0x27                     // LCD
LiquidCrystal_I2C lcd(I2C_ADDR, 16, 2);

#define FREQUENCY 915E6                   // 433E6 or 915E6*, the MHz frequency of module
#define TIMER 30                          // Tiempo de espera en minutos
#define LINK A1                           // Pin de enlace A1
#define COMM_FREC 30000                   // 1 Minuto

#define ANALOG_PORT A1                    // Entrada analógica
#define SENSOR_RANGE 16                   // Rango del sensor

#pragma endregion Variables
