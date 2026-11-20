#include <LowPower.h>                                     // Usa el watchdog solo para despertar (sin reinicio)

#include "configuracion.h"
#include "miscelaneas.h"
#include "memoria.h"
#include "sensorSHT4.h"
#include "lora.h"

#pragma region Programa Principal

void setupSensors() {
  sensorOk = setupSHT();
  uint32_t serial = 0;
  if (TEST) {
    serial = TEST_SERIAL;
  } else {
    if (sensorOk) serial = sht4.readSerial();
    if (serial != 0 && serial != nodeCfg.serial) {     // Guardar el Id para conservarlo si el sensor falla
      nodeCfg.serial = serial;
      saveNodeConfig();
    }
    serial = nodeCfg.serial;
  }
  if (serial != 0) snprintf_P(NODE_ID, sizeof(NODE_ID), PSTR(NODE_PREFIX "%lX"), (unsigned long) serial);
  Serial.print(F("  - Sensor SHT4: ")); Serial.println(sensorOk ? F("Ok") : F("Error"));
  Serial.print(F("  - Id: ")); Serial.println(NODE_ID[0] ? NODE_ID : "desconocido");
  randomSeed(serial ^ analogRead(A0) ^ micros());      // Secuencia aleatoria distinta en cada nodo
}

void readSensor() {
  if (TEST) {
    t_actual = 0.3;
    h_actual = 30;
    sensorOk = true;
    return;
  }
  if (!sensorOk) sensorOk = setupSHT();                // Reintentar si el sensor falló
  if (sensorOk) sensorOk = readSHT(t_actual, h_actual);
}

// Compara contra el último dato confirmado, no contra la lectura anterior: un cambio gradual
// se acumula hasta llegar al umbral
bool shouldTransmit() {
  if (!hasSent) return true;                           // Primera transmisión
  if (cyclesSinceTx >= HEARTBEAT_CYCLES) return true;  // Señal de vida
  if (!sensorOk != errorSent) return true;             // El sensor falló o se recuperó
  if (!sensorOk) return false;
  if (fabs(t_actual - t_sent) >= DELTA_T) return true;
  if (fabs(h_actual - h_sent) >= DELTA_HR) return true;
  return false;
}

void markSent() {
  hasSent = true;
  t_sent = t_actual;
  h_sent = h_actual;
  errorSent = !sensorOk;
  cyclesSinceTx = 0;
}

// DTA-SHT-0xId,d,TTL,Hr,T,Vcc,CS
void createDataStr(char* buf, uint8_t size) {
  char h[8], t[8], v[8];
  if (sensorOk) {
    dtostrf(h_actual, 1, 0, h);
    dtostrf(t_actual, 1, 1, t);
  } else {
    strcpy_P(h, PSTR(ERROR_HR));
    strcpy_P(t, PSTR(ERROR_T));
  }
  dtostrf(TEST ? 4.2 : getVcc(), 1, 1, v);                // Vcc con 1 decimal (lo exige updateNeveraDB.php)
  int n = snprintf_P(buf, size, PSTR("%s,d,%d,%s,%s,%s,"), NODE_ID, TTL, h, t, v);
  snprintf_P(buf + n, size - n, PSTR("%d"), calculateSum(buf, n));
}

// Duerme el MCU con la radio apagada (millis() no avanza en powerDown)
void sleepSeconds(uint8_t seconds) {
  LoRa.sleep();
  for (uint8_t i = 0; i < seconds; i++) LowPower.powerDown(SLEEP_1S, ADC_OFF, BOD_OFF);
}

bool transmit() {
  char dataStr[PKT_LEN];
  createDataStr(dataStr, sizeof(dataStr));
  uint8_t attempts = lastTxFailed ? 1 : MAX_TX_ATTEMPTS;   // Si el gateway no respondió antes, un solo intento
  for (uint8_t i = 1; i <= attempts; i++) {
    txData(dataStr);
    if (receivedConfirmation(ACK_TIMEOUT)) return true;
    if (i < attempts) sleepSeconds(random(1, 4) * i);     // Espera aleatoria y creciente
  }
  return false;
}

void lowPower() {
  Serial.flush();                                         // Espera a que se envíe todo
  if (loraOk) LoRa.sleep();
  int base = TIMER * 60 / 8;                              // Ciclos de 8 s
  int jitter = base / 5;                                  // ±20 % para evitar colisiones
  int cycles = base + random(-jitter, jitter + 1);
  if (cycles < 1) cycles = 1;
  for (int i = 0; i < cycles; i++) LowPower.powerDown(SLEEP_8S, ADC_OFF, BOD_OFF);
  cyclesSinceTx = (cyclesSinceTx + cycles > 60000U) ? 60000U : cyclesSinceTx + cycles;
}

void setup() {
  Serial.begin(250000);
  while (!Serial) delay(10);                              // Arduino Zero, Leonardo, etc.
  Serial.print(F("\n\nSensor de Temperatura y Hr \n[")); Serial.print(F(FW_VERSION)); Serial.println(F("]"));
  Serial.println(F("~ Humedad y temperatura ambiente"));
  Serial.println(F("  - Protocolo: DTA-SHT-0xId,dataType,TTL,Hr,T,Vcc,CS"));
  loadNodeConfig();
  TIMER = constrain(nodeCfg.timer, MIN_TIMER, MAX_TIMER);
  setupSensors();
  loraOk = initLoRa();
  Serial.println();
}

void loop() {
  readSensor();
  if (!loraOk) loraOk = initLoRa();                       // Reintentar si el radio falló
  if (loraOk && NODE_ID[0] && shouldTransmit()) {
    bool ok = transmit();
    if (ok) markSent();
    lastTxFailed = !ok;
  } else {
    Serial.print('.');
  }
  lowPower();
}

#pragma endregion Programa Principal
