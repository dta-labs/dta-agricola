// Prueba mínima del watchdog (Arduino Pro Mini / ATmega328P). Monitor serie a 9600 baudios.
//
// 1) Activa el watchdog de 2 s y lo alimenta durante 5 s: NO debe reiniciarse.
// 2) Deja de alimentarlo: debe reiniciarse en ~2 s y mostrar "Causa: WATCHDOG".
// Se repite 3 veces y termina con "PRUEBA COMPLETA".
//
// Resultados:
//   ✔ Aparece "Causa: WATCHDOG" 3 veces y "PRUEBA COMPLETA"  -> el watchdog funciona.
//   ✘ Aparece "FALLA: no hubo reinicio"                       -> el watchdog no reinicia la placa.
//   ✘ Después de "Se deja de alimentar" no aparece nada más y
//     el LED de la placa parpadea rápido sin parar             -> el bootloader no soporta el watchdog
//                                                                (desconectar la alimentación para recuperarla).

#include <avr/wdt.h>

#define WDT_RESETS_TO_PASS 3

uint8_t mcusrCopy __attribute__((section(".noinit")));
uint8_t r2Copy __attribute__((section(".noinit")));
uint8_t wdtResets __attribute__((section(".noinit")));   // Sobrevive a un reinicio por watchdog

// Optiboot borra MCUSR y deja la causa del reinicio en r2
void saveR2() __attribute__((naked, used, section(".init0")));
void saveR2() { __asm__ __volatile__("sts %0, r2\n" : "=m"(r2Copy) :); }

// Antes de setup(): guardar la causa del reinicio y apagar el watchdog
void earlyInit() __attribute__((naked, used, section(".init3")));
void earlyInit() {
  mcusrCopy = MCUSR;
  MCUSR = 0;
  wdt_disable();
}

void setup() {
  Serial.begin(250000);
  uint8_t flags = mcusrCopy ? mcusrCopy : r2Copy;
  bool byWatchdog = flags & _BV(WDRF);
  if (byWatchdog) wdtResets++; else wdtResets = 0;

  Serial.println(F("\n=== Prueba de watchdog ==="));
  Serial.print(F("Causa del reinicio:"));
  if (flags & _BV(PORF))  Serial.print(F(" encendido"));
  if (flags & _BV(EXTRF)) Serial.print(F(" boton"));
  if (flags & _BV(BORF))  Serial.print(F(" bajo voltaje"));
  if (byWatchdog)         Serial.print(F(" WATCHDOG"));
  if (flags == 0)         Serial.print(F(" desconocida"));
  Serial.println();

  if (byWatchdog) {
    Serial.print(F("✔ Reinicio por watchdog #")); Serial.println(wdtResets);
  }
  if (wdtResets >= WDT_RESETS_TO_PASS) {
    Serial.println(F("\n=== PRUEBA COMPLETA: el watchdog funciona ==="));
    return;                                                // Watchdog apagado: la placa queda quieta
  }

  Serial.println(F("1) Watchdog de 2 s activado. Se alimenta durante 5 s (no debe reiniciarse):"));
  wdt_enable(WDTO_2S);
  for (uint8_t i = 1; i <= 5; i++) {
    delay(1000);
    wdt_reset();
    Serial.print(F("   ")); Serial.print(i); Serial.println(F(" s"));
  }

  Serial.println(F("2) Se deja de alimentar: debe reiniciarse en ~2 s..."));
  Serial.flush();
  unsigned long t0 = millis();
  while (millis() - t0 < 10000UL) {}                       // Sin wdt_reset(): el watchdog debe actuar
  wdt_disable();
  Serial.println(F("✘ FALLA: no hubo reinicio en 10 s"));
}

void loop() {}
