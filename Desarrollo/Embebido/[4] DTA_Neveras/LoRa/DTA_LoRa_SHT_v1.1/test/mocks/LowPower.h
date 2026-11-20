// Simulación de la librería LowPower (rocketscream).
// Igual que la real, deja el watchdog apagado al despertar.
#pragma once
#include "Arduino.h"

enum period_t { SLEEP_15MS, SLEEP_30MS, SLEEP_60MS, SLEEP_120MS, SLEEP_250MS, SLEEP_500MS,
                SLEEP_1S, SLEEP_2S, SLEEP_4S, SLEEP_8S, SLEEP_FOREVER };
enum { ADC_OFF, ADC_ON, BOD_OFF, BOD_ON, TIMER2_OFF, TIMER2_ON, TIMER1_OFF, TIMER1_ON,
       TIMER0_OFF, TIMER0_ON, SPI_OFF, SPI_ON, USART0_OFF, USART0_ON, TWI_OFF, TWI_ON };

class LowPowerClass {
 public:
  unsigned long sleptMs = 0;                   // Tiempo total en powerDown (millis() no avanza)
  static unsigned long periodMs(period_t p) {
    switch (p) {
      case SLEEP_30MS: return 30;
      case SLEEP_1S: return 1000;
      case SLEEP_8S: return 8000;
      default: return 15;
    }
  }
  void powerDown(period_t p, int, int) {
    sleptMs += periodMs(p);
    mock::wdtEnabled = false;
  }
  void idle(period_t p, int, int, int, int, int, int, int) {
    mock::now += periodMs(p);                   // En idle Timer0 sigue: millis() avanza
    mock::wdtEnabled = false;
  }
  void reset() { sleptMs = 0; }
};
inline LowPowerClass LowPower;
