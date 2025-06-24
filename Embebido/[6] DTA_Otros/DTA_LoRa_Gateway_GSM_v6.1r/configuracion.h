#pragma region Variables

#define strEmpty F("")                        // Variables generales
#define baseAddress F("0x0")
#define startAddress F("0x")
#define commaChar F(",")
#define emptySensor F(",,")
#define watchDogPin A0
#define gprsResetPin A1

#define FREQUENCY 915E6                       // 433E6 or 915E6*, the MHz frequency of module

#ifndef SoftwareSerial_h                      // Comunicaciones (D3: Rx, D4: Tx)
  #include <SoftwareSerial.h>
#endif

SoftwareSerial gprs(4, 3); 
#define httpServer F("AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v6.php?id=")
#define testComm false
#define responseTime 15
String telefono = "";
bool restartGSM = true;
byte signalVar = 0;
byte QoS = 99;
byte commError = 0;
bool commRx = true;
unsigned long commTimer = 0;

int operationMode = 1;                        // Sensores & Modo de prueba
#define numSensors 10
String dataToSend[numSensors];
String sensorList;
bool first = true;

#pragma endregion Variables
