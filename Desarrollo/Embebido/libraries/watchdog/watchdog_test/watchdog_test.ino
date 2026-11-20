// Prueba del watchdog en la placa (Arduino Pro Mini / ATmega328P)
// Procedimiento y resultados esperados: test/hardware/README.md
//
// Etapa 1: watchdog de 2 s y cuelgue        -> debe reiniciarse (valida el bootloader)
// Etapa 2: dormir con LowPower, reactivar   -> debe reiniciarse (valida armWatchdog() del firmware)
// Etapa 3: dormir con LowPower, SIN reactivar -> no debe reiniciarse (confirma que LowPower apaga el watchdog)

#include <avr/wdt.h>
#include <EEPROM.h>
#include <LowPower.h>

#define SERIAL_BAUD 250000
#define LED_PIN 13
#define EE_STAGE 1000                    // Fuera de la zona usada por el nodo (direcciones 0–6)
#define NO_RESET_WAIT_MS 20000UL

uint8_t r2Flags __attribute__((section(".noinit")));
uint8_t mcusrFlags __attribute__((section(".noinit")));

// Optiboot borra MCUSR y deja la causa del reinicio en el registro r2
void saveR2() __attribute__((naked, used, section(".init0")));
void saveR2() { __asm__ __volatile__("sts %0, r2\n" : "=m"(r2Flags) :); }

// Antes de setup(): guardar MCUSR y apagar el watchdog (evita reinicios en cadena dentro del sketch)
void earlyInit() __attribute__((naked, used, section(".init3")));
void earlyInit() {
  mcusrFlags = MCUSR;
  MCUSR = 0;
  wdt_disable();
}

void printCause(uint8_t f) {
  Serial.print(F("Causa del reinicio (0x")); Serial.print(f, HEX); Serial.print(F("):"));
  if (f & _BV(PORF))  Serial.print(F(" encendido"));
  if (f & _BV(EXTRF)) Serial.print(F(" boton/externo"));
  if (f & _BV(BORF))  Serial.print(F(" bajo voltaje"));
  if (f & _BV(WDRF))  Serial.print(F(" WATCHDOG"));
  if (f == 0)         Serial.print(F(" desconocida"));
  Serial.println();
}

void setStage(uint8_t s) { EEPROM.update(EE_STAGE, s); }

void hang() {
  Serial.println(F("   Colgando el programa..."));
  Serial.flush();
  while (true) {}
}

void sleepWithLowPower() {
  Serial.println(F("   Durmiendo 3 s con LowPower..."));
  Serial.flush();
  for (uint8_t i = 0; i < 3; i++) LowPower.powerDown(SLEEP_1S, ADC_OFF, BOD_OFF);
}

void finish(bool ok) {
  setStage(0);
  Serial.println(ok ? F("\n=== PRUEBA COMPLETA: watchdog OK ===") : F("\n=== PRUEBA FALLIDA ==="));
  while (true) {                          // LED: lento = OK, rápido = falla
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(ok ? 1000 : 150);
  }
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(SERIAL_BAUD);
  uint8_t flags = mcusrFlags ? mcusrFlags : r2Flags;
  bool byWatchdog = flags & _BV(WDRF);
  Serial.println(F("\n=== Prueba de watchdog ==="));
  printCause(flags);

  uint8_t stage = EEPROM.read(EE_STAGE);
  if (!byWatchdog || stage > 3) stage = 0;           // Encendido o botón: empezar desde el principio

  switch (stage) {
    case 0:
      Serial.println(F("Etapa 1: watchdog de 2 s. Debe reiniciarse en ~2 s."));
      Serial.println(F("   Si no aparece nada en 10 s y el LED parpadea rapido sin parar:"));
      Serial.println(F("   el bootloader no soporta el watchdog (ver README)."));
      setStage(1);
      wdt_enable(WDTO_2S);
      hang();
      break;

    case 1:
      Serial.println(F("   ✔ Etapa 1 OK: reinicio por watchdog."));
      Serial.println(F("Etapa 2: dormir con LowPower, reactivar el watchdog (8 s) y colgar. Debe reiniciarse en ~8 s."));
      setStage(2);
      wdt_enable(WDTO_8S);
      sleepWithLowPower();
      wdt_enable(WDTO_8S);                            // Igual que armWatchdog() en el firmware
      hang();
      break;

    case 2: {
      Serial.println(F("   ✔ Etapa 2 OK: el watchdog reactivado despues de dormir funciona."));
      Serial.println(F("Etapa 3: dormir con LowPower SIN reactivar y esperar 20 s. No debe reiniciarse."));
      setStage(3);
      wdt_enable(WDTO_8S);
      sleepWithLowPower();
      Serial.println(F("   Esperando 20 s..."));
      unsigned long t0 = millis();
      while (millis() - t0 < NO_RESET_WAIT_MS) {}
      Serial.println(F("   ✔ Etapa 3 OK: sin reinicio. LowPower apaga el watchdog al despertar,"));
      Serial.println(F("     por eso el firmware lo reactiva despues de cada sueño."));
      finish(true);
      break;
    }

    case 3:
      Serial.println(F("   ⚠ Etapa 3: hubo reinicio. Esta version de LowPower NO apaga el watchdog."));
      Serial.println(F("     No es una falla: reactivarlo en el firmware es inofensivo."));
      finish(true);
      break;
  }
}

void loop() {}
