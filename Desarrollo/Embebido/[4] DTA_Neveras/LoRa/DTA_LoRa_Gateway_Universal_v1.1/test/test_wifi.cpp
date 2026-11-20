// Especificación: spec/decisiones.md (D-036 a D-040), spec/protocolo.md ("Enlace serie con el ESP8266")
// y spec/funcionamiento.md ("Canal: WiFi primero, GSM de respaldo")

static bool startsWith(const std::string& s, const std::string& p) { return s.rfind(p, 0) == 0; }

// Gateway listo con la WiFi conectada
static void wifiGateway(int rssi = -60) {
  readyGateway();
  espSerial.wifiState = 2;
  espSerial.wifiRssi = rssi;
}

TEST_CASE(wifi_conectada_envia_por_wifi_y_no_por_gsm) {
  wifiGateway();
  comunicaciones();
  CHECK(serverOk);
  CHECK_EQ((int) espSerial.urls.size(), 1);
  CHECK(gprs.urls.empty());                                    // El GSM no hace la petición
  CHECK_EQ(lastChannel, 'w');
}

TEST_CASE(wifi_el_imei_se_lee_por_gsm_aunque_se_envie_por_wifi) {   // D-038
  wifiGateway();
  comunicaciones();
  CHECK_EQ(gatewayId, "861234567890123");
  CHECK_EQ(espSerial.stImei, "861234567890123");               // El ESP lo muestra en el portal
  CHECK(contains(espSerial.urls.at(0), "id=861234567890123"));
}

TEST_CASE(wifi_url_tiene_el_formato_del_protocolo) {        // D-039
  wifiGateway(-61);
  std::strcpy(dataToSend[1], "55,23.4,3.31");
  dataAge[1] = 0;
  comunicaciones();
  CHECK_EQ(espSerial.urls.at(0),
           "#GET,dtaamerica.com,/ws/sensor_v6.php?id=861234567890123"
           "&data=[,55,23.4,3.31,,,,,,,,]&rx=ini&si=26&qos=99&lo=[0,1,0,0,0,0,0,0,0,0]&lr=1&cn=w");
}

TEST_CASE(wifi_rssi_se_convierte_a_la_escala_csq) {
  CHECK_EQ(rssiToCsq(-113), 0);
  CHECK_EQ(rssiToCsq(-120), 0);                                // Mínimo 0
  CHECK_EQ(rssiToCsq(-61), 26);
  CHECK_EQ(rssiToCsq(-51), 31);
  CHECK_EQ(rssiToCsq(-30), 31);                                // Máximo 31
}

TEST_CASE(wifi_aplica_y_guarda_la_configuracion) {
  wifiGateway();
  espSerial.body = "\"3\"0xA1\"0xD4\"";
  comunicaciones();
  CHECK(serverOk);
  CHECK_EQ(cfg.mode, 3);
  CHECK_EQ(idOf(1), "0xD4");
  std::memset(&cfg, 0, sizeof cfg);
  CHECK(loadConfig());
  CHECK_EQ(cfg.mode, 3);
}

TEST_CASE(wifi_sin_configurar_usa_gsm) {
  readyGateway();
  espSerial.wifiState = 0;
  comunicaciones();
  CHECK(espSerial.urls.empty());
  CHECK_EQ((int) gprs.urls.size(), 1);
  CHECK(contains(gprs.urls.at(0), "&cn=g\""));
  CHECK(serverOk);
  CHECK_EQ(lastChannel, 'g');
}

TEST_CASE(wifi_configurada_sin_conexion_usa_gsm) {
  readyGateway();
  espSerial.wifiState = 1;
  comunicaciones();
  CHECK(espSerial.urls.empty());
  CHECK_EQ((int) gprs.urls.size(), 1);
  CHECK(serverOk);
}

TEST_CASE(esp_sin_respuesta_usa_gsm_sin_esperar_de_mas) {
  wifiGateway();
  espSerial.silent = true;                                     // ESP ausente o sin energía
  comunicaciones();
  CHECK_EQ(wifiState, ESP_NO_REPLY);
  CHECK_EQ((int) gprs.urls.size(), 1);
  CHECK(serverOk);
  CHECK(Serial.out.find("ESP8266 no responde") != std::string::npos);
}

TEST_CASE(esp_sin_respuesta_tarda_solo_el_tiempo_limite_de_estado) {
  wifiGateway();
  espSerial.silent = true;
  unsigned long t0 = mock::now;
  wifiRequest();
  CHECK(mock::now - t0 < ESP_STATUS_MS + 100);
}

TEST_CASE(wifi_falla_http_usa_gsm_en_el_mismo_ciclo) {
  wifiGateway();
  espSerial.httpStatus = 500;
  espSerial.body = "<html>Error</html>";
  comunicaciones();
  CHECK_EQ((int) espSerial.urls.size(), 1);
  CHECK_EQ((int) gprs.urls.size(), 1);
  CHECK(serverOk);
  CHECK_EQ(commError, 0);
  CHECK_EQ(lastChannel, 'g');
}

