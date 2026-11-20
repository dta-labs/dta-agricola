// Especificación: spec/funcionamiento.md, "Criterios de transmisión" (D-019: sin zona crítica)
// Se transmite si T o Hr cambian >= 0.5 respecto al último dato CONFIRMADO por el gateway,
// además de la primera lectura, la señal de vida (1 h) y la falla/recuperación del sensor.
// Lecturas base: 23.0 °C y 60.0 % Hr.

static void baseline(float t = 23.0, float h = 60.0) {
  startNode();
  sht4.t = t;
  sht4.h = h;
  loop();                                                     // Primer envío confirmado
  LoRa.sent.clear();
}

static bool transmitsWith(float t, float h) {
  sht4.t = t;
  sht4.h = h;
  LoRa.sent.clear();
  loop();
  return !LoRa.sent.empty();
}

TEST_CASE(umbrales_son_0_5) {
  CHECK_NEAR(DELTA_T, 0.5, 0.001);
  CHECK_NEAR(DELTA_HR, 0.5, 0.001);
}

TEST_CASE(primera_lectura_siempre_se_transmite) {
  startNode();
  loop();
  CHECK(!LoRa.sent.empty());
}

TEST_CASE(sin_cambios_no_transmite) {
  baseline();
  CHECK(!transmitsWith(23.0, 60.0));
}

TEST_CASE(cambio_de_temperatura_de_0_5_transmite) {
  baseline();
  CHECK(!transmitsWith(23.4, 60.0));
  CHECK(transmitsWith(23.5, 60.0));
}

TEST_CASE(cambio_de_humedad_de_0_5_transmite) {
  baseline();
  CHECK(!transmitsWith(23.0, 60.4));
  CHECK(transmitsWith(23.0, 60.5));
}

TEST_CASE(bajadas_tambien_transmiten) {
  baseline();
  CHECK(transmitsWith(22.5, 60.0));
  baseline();
  CHECK(transmitsWith(23.0, 59.5));
}

// Cambios graduales: se acumulan contra el último dato confirmado, no contra la lectura anterior
TEST_CASE(temperatura_que_sube_de_a_poco_se_detecta) {
  baseline();
  CHECK(!transmitsWith(23.2, 60.0));                          // +0.2
  CHECK(!transmitsWith(23.4, 60.0));                          // +0.4
  CHECK(transmitsWith(23.6, 60.0));                           // +0.6 respecto al último envío
  CHECK_NEAR(t_sent, 23.6, 0.01);                             // Nueva referencia
  CHECK(!transmitsWith(23.8, 60.0));                          // +0.2 respecto a 23.6
}

TEST_CASE(temperatura_que_baja_de_a_poco_se_detecta) {
  baseline();
  CHECK(!transmitsWith(22.8, 60.0));
  CHECK(!transmitsWith(22.6, 60.0));
  CHECK(transmitsWith(22.4, 60.0));
}

TEST_CASE(humedad_que_cambia_de_a_poco_se_detecta) {
  baseline();
  CHECK(!transmitsWith(23.0, 60.2));
  CHECK(!transmitsWith(23.0, 60.4));
  CHECK(transmitsWith(23.0, 60.6));
}

TEST_CASE(deriva_muy_lenta_se_detecta) {                       // 0.1 por ciclo durante 5 ciclos
  baseline();
  for (int i = 1; i <= 4; i++) CHECK(!transmitsWith(23.0 + 0.1f * i, 60.0));
  CHECK(transmitsWith(23.5, 60.0));
}

TEST_CASE(no_hay_zona_critica) {                               // Antes, cerca de 0-3 °C se usaba 0.2
  baseline(2.6, 60.0);
  CHECK(!transmitsWith(2.9, 60.0));                           // +0.3: no alcanza 0.5
  CHECK(transmitsWith(3.1, 60.0));                            // +0.5
}

TEST_CASE(dato_no_confirmado_se_reintenta_en_el_siguiente_ciclo) {
  baseline();
  gatewaySilent();
  CHECK(transmitsWith(24.0, 60.0));
  gatewayResponds();
  CHECK(transmitsWith(24.0, 60.0));                           // Sigue pendiente
  CHECK_NEAR(t_sent, 24.0, 0.01);
}

TEST_CASE(falla_y_recuperacion_del_sensor_transmiten) {
  baseline();
  sht4.readOk = false;
  CHECK(transmitsWith(23.0, 60.0));
  CHECK(errorSent);
  CHECK(!transmitsWith(23.0, 60.0));                          // Sigue en falla: no repite
  sht4.readOk = true;
  CHECK(transmitsWith(23.0, 60.0));
  CHECK(!errorSent);
}

TEST_CASE(heartbeat_transmite_aprox_cada_hora_sin_cambios) {
  baseline();
  int cycles = 0;
  unsigned long slept = 0;
  while (cycles < 100) {
    LowPower.reset();
    bool tx = transmitsWith(23.0, 60.0);
    slept += LowPower.sleptMs;
    cycles++;
    if (tx) break;
  }
  double minutes = slept / 60000.0;
  CHECK(minutes >= HEARTBEAT * 60);
  CHECK(minutes <= HEARTBEAT * 60 + TIMER * 1.2 + 1);
}
