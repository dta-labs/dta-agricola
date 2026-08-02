/*
 * Nodo sensor LoRa confirmado y de bajo consumo.
 * Hardware asumido: Arduino Pro Mini 3.3 V/8 MHz + SX1276/77/78/79.
 * Bibliotecas:
 *   - RadioLib (https://github.com/jgromes/RadioLib)
 *   - Low-Power de Rocket Scream (solo AVR)
 */
#include <Arduino.h>
#include <RadioLib.h>
#include <LowPower.h>

// Ajustar al cableado real. DIO1 puede ser RADIOLIB_NC.
static const uint8_t PIN_NSS = 10;
static const uint8_t PIN_DIO0 = 2;
static const uint8_t PIN_RST = 9;
static const uint8_t PIN_DIO1 = 3;

static const float FREQUENCY_MHZ = 915.0; // Cambiar según la región.
static const float BANDWIDTH_KHZ = 125.0;
static const uint8_t NODE_ID = 1;         // Único en la red.
static const uint8_t GATEWAY_ID = 0;
static const uint8_t MAX_RETRIES = 4;
static const uint16_t ACK_TIMEOUT_MS = 1800;

enum FrameType : uint8_t { DATA = 1, ACK = 2 };

struct __attribute__((packed)) DataFrame {
  uint8_t version;
  uint8_t type;
  uint8_t source;
  uint8_t destination;
  uint16_t sequence;
  uint8_t ttl;
  uint8_t spreadingFactor;
  int16_t batteryMilliVolts;
  int16_t sensorValue; // Sustituir/expandir para el sensor real.
};

struct __attribute__((packed)) AckFrame {
  uint8_t version;
  uint8_t type;
  uint8_t source;
  uint8_t destination;
  uint16_t sequence;
  uint8_t ttl;
  uint8_t nextSpreadingFactor;
  int8_t nextPowerDbm;
  uint32_t sleepSeconds;
};

SX1276 radio = new Module(PIN_NSS, PIN_DIO0, PIN_RST, PIN_DIO1);

uint16_t sequenceNumber = 0;
uint8_t spreadingFactor = 10;
int8_t transmitPowerDbm = 14;

static void fatalBlink() {
  pinMode(LED_BUILTIN, OUTPUT);
  while (true) {
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    delay(150);
  }
}

static bool configureRadio() {
  int16_t state = radio.setSpreadingFactor(spreadingFactor);
  if (state != RADIOLIB_ERR_NONE) return false;
  state = radio.setOutputPower(transmitPowerDbm);
  return state == RADIOLIB_ERR_NONE;
}

static int16_t readBatteryMilliVolts() {
  // Implementación genérica: conectar batería a A1 mediante divisor resistivo 1:1.
  // Calibrar factor y referencia para el hardware final.
  const uint16_t adc = analogRead(A1);
  return (int16_t)((uint32_t)adc * 6600UL / 1023UL);
}

static int16_t readSensor() {
  // Ejemplo: lectura ADC cruda. Reemplazar por el driver del sensor.
  return (int16_t)analogRead(A0);
}

static bool waitForAck(uint16_t expectedSequence, AckFrame &ack) {
  uint8_t buffer[sizeof(AckFrame)] = {0};
  int16_t state = radio.receive(buffer, sizeof(buffer), ACK_TIMEOUT_MS);
  if (state != RADIOLIB_ERR_NONE) return false;

  memcpy(&ack, buffer, sizeof(ack));
  return ack.version == 1 &&
         ack.type == ACK &&
         ack.destination == NODE_ID &&
         ack.sequence == expectedSequence;
}

static void sleepSeconds(uint32_t seconds) {
  radio.sleep();
#if defined(ARDUINO_ARCH_AVR)
  while (seconds >= 8) {
    LowPower.powerDown(SLEEP_8S, ADC_OFF, BOD_OFF);
    seconds -= 8;
  }
  while (seconds-- > 0) {
    LowPower.powerDown(SLEEP_1S, ADC_OFF, BOD_OFF);
  }
#else
  delay(seconds * 1000UL);
#endif
  radio.standby();
}

void setup() {
  Serial.begin(9600);
  int16_t state = radio.begin(
    FREQUENCY_MHZ, BANDWIDTH_KHZ, spreadingFactor, 7,
    RADIOLIB_SX127X_SYNC_WORD, transmitPowerDbm, 8
  );
  if (state != RADIOLIB_ERR_NONE) fatalBlink();
  radio.setCRC(true);
}

void loop() {
  DataFrame frame = {
    1, DATA, NODE_ID, GATEWAY_ID, ++sequenceNumber, 2,
    spreadingFactor, readBatteryMilliVolts(), readSensor()
  };

  AckFrame ack = {};
  bool confirmed = false;
  for (uint8_t attempt = 0; attempt < MAX_RETRIES && !confirmed; ++attempt) {
    configureRadio();
    int16_t state = radio.transmit((uint8_t *)&frame, sizeof(frame));
    if (state == RADIOLIB_ERR_NONE) {
      confirmed = waitForAck(frame.sequence, ack);
    }
    if (!confirmed) delay(250UL + (uint16_t)random(0, 500));
  }

  uint32_t sleepTime = 60; // Respaldo si no llegó confirmación.
  if (confirmed) {
    spreadingFactor = constrain(ack.nextSpreadingFactor, 7, 12);
    transmitPowerDbm = constrain(ack.nextPowerDbm, 2, 20);
    sleepTime = constrain(ack.sleepSeconds, 1UL, 86400UL);
  } else {
    // Enlace débil: aumenta robustez de forma conservadora antes del próximo ciclo.
    if (spreadingFactor < 12) spreadingFactor++;
    else transmitPowerDbm = (int8_t)min(20, (int)transmitPowerDbm + 2);
  }
  sleepSeconds(sleepTime);
}
