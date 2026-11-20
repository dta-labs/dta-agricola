// Especificación: spec/protocolo.md (tramas LoRa) y spec/funcionamiento.md (cola LoRa)

// ---------- Inicialización ----------

TEST_CASE(initLoRa_exitoso_activa_loraOk) {
  resetGateway();
  CHECK(initLoRa());
  CHECK(loraOk);
  CHECK_EQ(mock::count("lora.begin"), 1);
}

TEST_CASE(initLoRa_falla_tras_5_intentos_sin_colgarse) {
  resetGateway();
  LoRa.beginOk = false;
  CHECK(!initLoRa());
  CHECK(!loraOk);
  CHECK_EQ(mock::count("lora.begin"), LORA_INIT_RETRIES);
}

// ---------- Validación de tramas ----------

static bool valid(const std::string& f) {
  uint8_t c[6];
  return loraCheckData(f.c_str(), c);
}

TEST_CASE(trama_sht_valida_se_acepta) {
  CHECK(valid(nodeFrame("DTA-SHT-0xA1")));
  CHECK(valid(nodeFrame("DTA-SHT-0xA1", "-1", "0.0")));                 // Sensor en falla
}

TEST_CASE(trama_con_checksum_alterado_se_rechaza) {
  std::string f = nodeFrame("DTA-SHT-0xA1");
  f.back() = f.back() == '9' ? '0' : f.back() + 1;
  CHECK(!valid(f));
}

TEST_CASE(trama_rechaza_encabezado_id_0x0_y_campos_faltantes) {
  CHECK(!valid(nodeFrame("XYZ-SHT-0xA1")));
  CHECK(!valid(nodeFrame("DTA-SHT-0x0")));
  CHECK(!valid("DTA-SHT-0xA1,d,5,60,4.0,123"));
}

TEST_CASE(trama_valida_tipo_ttl_hr_y_vcc) {
  CHECK(!valid(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "3.30", "x")));
  CHECK(!valid(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "3.30", "d", "6")));
  CHECK(!valid(nodeFrame("DTA-SHT-0xA1", "101")));
  CHECK(!valid(nodeFrame("DTA-SHT-0xA1", "-2")));
  CHECK(!valid(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "1.9")));
  CHECK(!valid(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "6.1")));
}

TEST_CASE(trama_sht_valida_rango_de_temperatura) {
  CHECK(valid(nodeFrame("DTA-SHT-0xA1", "60", "-25.0")));
  CHECK(!valid(nodeFrame("DTA-SHT-0xA1", "60", "-25.1")));
  CHECK(!valid(nodeFrame("DTA-SHT-0xA1", "60", "75.1")));
}

TEST_CASE(trama_sct_valida_val2) {                                       // Corrección v1.1
  CHECK(valid(nodeFrame("DTA-SCT-0xA1", "12.3", "45.6")));
  CHECK(!valid(nodeFrame("DTA-SCT-0xA1", "12.3", "150.0")));
}

TEST_CASE(isHexadecimal_acepta_minusculas_y_rechaza_no_hex) {           // Corrección v1.1
  CHECK(isHexadecimal("0xF46A367"));
  CHECK(isHexadecimal("0xf46a367"));
  CHECK(isHexadecimal("0XABC"));
  CHECK(!isHexadecimal("0xG1"));
  CHECK(!isHexadecimal("F46A"));
  CHECK(!isHexadecimal("0x"));
}

// ---------- Cola de recepción ----------

TEST_CASE(cola_llena_cuenta_los_paquetes_perdidos) {
  readyGateway();
  for (int i = 0; i < 6; i++) { LoRa.rx.push_back(nodeFrame("DTA-SHT-0xA1")); loraPoll(); }
  CHECK_EQ(rxCount, RXQ_SIZE);
  CHECK_EQ((int) rxDropped, 6 - RXQ_SIZE);
  serviceLoRa();
  CHECK_EQ(rxCount, 0);
}

TEST_CASE(cola_descarta_paquete_demasiado_largo) {
  readyGateway();
  LoRa.rx.push_back(std::string(PKT_LEN + 10, 'A'));
  loraPoll();
  CHECK_EQ(rxCount, 0);
}

