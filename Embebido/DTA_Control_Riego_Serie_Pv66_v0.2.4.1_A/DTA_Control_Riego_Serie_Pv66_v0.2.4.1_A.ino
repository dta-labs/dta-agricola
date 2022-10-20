/****************************************************************************
 *                                                                          * 
 *                    Sistemas DTA Serie Pv66 v0.2.4 A                      *
 *                               2022.06.26                                 *
 *                                                                          *
 *   Sensores:                                                              *
 *   - Presión 150psi............. A0                                       *
 *   - Seguridad efecto Hall...... A1                                       *
 *   - Seguridad lectura directa.. D9                                       *
 *   - Comunicación............... D2, D3                      				*
 *   - GPS........................ D11, D12, D13 (Tarjetas amarillas)       *
 *                                                                          *
 *   Configuración: {Gun, GSMr, GSMt, GPSr, GPSt, Seq}                      *
 *   - Gun: 0 <= Relay FL | 1 <= Relay JQC                                  *
 *   - GSM: RX, TX (2, 3) <= Chip azul | (3, 2) <= Chip rojo                *
 *   - GPS: RX, TX (12, 11) <= Tarjeta blanca | (13, 12) Tarjeta amarilla   *
 *   - Seq: 0 <= Lectura directa | 1 <= Efecto Hall                         *
 *                                                                          *
 ****************************************************************************/

#include <SoftwareSerial.h>
#include "analogo.h"
#include <EEPROM.h>
#include <avr/wdt.h>
#include <TinyGPS.h>

#include "config.h"
#include "eeprom.h"
#include "sensores.h"
#include "comunicaciones.h"

void setup() { 
  wdt_disable();
  pinMode (pinIrrigationControl, OUTPUT);
  digitalWrite(pinIrrigationControl, LOW);                          // Control de riego Activado 
  Serial.begin(115200);
  ssGPS.begin(9600);
  pinMode (pinSensorVoltaje, INPUT);
  pinMode (pinSensorSeguridad, INPUT);
  pinMode (pinEngGunControl, OUTPUT);
  pinMode (pinActivationTimer, OUTPUT);
  pinMode (pinMotorRR, OUTPUT);
  pinMode (pinMotorFF, OUTPUT);
  // pinMode(LED, OUTPUT);
  // digitalWrite(pinIrrigationControl, HIGH);                           // Control de riego Desactivado 
  apagar();
  Serial.println();
  Serial.println(F(">>> DTA-Agrícola: Serie Pv66 v0.2.4 A"));
  Serial.print(F("    «"));
  Serial.print(telefono);
  Serial.println(F("»"));
  readEEPROM();
  wdt_enable(WDTO_8S);
}

void loop() {
  commDelay = millis();
  Serial.println();
  Serial.println(F("> New loop"));
  Serial.println();
  setupGSM();
  comunicaciones();
  commDelay = millis() - commDelay;
  Serial.print(F("Communication time: "));
  Serial.println(commDelay);
  acciones();
}

#pragma region Acciones

void acciones() {
  setActivationTimer();
  showVars();
  systemWatchDog();
  
  if (statusVar == "ON") {
    controlAutomatico();
  } else {
    Serial.println(F("  ~ System off! wait 1 min"));
    apagar();
    waitOneMinute();
  }
  systemWatchDog();
}

void setActivationTimer() {
  activationTimer = 600 * velocityVar;      // 60000 * velocityVar / 100;
  int dif = 60000 - activationTimer;
  deactivationTimer = (dif) >= commDelay ? (dif - commDelay) : (dif) > 0 ? 100 : 0;
}

void showVars() {
  Serial.print(F("> Type: "));
  Serial.println(deviceType == "PC" ? "Central Pivot" : deviceType == "PC" ? "Lineal Pivot" : "Other");
  Serial.print(F("> Status: ")); Serial.println(statusVar);
  Serial.print(F("> Direction: ")); Serial.println(directionVar);
  Serial.print(F("> Auto Reverse: ")); Serial.println(autoreverseVar);
  Serial.print(F("> Position: ")); Serial.print((String)positionVar); Serial.println(F("°"));
  Serial.print(F("> End Gun: ")); Serial.println((String)endGunVar);
  Serial.print(F("> Velocity: ")); Serial.print((String)velocityVar); Serial.println(F("%"));
  Serial.print(F("  ~ ON: ")); Serial.print((String)activationTimer); Serial.println(F("ms"));
  Serial.print(F("  ~ OFF: ")); Serial.print((String)deactivationTimer); Serial.println(F("ms"));
}

void controlAutomatico() {
  Serial.println(F("   System auto"));
  Serial.print(F("   ~ Run: ")); 
  Serial.print((String)activationTimer);
  Serial.print(F("ms ("));
  Serial.print((String)velocityVar);
  Serial.println(F("%)"));
  if (run()) {
    Serial.print(F("   ~ Stop: ")); 
    Serial.print((String)deactivationTimer);
    Serial.println(F("ms"));
    stop();
  } else {
    Serial.println(F("   ~ System off! wait 1 min"));
    apagar();
    waitOneMinute();
  }
}

