// Especificación: spec/protocolo.md

TEST_CASE(trama_de_datos_tiene_formato_y_checksum_correctos) {
  startNode();
  sht4.t = 4.04;
  sht4.h = 59.6;
  readSensor();
  char buf[PKT_LEN];
  createDataStr(buf, sizeof buf);
  auto f = fields(buf);
  CHECK_EQ((int) f.size(), 7);
  CHECK_EQ(f[0], "DTA-SHT-0xABCDEF12");
  CHECK_EQ(f[1], "d");
  CHECK_EQ(f[2], "5");
  CHECK_EQ(f[3], "60");                                       // Hr sin decimales (redondeado)
  CHECK_EQ(f[4], "4.0");                                      // T con 1 decimal
  CHECK_EQ(f[5], "3.3");                                      // Vcc con 1 decimal (validación de updateNeveraDB.php)
  std::string sinCS = std::string(buf).substr(0, std::string(buf).rfind(',') + 1);
  CHECK_EQ(std::stoi(f[6]), checksumOf(sinCS));
}

TEST_CASE(trama_con_sensor_en_falla_envia_hr_menos_1_y_t_cero) {
  startNode();
  sht4.readOk = false;
  readSensor();
  char buf[PKT_LEN];
  createDataStr(buf, sizeof buf);
  auto f = fields(buf);
  CHECK_EQ(f[3], "-1");
  CHECK_EQ(f[4], "0.0");
}

TEST_CASE(trama_mas_larga_cabe_en_el_buffer) {
  startNode();
  nodeCfg.serial = 0xFFFFFFFF;
  sht4.serial = 0xFFFFFFFF;
  setupSensors();
  sht4.t = -39.9;
  sht4.h = 100;
  readSensor();
  char buf[PKT_LEN];
  createDataStr(buf, sizeof buf);
  auto f = fields(buf);
  CHECK_EQ((int) f.size(), 7);
  CHECK((int) strlen(buf) < PKT_LEN);
}

TEST_CASE(lectura_fuera_de_rango_se_trata_como_falla) {
  startNode();
  sht4.t = 130;
  readSensor();
  CHECK(!sensorOk);
}

TEST_CASE(checksum_valido_se_acepta_y_alterado_se_rechaza) {
  std::string ack = gatewayAck("DTA-SHT-0xABCDEF12", 5);
  CHECK(checkDataIntegrity(ack.c_str()));
  std::string bad = ack;
  bad[bad.size() - 1] = bad[bad.size() - 1] == '9' ? '0' : bad[bad.size() - 1] + 1;
  CHECK(!checkDataIntegrity(bad.c_str()));
  CHECK(!checkDataIntegrity("sin comas"));
}

TEST_CASE(confirmacion_de_otro_nodo_se_ignora) {
  startNode();
  LoRa.rx.push_back(gatewayAck("DTA-SHT-0x11111111", 5));
  CHECK(!receivedConfirmation(ACK_TIMEOUT));
}

TEST_CASE(confirmacion_propia_se_acepta) {
  startNode();
  LoRa.rx.push_back(gatewayAck(NODE_ID, 5));
  CHECK(receivedConfirmation(ACK_TIMEOUT));
}

TEST_CASE(espera_de_confirmacion_respeta_el_tiempo_limite) {
  startNode();
  unsigned long t0 = millis();
  CHECK(!receivedConfirmation(ACK_TIMEOUT));
  unsigned long waited = millis() - t0;
  CHECK(waited >= ACK_TIMEOUT);
  CHECK(waited <= ACK_TIMEOUT + 100);
}

TEST_CASE(frecuencia_del_gateway_se_aplica_y_se_guarda) {
  startNode(2);
  loop();
  CHECK_EQ(TIMER, 2);
  NodeConfig saved;
  EEPROM.get(EE_ADDR_CFG, saved);
  CHECK_EQ(saved.timer, 2);
}

TEST_CASE(frecuencia_del_gateway_fuera_de_rango_se_ignora) {
  startNode(0);
  loop();
  CHECK_EQ(TIMER, DEFAULT_TIMER);
  startNode(MAX_TIMER + 1);
  loop();
  CHECK_EQ(TIMER, DEFAULT_TIMER);
}

TEST_CASE(getTxFrequency_lee_el_cuarto_campo) {
  CHECK_EQ(getTxFrequency(gatewayAck("DTA-SHT-0xA", 7).c_str()), 7);
  CHECK_EQ(getTxFrequency("DTA-SHT-0xA,d,5,1,2,3,4"), -1);
}