TEST_CASE(sin_lora_no_se_lee_el_radio) {
  readyGateway();
  loraOk = false;
  LoRa.rx.push_back(nodeFrame("DTA-SHT-0xA1"));
  loraPoll();
  CHECK_EQ(rxCount, 0);
  CHECK_EQ((int) LoRa.rx.size(), 1);
}

// ---------- Procesamiento ----------

TEST_CASE(dato_de_sensor_registrado_se_guarda_y_se_confirma) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xB2", "55", "23.4", "3.31"));
  CHECK_EQ(dataToSend[1], "55,23.4,3.31");
  CHECK_EQ((int) LoRa.sent.size(), 1);
  CHECK_EQ(LoRa.sent[0], expectedAck("DTA-SHT-0xB2", 5 / 2));
}

TEST_CASE(confirmacion_usa_frecuencia_minima_1) {
  readyGateway();
  cfg.mode = 1;
  receive(nodeFrame("DTA-SHT-0xA1"));
  CHECK_EQ(LoRa.sent[0], expectedAck("DTA-SHT-0xA1", 1));
}

TEST_CASE(sensor_no_registrado_se_ignora) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xD4"));
  CHECK(LoRa.sent.empty());
  for (int i = 0; i < MAX_SENSORS; i++) CHECK_EQ(dataToSend[i][0], '\0');
}

TEST_CASE(trama_de_confirmacion_de_otro_gateway_se_ignora) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "3.30", "a"));
  CHECK(LoRa.sent.empty());
  CHECK_EQ(dataToSend[0][0], '\0');
}

TEST_CASE(busqueda_compara_id_completo) {                               // Corrección v1.1
  readyGateway();
  const char* l = "0xF46A2A5,0xF46A2";
  setSensorList(l, l + strlen(l));
  CHECK_EQ(getPossition("0xF46A2"), 1);
  CHECK_EQ(getPossition("0xf46a2a5"), 0);
  CHECK_EQ(getPossition("0xF46A"), -1);
}

// ---------- Modo descubrimiento ----------

TEST_CASE(descubrimiento_agrega_sensores_nuevos_sin_confirmar) {
  readyGateway();
  cfg.mode = 0;
  receive(nodeFrame("DTA-SHT-0xD4"));
  CHECK_EQ(cfg.count, 4);
  CHECK_EQ(idOf(3), "0xD4");
  CHECK(LoRa.sent.empty());
}

TEST_CASE(descubrimiento_limita_la_lista_a_10) {                        // Corrección v1.1
  readyGateway();
  cfg.mode = 0;
  for (int i = 0; i < 12; i++) {
    char h[24];
    std::snprintf(h, sizeof h, "DTA-SHT-0xAA%02d", i);
    receive(nodeFrame(h));
  }
  CHECK_EQ(cfg.count, MAX_SENSORS);
}

TEST_CASE(descubrimiento_muestra_las_tramas_recibidas) {        // Diagnóstico: el gateway "no ve" a los sensores
  readyGateway();
  cfg.mode = 0;
  Serial.out.clear();
  receive(nodeFrame("DTA-SHT-0xA1"));
  CHECK(contains(Serial.out, "DTA-SHT-0xA1,d,5"));
  CHECK(contains(Serial.out, "descubrimiento"));
}

TEST_CASE(sensor_fuera_de_la_lista_se_informa) {
  readyGateway();
  Serial.out.clear();
  receive(nodeFrame("DTA-SHT-0xD4"));
  CHECK(contains(Serial.out, "no registrado"));
}

TEST_CASE(trama_mas_larga_sct_cabe_y_se_procesa) {             // D-025: buffers ajustados al máximo real
  readyGateway();
  const char* l = "0x289585BD00000051";
  setSensorList(l, l + strlen(l));
  std::string f = nodeFrame("DTA-SCT-0x289585BD00000051", "100.0", "100.0", "6.0");
  CHECK((int) f.size() < PKT_LEN);
  receive(f);
  CHECK_EQ(dataToSend[0], "100.0,100.0,6.0");
  CHECK_EQ((int) LoRa.sent.size(), 1);
}
