// Especificación: spec/funcionamiento.md, "LED de estado"

static int ledAt(unsigned long t) {
  mock::now = t;
  updateLed();
  return mock::pins[POWER_LED];
}

TEST_CASE(led_estado_segun_prioridad) {
  resetGateway();
  loraOk = true; netRegistered = true; serverOk = true;
  updateLedMode(); CHECK_EQ(ledMode, LED_OK);
  serverOk = false;
  updateLedMode(); CHECK_EQ(ledMode, LED_NO_SERVER);
  netRegistered = false;
  updateLedMode(); CHECK_EQ(ledMode, LED_NO_NET);
  loraOk = false;
  updateLedMode(); CHECK_EQ(ledMode, LED_LORA_ERR);            // LoRa tiene prioridad
}

TEST_CASE(led_fijo_cuando_todo_esta_bien) {
  resetGateway();
  ledMode = LED_OK;
  CHECK_EQ(ledAt(0), HIGH);
  CHECK_EQ(ledAt(1500), HIGH);
}

TEST_CASE(led_patrones_de_parpadeo) {
  resetGateway();
  ledMode = LED_NO_NET;                                        // 1 s encendido / 1 s apagado
  CHECK_EQ(ledAt(500), HIGH);
  CHECK_EQ(ledAt(1500), LOW);
  ledMode = LED_NO_SERVER;                                     // 200 ms / 200 ms
  CHECK_EQ(ledAt(100), HIGH);
  CHECK_EQ(ledAt(300), LOW);
  ledMode = LED_LORA_ERR;                                      // Destello de 100 ms cada 2 s
  CHECK_EQ(ledAt(50), HIGH);
  CHECK_EQ(ledAt(500), LOW);
}

TEST_CASE(led_no_bloquea) {
  resetGateway();
  ledMode = LED_NO_NET;
  unsigned long t0 = mock::now;
  updateLed();
  CHECK(mock::now - t0 < 5);
}
