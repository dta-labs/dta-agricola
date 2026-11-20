// Especificación: spec/funciones.md §1 setup() y §2 loop()

// ---------- setup() ----------

// D-017: sin watchdog (el bootloader de la placa no soporta el reinicio por watchdog)
TEST_CASE(setup_no_activa_el_watchdog) {
  resetNode();
  setup();
  CHECK_EQ(mock::wdtArmCount, 0);
  CHECK(mock::indexOf("sht.begin") >= 0);
  CHECK(mock::indexOf("lora.begin") >= 0);
}

TEST_CASE(setup_sin_eeprom_usa_frecuencia_por_defecto) {
  resetNode();
  setup();
  CHECK_EQ(TIMER, DEFAULT_TIMER);
}

TEST_CASE(setup_recupera_frecuencia_de_eeprom) {
  resetNode();
  nodeCfg.serial = 0xABCDEF12;
  nodeCfg.timer = 10;
  saveNodeConfig();
  nodeCfg.timer = DEFAULT_TIMER;
  setup();
  CHECK_EQ(TIMER, 10);
}

TEST_CASE(setup_limita_frecuencia_guardada_fuera_de_rango) {
  resetNode();
  nodeCfg.timer = 200;
  saveNodeConfig();
  setup();
  CHECK_EQ(TIMER, MAX_TIMER);
  resetNode();
  nodeCfg.timer = 0;
  saveNodeConfig();
  setup();
  CHECK_EQ(TIMER, MIN_TIMER);
}

TEST_CASE(setup_arma_id_con_serie_del_sensor_y_la_guarda) {
  resetNode();
  setup();
  CHECK_EQ(NODE_ID, "DTA-SHT-0xABCDEF12");
  NodeConfig saved;
  EEPROM.get(EE_ADDR_CFG, saved);
  CHECK_EQ(saved.serial, 0xABCDEF12u);
}

TEST_CASE(setup_sensor_ausente_usa_id_guardado) {
  resetNode();
  nodeCfg.serial = 0x1234ABCD;
  saveNodeConfig();
  sht4.present = false;
  setup();
  CHECK(!sensorOk);
  CHECK_EQ(NODE_ID, "DTA-SHT-0x1234ABCD");
}

TEST_CASE(setup_sensor_ausente_sin_id_guardado_deja_id_vacio) {
  resetNode();
  sht4.present = false;
  setup();
  CHECK_EQ(NODE_ID[0], '\0');
}

TEST_CASE(setup_falla_de_lora_no_detiene_el_nodo) {
  resetNode();
  LoRa.beginOk = false;
  setup();                                                    // Debe regresar
  CHECK(!loraOk);
  CHECK_EQ(mock::count("lora.begin"), LORA_INIT_RETRIES);
}

TEST_CASE(setup_siembra_aleatorio) {
  resetNode();
  setup();
  CHECK(mock::indexOf("randomSeed") >= 0);
}

// ---------- loop() ----------

TEST_CASE(loop_primer_ciclo_transmite_y_marca_enviado_con_confirmacion) {
  startNode();
  loop();
  CHECK_EQ((int) LoRa.sent.size(), 1);
  CHECK(hasSent);
  CHECK(!lastTxFailed);
}

TEST_CASE(loop_sin_confirmacion_no_marca_enviado) {
  startNode();
  gatewaySilent();
  loop();
  CHECK(!hasSent);
  CHECK(lastTxFailed);
  CHECK_EQ((int) LoRa.sent.size(), MAX_TX_ATTEMPTS);
}

TEST_CASE(loop_tras_un_fallo_hace_un_solo_intento) {
  startNode();
  gatewaySilent();
  loop();
  LoRa.sent.clear();
  loop();
  CHECK_EQ((int) LoRa.sent.size(), 1);
}

TEST_CASE(loop_se_recupera_cuando_el_gateway_vuelve) {
  startNode();
  gatewaySilent();
  loop();
  gatewayResponds();
  loop();
  CHECK(hasSent);
  CHECK(!lastTxFailed);
}

TEST_CASE(loop_reintenta_lora_si_fallo_en_setup) {
  resetNode();
  gatewayResponds();
  LoRa.beginOk = false;
  setup();
  LoRa.beginOk = true;
  loop();
  CHECK(loraOk);
  CHECK(hasSent);
}

TEST_CASE(loop_sin_id_no_transmite) {
  resetNode();
  gatewayResponds();
  sht4.present = false;
  setup();
  loop();
  CHECK(LoRa.sent.empty());
}

TEST_CASE(loop_no_activa_el_watchdog) {                       // D-017
  startNode();
  loop();
  gatewaySilent();
  sht4.t = 1.0;
  loop();                                                     // Incluye esperas con LowPower.idle y powerDown
  CHECK_EQ(mock::wdtArmCount, 0);
}

TEST_CASE(loop_duerme_timer_minutos_mas_menos_20_por_ciento) {
  startNode();
  for (int i = 0; i < 20; i++) {
    LowPower.reset();
    loop();
    double minutes = LowPower.sleptMs / 60000.0;
    CHECK(minutes >= TIMER * 0.8 - 0.14);                     // 0.14 min = 1 ciclo de 8 s por redondeo
    CHECK(minutes <= TIMER * 1.2 + 0.14);
  }
}

TEST_CASE(loop_deja_el_radio_dormido) {
  startNode();
  loop();
  CHECK(LoRa.sleeping);
}

// D-013: el ID depende del sensor instalado
TEST_CASE(setup_cambio_de_sensor_cambia_id_y_lo_guarda) {
  resetNode();
  nodeCfg.serial = 0x11111111;                                // ID del sensor anterior
  saveNodeConfig();
  sht4.serial = 0x22222222;                                   // Sensor nuevo
  setup();
  CHECK_EQ(NODE_ID, "DTA-SHT-0x22222222");
  NodeConfig saved;
  EEPROM.get(EE_ADDR_CFG, saved);
  CHECK_EQ(saved.serial, 0x22222222u);
}

TEST_CASE(setup_id_con_serie_maxima) {
  resetNode();
  sht4.serial = 0xFFFFFFFF;
  setup();
  CHECK_EQ(NODE_ID, "DTA-SHT-0xFFFFFFFF");
}

TEST_CASE(setup_muestra_la_version) {                            // D-018
  resetNode();
  setup();
  CHECK(Serial.out.find(FW_VERSION) != std::string::npos);
}
