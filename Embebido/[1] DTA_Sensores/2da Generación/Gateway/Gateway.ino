/*
 * Gateway LoRa-a-nube por puerto serie.
 * Emite cada medida como JSON para que un equipo Linux/ESP32 la publique por
 * MQTT/HTTP. Responde ACK y adapta SF/potencia con RSSI y SNR.
 * RadioLib: https://github.com/jgromes/RadioLib
 */
#include <Arduino.h>
#include <RadioLib.h>

static const uint8_t PIN_NSS = 10;
static const uint8_t PIN_DIO0 = 2;
static const uint8_t PIN_RST = 9;
static const uint8_t PIN_DIO1 = 3;
static const float FREQUENCY_MHZ = 915.0;
static const float BANDWIDTH_KHZ = 125.0;
static const uint8_t GATEWAY_ID = 0;
static const uint16_t SCAN_WINDOW_MS = 900;
static const uint32_t DEFAULT_SLEEP_SECONDS = 300;

enum FrameType : uint8_t { DATA = 1, ACK = 2 };
struct __attribute__((packed)) DataFrame {
  uint8_t version, type, source, destination;
  uint16_t sequence;
  uint8_t ttl, spreadingFactor;
  int16_t batteryMilliVolts, sensorValue;
};
struct __attribute__((packed)) AckFrame {
  uint8_t version, type, source, destination;
  uint16_t sequence;
  uint8_t ttl, nextSpreadingFactor;
  int8_t nextPowerDbm;
  uint32_t sleepSeconds;
};

SX1276 radio = new Module(PIN_NSS, PIN_DIO0, PIN_RST, PIN_DIO1);
uint8_t scanSf = 7;

static void fatalBlink() {
  pinMode(LED_BUILTIN, OUTPUT);
  while (true) {
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    delay(150);
  }
}

static uint8_t recommendSf(uint8_t current, float rssi, float snr) {
  // Histéresis sencilla: enlace holgado baja SF; enlace marginal lo aumenta.
  if (snr > 8.0 && rssi > -95.0 && current > 7) return current - 1;
  if ((snr < -7.0 || rssi < -118.0) && current < 12) return current + 1;
  return constrain(current, 7, 12);
}

static int8_t recommendPower(float rssi, float snr) {
  if (rssi > -90.0 && snr > 8.0) return 8;
  if (rssi > -105.0 && snr > 0.0) return 14;
  if (rssi > -115.0) return 17;
  return 20;
}

void setup() {
  Serial.begin(115200);
  int16_t state = radio.begin(
    FREQUENCY_MHZ, BANDWIDTH_KHZ, scanSf, 7,
    RADIOLIB_SX127X_SYNC_WORD, 17, 8
  );
  if (state != RADIOLIB_ERR_NONE) fatalBlink();
  radio.setCRC(true);
}

void loop() {
  radio.setSpreadingFactor(scanSf);
  uint8_t raw[sizeof(DataFrame)] = {0};
  int16_t state = radio.receive(raw, sizeof(raw), SCAN_WINDOW_MS);

  if (state == RADIOLIB_ERR_NONE) {
    DataFrame data = {};
    memcpy(&data, raw, sizeof(data));
    if (data.version == 1 && data.type == DATA &&
        data.destination == GATEWAY_ID) {
      const float rssi = radio.getRSSI();
      const float snr = radio.getSNR();

      // Línea consumible por un servicio MQTT/HTTP en el equipo conectado.
      Serial.print(F("{\"node\":"));
      Serial.print(data.source);
      Serial.print(F(",\"seq\":"));
      Serial.print(data.sequence);
      Serial.print(F(",\"battery_mV\":"));
      Serial.print(data.batteryMilliVolts);
      Serial.print(F(",\"sensor\":"));
      Serial.print(data.sensorValue);
      Serial.print(F(",\"rssi\":"));
      Serial.print(rssi, 1);
      Serial.print(F(",\"snr\":"));
      Serial.print(snr, 1);
      Serial.println(F("}"));

      AckFrame ack = {
        1, ACK, GATEWAY_ID, data.source, data.sequence, 2,
        recommendSf(data.spreadingFactor, rssi, snr),
        recommendPower(rssi, snr),
        DEFAULT_SLEEP_SECONDS
      };
      // El ACK se envía con los parámetros actuales; el cambio aplica al ciclo siguiente.
      radio.setSpreadingFactor(data.spreadingFactor);
      delay(80);
      radio.transmit((uint8_t *)&ack, sizeof(ack));
    }
  }

  scanSf = (scanSf >= 12) ? 7 : scanSf + 1;
}