bool run() {
  if (activationTimer > 0) {
    setDirection();
    unsigned long actualTime = millis();
    while ((millis() - actualTime) < activationTimer) {
      bool isVoltage = controlVoltaje();
      bool isPosition = positionControl();
      isSequrity = controlSeguridad();
      if (isVoltage && isSequrity && isPosition) {
        digitalWrite(pinActivationTimer, LOW);
        digitalWrite(pinEngGunControl, (endGunVar == "ON") ? (serie == 0 ? LOW : HIGH) : (serie == 0 ? HIGH : LOW));
      } else {
        Serial.print(F("     "));
        Serial.print((!isVoltage) ? F("Voltage") : (!isSequrity) ? F("Sequrity") : (!isPosition) ? F("Position") : F("Unknow"));
        Serial.println(F(" error!"));
        digitalWrite(pinActivationTimer, HIGH);
        return false;
      }
      delay(500);          
      systemWatchDog();
    }
  }
  return true;
}

void setDirection() {
  if (directionVar == "FF") {                                     // Activavión FF
    digitalWrite(pinMotorRR, HIGH);                               // Apagado
    delay(500);
    digitalWrite(pinMotorFF, LOW);                                // Encendido
  } 
  if (directionVar == "RR") {                                     // Activavión RR
    digitalWrite(pinMotorFF, HIGH);                               // Apagado
    delay(500);
    digitalWrite(pinMotorRR, LOW);                                // Encendido
  }
}

void stop() {
  statusVar = (activationTimer == 0 && autoreverseVar == "OFF") ? "OFF" : statusVar;         // Control de apagado
  if (deactivationTimer > 0) {
    digitalWrite(pinActivationTimer, HIGH);
    for (int i = 0; i < deactivationTimer / 100; i++){
      delay(100);
      systemWatchDog();
    }
  }
}

bool positionControl() {
  // return true; 
  positionVar = getPosition();
  systemWatchDog();
  if (lat_actual == 0.0f && lon_actual == 0.0f) {                     // Control de apagado
    statusVar = "OFF";
    return false;
  }
  return (positionIni <= positionVar && positionVar < positionEnd) ? true : false;
}

void apagar() {
  digitalWrite(pinEngGunControl, serie == 0 ? HIGH : LOW);        // Apagado
  digitalWrite(pinMotorFF, HIGH);                                 // Apagado
  digitalWrite(pinMotorRR, HIGH);                                 // Apagado
  digitalWrite(pinActivationTimer, HIGH);                         // Apagado
}

void waitOneMinute() {
  for (int i = 0; i < 60; i++){
    delay(1000);
    systemWatchDog();
  }
}

#pragma endregion Acciones

/****************************************************************
 *                                                              *
 * Errores HTTP:                                              	*
 *                                                              * 
 * 502	Bad Gateway	The remote server returned an error.        *
 * 600*	Empty access token.                                     *
 *                                                              *
 * 601*	Access token invalid                                    *
 * 602*	Access token expired                                    *
 * 603	Access denied                                           *
 * 604*	Request timed out                                       *
 * 605*	HTTP Method not supported                               *
 * 606	Max rate limit ‘%s’ exceeded with in ‘%s’ secs          *
 * 607	Daily quota reached                                     *
 *                                                              *
 * 608*	API Temporarily Unavailable	                            *
 * 609	Invalid JSON                                            *
 * 610	Requested resource not found                            *
 * 611*	System error	All unhandled exceptions                  *
 * 612	Invalid Content Type                                    *
 * 613	Invalid Multipart Request                               *
 * 614	Invalid Subscription                                    *
 * 615	Concurrent access limit reached                         *
 * 616	Invalid subscription type                               *
 * 701	%s cannot be blank                                      *
 * 702	No data found for given search scenario                 *
 *                                                              *
 * 703	Feature is not enabled for the subscription             *
 * 704	Invalid date format                                     *
 * 709	Business Rule Violation                                 *
 * 710	Parent Folder Not Found                                 *
 * 711	Incompatible Folder Type                                *
 * 712	Merge to person Account operation is invalid            *
 * 713	A system resource was temporarily unavailable           *
 * 714	Unable to find default record type                      *
 * 718	ExternalSalesPersonID not found                         *
 *                                                              *
 ****************************************************************/

/****************************************************************
  *                                                              *
  * Valor  dB   Condición                                        *
  * ===== ====  =========                                        *
  *  2	  -109	Marginal                                          *
  *  3	  -107	Marginal                                          *
  *  4	  -105	Marginal                                          *
  *  5	  -103	Marginal                                          *
  *  6	  -101	Marginal                                          *
  *  7	   -99	Marginal                                          *
  *  8	   -97	Marginal                                          *
  *  9	   -95	Marginal                                          *
  * 10	   -93	OK                                                *
  * 11	   -91	OK                                                *
  * 12	   -89	OK                                                *
  * 13	   -87	OK                                                *
  * 14	   -85	OK                                                *
  * 15	   -83	Good                                              *
  * 16	   -81	Good                                              *
  * 17	   -79	Good                                              *
  * 18	   -77	Good                                              *
  * 19	   -75	Good                                              *
  * 20	   -73	Excellent                                         *
  * 21	   -71	Excellent                                         *
  * 22	   -69	Excellent                                         *
  * 23	   -67	Excellent                                         *
  * 24	   -65	Excellent                                         *
  * 25	   -63	Excellent                                         *
  * 26	   -61	Excellent                                         *
  * 27	   -59	Excellent                                         *
  * 28	   -57	Excellent                                         *
  * 29	   -55	Excellent                                         *
  * 30	   -53	Excellent                                         *
  *                                                              *
  ****************************************************************/
