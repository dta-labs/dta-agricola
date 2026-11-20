// Simulación del watchdog del AVR
#pragma once
#include "../Arduino.h"

#define WDTO_8S 9

inline void wdt_enable(int) {
  mock::wdtEnabled = true;
  mock::wdtArmCount++;
  mock::log("wdt");
}
inline void wdt_reset() {}
inline void wdt_disable() { mock::wdtEnabled = false; }
