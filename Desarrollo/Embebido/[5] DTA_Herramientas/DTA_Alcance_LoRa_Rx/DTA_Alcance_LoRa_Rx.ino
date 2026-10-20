#include <LoRa.h>
#include "LowPower.h"

#define FREQUENCY 915E6           // 433E6 or 915E6*, the MHz frequency of module
#define BUZZER 4
#define ACTION 3 
#define medirFrequence 15000
bool medir = false;
unsigned long medirTimer = 0;

#pragma region Programa Principal

void setup() {
  pinMode(BUZZER, OUTPUT);
  pinMode(ACTION, INPUT_PULLUP);
  Serial.begin(19200);
  while (!Serial) delay(10);                  // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nMedidor de alcance LoRa"));
  Serial.println(F("Módulo Receptor v0.1.20250227"));
  initLoRa();
  medirTimer = millis();
}

void loop() {
  Serial.print(".");
  if (digitalRead(ACTION) == LOW) {
    medir = !medir;
    if (medir) 
      beeps(2, 100);
    else
      beeps(1, 200);
  }
  // medir = readButton() ? !medir : medir;
  if (medir) {
    if (millis() - medirTimer < medirFrequence) {
      Serial.println("Buscando señal...");
      rxData();
      medirTimer = millis();
    } else {
      medir = !medir;
    }
  }
  delay(500);
}

#pragma endregion Programa Principal

#pragma region LoRa

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                    // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);         // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);            // Factor de propagación de 12
  LoRa.setCodingRate4(5);                 // Tasa de codificación 4/5
  LoRa.idle();
  Serial.println(F("LoRa inicializado correctamente..."));
}

void rxData() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = F("");
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (data.indexOf(F("DTA-LoRa-TxRx-Range-Meter")) == 0 && checkData(data)) {
      Serial.println(data);
      beeps(5, 500);
      lowPower();
    }
  }
}

bool checkData(String data) {
  int idx = data.lastIndexOf(F(",")) + 1;
  int dataCheckSum = (data.substring(idx)).toInt();
  data = data.substring(0, idx);
  int calculatedCheckSum = calculateSum(data);
  return dataCheckSum == calculatedCheckSum;
}

#pragma endregion LoRa

#pragma region Miscelaneas

bool readButton() {
  static int estado = HIGH;                   // Estado actual del botón
  static int ultimoEstado = HIGH;             // Estado anterior del botón
  static unsigned long lastDebounceTime = 0;  // Última vez que el pin cambió de estado
  static unsigned long debounceDelay = 25;    // Tiempo de demora para el efecto rebote
  int reading = digitalRead(ACTION);          // Leer el estado del botón
  // Verificar si el estado del botón ha cambiado (debido al ruido o pulsación real)
  if (reading != ultimoEstado) {
    lastDebounceTime = millis();  // Reiniciar el temporizador de efecto rebote
  }
  // Si ha pasado el tiempo suficiente desde la última vez que el estado cambió
  if ((millis() - lastDebounceTime) > debounceDelay) {
    // Si el estado ha cambiado, actualizar el estado del botón
    if (reading != estado) {
      estado = reading;
      // Solo considerar la pulsación cuando el botón pasa de HIGH a LOW (flanco de bajada)
      if (estado == LOW) {
        Serial.println("Boton");
        return true;
      }
    }
  }
  // Guardar la lectura actual como el último estado del botón para la próxima iteración
  ultimoEstado = reading;
  return false;
}

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}

void beeps(int iter, int timer) {
  for (int i = 0; i < iter; i++) {
    beep(timer);
  }
}

void beep(int timer) {
  digitalWrite(BUZZER, HIGH);
  delay(timer);
  digitalWrite(BUZZER, LOW);
  delay(timer);
}

void lowPower() {
  LoRa.sleep();
  LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
  LowPower.powerDown(SLEEP_1S, ADC_OFF, BOD_OFF);
  LoRa.idle();
}

#pragma endregion Miscelaneas

