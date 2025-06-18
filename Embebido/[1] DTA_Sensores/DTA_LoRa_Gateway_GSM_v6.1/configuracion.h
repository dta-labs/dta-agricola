/****************************************************************************
 *                                                                          * 
 *   Configuración:                                                         *
 *   - GSM: Rx, Tx (D3, D4)                                                 *
 *   - Vector de entrada                                                    *
 *     {x, xxxx, xxxx, xxxx, xxxx, xxxx}                                    *
 *      |    |     |     |          └ Sensor 10                             *
 *      |    |     |     └─────────── Sensor 3                              *
 *      |    |     └───────────────── Sensor 2                              *
 *      |    └─────────────────────── Sensor 1                              *
 *      └──────────────────────────── Modo de funcionamiento                *
 *                                                                          *
 ****************************************************************************/


#pragma region Variables

#include <SoftwareSerial.h>

#define strEmpty F("")                        // Variables generales
#define baseAddress F("0x0")
#define startAddress F("0x")
#define commaChar F(",")
#define emptySensor F(",,")
#define watchDogPin A0

#define FREQUENCY 915E6                       // 433E6 or 915E6*, the MHz frequency of module

SoftwareSerial gprs(4, 3);                    // Comunicaciones (D3: Rx, D4: Tx) 
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v6.php?id=")
String telefono = "";
bool restartGSM = true;
byte signalVar = 0;
byte QoS = 99;
#define testComm false
#define responseTime 15
byte commError = 0;
bool commRx = true;
unsigned long commTimer = 0;

int operationMode = 1;                        // Sensores & Modo de prueba
#define testData false
#define numSensors 5
String dataToSend[numSensors];
String sensorList[numSensors];
bool first = true;

#pragma endregion Variables