TEST_CASE(wifi_respuesta_sin_configuracion_usa_gsm) {
  wifiGateway();
  espSerial.body = "<html>Error</html>";                      // 200 pero sin configuración válida
  comunicaciones();
  CHECK_EQ((int) gprs.urls.size(), 1);
  CHECK(serverOk);
}

TEST_CASE(wifi_falla_de_dns_reintenta_con_la_ip) {          // D-040
  wifiGateway();
  espSerial.dnsFails = true;
  comunicaciones();
  CHECK_EQ((int) espSerial.urls.size(), 2);
  CHECK(startsWith(espSerial.urls.at(1), "#GET,172.102.246.22,/ws/sensor_v6.php?id="));
  CHECK(gprs.urls.empty());
  CHECK(serverOk);
}

TEST_CASE(falla_en_ambos_canales_suma_un_solo_error) {
  wifiGateway();
  espSerial.httpStatus = 500;
  gprs.body = "<html>Error</html>";
  comunicaciones();
  CHECK(!serverOk);
  CHECK_EQ(commError, 1);
}

TEST_CASE(wifi_correcta_reinicia_el_contador_de_errores) {
  wifiGateway();
  commError = 3;
  comunicaciones();
  CHECK_EQ(commError, 0);
}

TEST_CASE(wifi_ignora_lineas_que_no_son_del_protocolo) {    // D-040
  wifiGateway();
  espSerial.onCommand = [](const std::string& c) {
    if (c.rfind("#GET", 0) == 0) espSerial.feed("\x8f\x12 ets Jan  8 2013,rst cause:2\r\nbasura\r\n", 10);
  };
  comunicaciones();
  CHECK(serverOk);
  CHECK(gprs.urls.empty());
}

TEST_CASE(wifi_respuesta_larga_no_desborda_la_memoria) {
  wifiGateway();
  espSerial.body = "\"" + std::string(400, '1') + "\"";       // El ESP la recorta a 250
  comunicaciones();
  CHECK(respLen < RESP_SIZE);
}

TEST_CASE(lora_duerme_durante_la_sesion_wifi) {             // D-038 (como D-027)
  wifiGateway();
  static bool radioAwake = false;
  radioAwake = false;
  espSerial.onCommand = [](const std::string&) { if (!LoRa.sleeping) radioAwake = true; };
  comunicaciones();
  CHECK(!radioAwake);
  CHECK(!LoRa.sleeping);                                       // Al terminar vuelve a escuchar
}

TEST_CASE(wifi_envio_confirmado_avanza_la_antiguedad) {
  wifiGateway();
  receive(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "3.3"));
  comunicaciones();
  CHECK(contains(espSerial.urls.at(0), "&lo=[1,0,0,0,0,0,0,0,0,0]"));
  comunicaciones();
  CHECK(contains(espSerial.urls.at(1), "&lo=[0,-1,-1,0,0,0,0,0,0,0]"));
}

TEST_CASE(cambia_de_wifi_a_gsm_y_regresa) {
  wifiGateway();
  comunicaciones();
  CHECK_EQ(lastChannel, 'w');
  espSerial.wifiState = 1;                                     // Se cae la WiFi
  comunicaciones();
  CHECK_EQ(lastChannel, 'g');
  CHECK_EQ((int) gprs.urls.size(), 1);
  espSerial.wifiState = 2;                                     // Vuelve
  comunicaciones();
  CHECK_EQ(lastChannel, 'w');
  CHECK_EQ((int) gprs.urls.size(), 1);
  CHECK_EQ((int) espSerial.urls.size(), 2);
}

TEST_CASE(gsm_no_se_reconfigura_mientras_la_wifi_funciona) {
  wifiGateway();
  comunicaciones();
  int apn = gprs.count("AT+SAPBR=3,1,\"APN\"");
  int csq = gprs.count("AT+CSQ");
  comunicaciones();
  comunicaciones();
  CHECK_EQ(gprs.count("AT+SAPBR=3,1,\"APN\""), apn);
  CHECK_EQ(gprs.count("AT+CSQ"), csq);                         // El GSM queda en reposo
}

TEST_CASE(sin_imei_no_se_envia_por_wifi) {
  wifiGateway();
  gprs.imei = "123";                                           // IMEI inválido: no hay Id
  comunicaciones();
  CHECK(espSerial.urls.empty());
  CHECK(!serverOk);
}

TEST_CASE(gsm_vuelve_a_escuchar_despues_de_la_wifi) {
  wifiGateway();
  comunicaciones();
  CHECK(gprs.isListening());                                   // Para detectar mensajes espontáneos del módem
}
