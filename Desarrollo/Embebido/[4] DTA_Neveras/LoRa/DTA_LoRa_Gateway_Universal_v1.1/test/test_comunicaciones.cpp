// Especificación: spec/protocolo.md (HTTP) y spec/funcionamiento.md (ciclo de comunicación)

TEST_CASE(ciclo_exitoso_aplica_y_guarda_configuracion) {
  readyGateway();
  gprs.body = "\"3\"0xA1\"0xD4\"";
  comunicaciones();
  CHECK(serverOk);
  CHECK(netRegistered);
  CHECK_EQ(cfg.mode, 3);
  CHECK_EQ(idOf(1), "0xD4");
  std::memset(&cfg, 0, sizeof cfg);
  CHECK(loadConfig());                                         // Quedó en EEPROM
  CHECK_EQ(cfg.mode, 3);
}

TEST_CASE(id_del_gateway_es_el_imei) {
  readyGateway();
  comunicaciones();
  CHECK_EQ(gatewayId, "861234567890123");
  CHECK(contains(gprs.urls.at(0), "id=861234567890123"));
}

TEST_CASE(imei_invalido_no_se_acepta) {
  readyGateway();
  gprs.imei = "86123456789";                                   // 11 dígitos
  comunicaciones();
  CHECK_EQ(gatewayId[0], '\0');
  CHECK(gprs.urls.empty());                                    // Sin ID no se envía
  CHECK(restartGSM);
}

TEST_CASE(url_tiene_el_formato_del_protocolo) {
  readyGateway();
  std::strcpy(dataToSend[1], "55,23.4,3.31");
  dataAge[1] = 0;                                              // Lectura nueva en la posición 1
  gprs.rssi = 17;
  gprs.ber = 2;
  comunicaciones();
  CHECK_EQ(gprs.urls.at(0),
           "AT+HTTPPARA=\"URL\",\"http://dtaamerica.com/ws/sensor_v6.php?id=861234567890123"
           "&data=[,55,23.4,3.31,,,,,,,,]&rx=ini&si=17&qos=2&lo=[0,1,0,0,0,0,0,0,0,0]&lr=1&cn=g\"");
}

TEST_CASE(url_sin_datos_envia_data_vacio_y_rx_ok_despues_del_inicio) {
  readyGateway();
  comunicaciones();
  comunicaciones();
  CHECK(contains(gprs.urls.back(), "&data=[]&rx=Ok"));
}

TEST_CASE(url_informa_lora_en_falla) {
  readyGateway();
  loraOk = false;
  comunicaciones();
  CHECK(contains(gprs.urls.at(0), "&lr=0"));
}

TEST_CASE(falla_de_dns_reintenta_con_la_ip) {
  readyGateway();
  gprs.dnsFails = true;
  comunicaciones();
  CHECK_EQ((int) gprs.urls.size(), 2);
  CHECK(contains(gprs.urls[1], "http://172.102.246.22/"));
  CHECK(serverOk);
}

TEST_CASE(envio_exitoso_pasa_lo_enviado_a_historico) {     // D-031
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "3.3"));
  comunicaciones();
  CHECK(serverOk);
  CHECK(contains(gprs.urls.at(0), "&data=[60,4.0,3.3,"));
  CHECK(contains(gprs.urls.at(0), "&lo=[1,0,0,0,0,0,0,0,0,0]"));
  comunicaciones();                                            // Sin lecturas nuevas
  CHECK(contains(gprs.urls.at(1), "&data=[60,4.0,3.3,"));     // Se reenvía el último valor conocido...
  CHECK(contains(gprs.urls.at(1), "&lo=[0,-1,-1,0,0,0,0,0,0,0]")); // 0: mismo dato; -1: 2 ciclos sin datos
}

TEST_CASE(lectura_nueva_y_historica_juntas) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "3.3"));
  comunicaciones();
  receive(nodeFrame("DTA-SHT-0xC3", "50", "22.6", "3.3"));
  comunicaciones();
  CHECK(contains(gprs.urls.at(1), "&data=[60,4.0,3.3,,50,22.6,3.3,,,,,,,]"));
  CHECK(contains(gprs.urls.at(1), "&lo=[0,-1,1,0,0,0,0,0,0,0]"));
}

TEST_CASE(envio_fallido_conserva_la_marca_de_nuevo) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "3.3"));
  gprs.body = "<html>Error</html>";
  comunicaciones();
  gprs.body = "\"5\"0xA1\"0xB2\"0xC3\"";
  comunicaciones();
  CHECK(contains(gprs.urls.at(1), "&lo=[1,0,0,0,0,0,0,0,0,0]"));
}

TEST_CASE(cambio_de_sensor_borra_su_historico) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xB2", "70", "5.0", "3.3"));
  comunicaciones();
  gprs.body = "\"5\"0xA1\"0xD4\"0xC3\"";                      // 0xB2 reemplazado por 0xD4
  comunicaciones();
  comunicaciones();
  CHECK(contains(gprs.urls.at(2), "&data=[]"));                 // El valor de 0xB2 ya no se envía
}

TEST_CASE(no_se_usa_lora_durante_la_sesion_gsm) {           // D-027
  readyGateway();
  static bool radioAwake = false;
  gprs.onCommand = [](const std::string&) { if (!LoRa.sleeping) radioAwake = true; };
  comunicaciones();
  CHECK(!radioAwake);                                          // Radio dormido en cada comando AT
  CHECK(LoRa.sent.empty());                                    // Ninguna transmisión LoRa
  CHECK(!LoRa.sleeping);                                       // Al terminar vuelve a escuchar
}

TEST_CASE(envio_fallido_conserva_los_datos) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xA1", "60", "4.0", "3.3"));
  gprs.body = "\"5\"0xA1\"0xB";                                 // Respuesta incompleta
  comunicaciones();
  CHECK(!serverOk);
  CHECK_EQ(dataToSend[0], "60,4.0,3.3");
  CHECK_EQ((int) dataAge[0], 0);                               // Sigue como nueva
  CHECK_EQ(commError, 1);
}

TEST_CASE(sin_registro_en_la_red_se_refleja_en_el_estado) {
  readyGateway();
  gprs.creg = 0;
  comunicaciones();
  CHECK(!netRegistered);
}

TEST_CASE(gsm_solo_se_reconfigura_cuando_hace_falta) {
  readyGateway();
  comunicaciones();
  int apn = gprs.count("AT+SAPBR=3,1,\"APN\"");
  comunicaciones();
  CHECK_EQ(gprs.count("AT+SAPBR=3,1,\"APN\""), apn);           // Sin errores: no repite la configuración
  CHECK_EQ(apn, 1);
}

TEST_CASE(cinco_errores_seguidos_reinician_el_gateway) {      // D-024: reinicio por software
  readyGateway();
  gprs.body = "<html>Error</html>";                            // Respuesta sin configuración
  bool reset = false;
  try {
    for (int i = 0; i < 10; i++) comunicaciones();
  } catch (ResetCalled&) {
    reset = true;
  }
  CHECK(reset);
}

TEST_CASE(modem_sin_respuesta_no_cuelga_el_gateway) {
  readyGateway();
  gprs.silent = true;
  bool reset = false;
  try {
    comunicaciones();                                           // Debe terminar por tiempo límite
  } catch (ResetCalled&) {
    reset = true;
  }
  CHECK(!serverOk);
  CHECK(!reset);
}

TEST_CASE(respuesta_mayor_al_buffer_no_desborda_la_memoria) {
  readyGateway();
  gprs.body = "\"" + std::string(400, '1') + "\"";
  comunicaciones();
  CHECK(respLen < RESP_SIZE);
  CHECK(!serverOk);
}

TEST_CASE(frecuencia_de_envio_segun_el_modo) {
  readyGateway();
  cfg.mode = 5;
  commTimer = 0;
  mock::now = 5 * 60000UL - 2;
  CHECK(!isTxTime());
  mock::now = 5 * 60000UL;
  CHECK(isTxTime());
  cfg.mode = 0;                                                // Descubrimiento: cada 30 s
  mock::now = 30000UL;
  CHECK(isTxTime());
}

TEST_CASE(sin_led_ni_watchdog_A0_y_A1_quedan_para_el_esp) {   // D-036
  resetGateway();
  gprs.silent = true;
  setup();
  readyGateway();
  comunicaciones();
  waitMs(3000);
  CHECK_EQ(mock::pinModes[14], INPUT);                         // Nadie usa A0/A1 como salida digital
  CHECK_EQ(mock::pinModes[15], INPUT);
}

TEST_CASE(se_muestra_el_codigo_http) {
  readyGateway();
  gprs.httpStatus = 404;
  Serial.out.clear();
  comunicaciones();
  CHECK(contains(Serial.out, "HTTP: 404"));
}

// Las esperas del módem terminan en cuanto llega la respuesta (D-022)
TEST_CASE(comando_termina_al_recibir_ok) {
  readyGateway();
  unsigned long t0 = mock::now;
  CHECK(atCmd(F("AT")));
  CHECK(mock::now - t0 < 300);                                 // Retardo del módem: 50 ms
}

TEST_CASE(respuesta_sin_ok_termina_tras_silencio) {
  readyGateway();
  gprs.overrides.push_back({"AT+XYZ", "\r\n+XYZ: 1\r\n"});
  unsigned long t0 = mock::now;
  atCmd(F("AT+XYZ"));
  CHECK(mock::now - t0 < 1000);                                // No espera los 5-10 s del tiempo límite
}

TEST_CASE(httpaction_espera_el_resultado_despues_del_ok) {
  readyGateway();
  gprs.httpLatencyMs = 3000;                                   // El resultado llega 3 s después del OK
  comunicaciones();
  CHECK(serverOk);
}

TEST_CASE(ciclo_completo_dura_poco_con_modem_rapido) {
  readyGateway();
  comunicaciones();                                            // Incluye la configuración del GSM
  unsigned long t0 = mock::now;
  comunicaciones();                                            // Ciclo normal
  CHECK(mock::now - t0 < 7000);                                // Incluye abrir la conexión GPRS (~2 s simulados)
}

TEST_CASE(arranque_muestra_la_version) {
  resetGateway();
  gprs.silent = true;
  setup();
  CHECK(contains(Serial.out, FW_VERSION));
}

TEST_CASE(eco_del_comando_no_corta_la_espera) {                // Módem con eco (ATE1) y resultado lento
  readyGateway();
  gprs.overrides.push_back({"AT+SAPBR=1,1", ""});
  gprs.onCommand = [](const std::string& cmd) {
    if (cmd == "AT+SAPBR=1,1") { gprs.feed("AT+SAPBR=1,1\r\r\n", 10); gprs.feed("\r\nOK\r\n", 3000); }
  };
  CHECK(atCmd(F("AT+SAPBR=1,1"), 20000));                      // Espera el OK aunque llegue 3 s después del eco
}

TEST_CASE(httpread_pide_lo_que_cabe_en_el_buffer) {             // P-007
  readyGateway();
  comunicaciones();
  CHECK_EQ(gprs.count("AT+HTTPREAD=0,250"), 1);
}

// D-028: la conexión GPRS no se cierra en ciclos normales ni por un error aislado
TEST_CASE(conexion_gprs_queda_abierta_entre_envios) {          // D-035: como la v1
  readyGateway();
  for (int i = 0; i < 3; i++) comunicaciones();
  CHECK(serverOk);
  CHECK_EQ(gprs.count("AT+SAPBR=1,1"), 1);                     // Se abre una sola vez (configuración)
  CHECK_EQ(gprs.count("AT+SAPBR=0,1"), 1);                     // Solo se cierra al configurar
  CHECK_EQ(gprs.count("ATE0"), 1);
}

TEST_CASE(httpinit_con_error_se_reintenta_sin_reconfigurar) {
  readyGateway();
  comunicaciones();
  gprs.httpInitErrors = 1;                                     // Servicio HTTP quedó abierto
  comunicaciones();
  CHECK(serverOk);
  CHECK_EQ(gprs.count("ATE0"), 1);
}

TEST_CASE(sesion_gprs_vencida_se_recupera_en_el_mismo_ciclo) {   // Log 2026-11-18 01:20
  readyGateway();
  comunicaciones();
  gprs.httpActionStale = 1;                                    // URL aceptada, HTTPACTION sin resultado
  comunicaciones();
  CHECK(serverOk);                                             // Reconfiguración y reintento en el mismo ciclo
  CHECK_EQ(gprs.count("AT+HTTPACTION"), 3);
  CHECK_EQ(commError, 0);
  CHECK_EQ(gprs.count("ATE0"), 2);
  CHECK_EQ(gprs.count("AT+SAPBR=0,1"), 2);
}

TEST_CASE(una_falla_aislada_no_reconfigura_el_gsm) {
  readyGateway();
  comunicaciones();
  gprs.body = "<html>Error</html>";
  comunicaciones();                                            // Falla 1
  gprs.body = "\"5\"0xA1\"0xB2\"0xC3\"";
  comunicaciones();
  CHECK(serverOk);
  CHECK_EQ(gprs.count("ATE0"), 1);
}

TEST_CASE(dos_fallas_seguidas_reconfiguran_el_gsm) {
  readyGateway();
  comunicaciones();
  gprs.body = "<html>Error</html>";
  comunicaciones();                                            // Falla 1
  comunicaciones();                                            // Falla 2
  gprs.body = "\"5\"0xA1\"0xB2\"0xC3\"";
  comunicaciones();                                            // Reconfiguración completa
  CHECK(serverOk);
  CHECK_EQ(gprs.count("ATE0"), 2);
}

// D-029: el monitor indica en qué paso falló la petición HTTP
TEST_CASE(url_rechazada_se_informa) {
  readyGateway();
  gprs.overrides.push_back({"AT+HTTPPARA=\"URL\"", "\r\nERROR\r\n"});
  Serial.out.clear();
  comunicaciones();
  CHECK(contains(Serial.out, "URL rechazada"));
}

TEST_CASE(httpaction_sin_resultado_se_informa) {
  readyGateway();
  gprs.overrides.push_back({"AT+HTTPACTION", "\r\nOK\r\n"});    // Nunca llega +HTTPACTION
  Serial.out.clear();
  comunicaciones();
  CHECK(contains(Serial.out, "sin resultado de HTTPACTION"));
}

TEST_CASE(httpaction_con_error_de_red_se_informa) {
  readyGateway();
  gprs.httpStatus = 601;
  Serial.out.clear();
  comunicaciones();
  CHECK(contains(Serial.out, "HTTP: 601 (error de red)"));
}

// D-030: mensajes espontáneos del módem (antes se descartaban sin mostrarlos)
TEST_CASE(modem_reiniciado_se_detecta_y_se_reconfigura) {
  readyGateway();
  comunicaciones();
  restartGSM = false;
  gprs.feed("\r\nRDY\r\n\r\n+CFUN: 1\r\n\r\nCall Ready\r\n", 1); // El SIM800 se reinició entre ciclos
  mock::now += 10;
  Serial.out.clear();
  comunicaciones();
  CHECK(contains(Serial.out, "Módem reiniciado"));
  CHECK_EQ(gprs.count("ATE0"), 2);                             // Configuración completa al detectarlo
}

TEST_CASE(bajo_voltaje_del_modem_se_informa) {
  readyGateway();
  comunicaciones();
  gprs.feed("\r\nUNDER-VOLTAGE WARNNING\r\n", 1);
  mock::now += 10;
  Serial.out.clear();
  comunicaciones();
  CHECK(contains(Serial.out, "Bajo voltaje"));
}

TEST_CASE(red_cierra_la_conexion_gprs_se_informa) {
  readyGateway();
  comunicaciones();
  gprs.bearerStatus = 3;
  gprs.feed("\r\n+SAPBR 1: DEACT\r\n", 1);
  mock::now += 10;
  Serial.out.clear();
  comunicaciones();
  CHECK(contains(Serial.out, "La red cerró la conexión GPRS"));
  CHECK(serverOk);                                             // Se reabre y el envío funciona
}

// D-032: lo = 1 - k (k = transmisiones confirmadas desde el último dato nuevo); 0 si no hay sensor
TEST_CASE(lo_ejemplo_del_usuario) {
  readyGateway();
  const char* l = "0xA1,0xA2,0xA3,0xA4,0xA5";
  setSensorList(l, l + strlen(l));
  gprs.body = "\"5\"0xA1\"0xA2\"0xA3\"0xA4\"0xA5\"";
  receive(nodeFrame("DTA-SHT-0xA2")); comunicaciones();
  receive(nodeFrame("DTA-SHT-0xA4")); comunicaciones();
  comunicaciones();
  receive(nodeFrame("DTA-SHT-0xA1")); comunicaciones();
  receive(nodeFrame("DTA-SHT-0xA3")); receive(nodeFrame("DTA-SHT-0xA5")); comunicaciones();
  CHECK(contains(gprs.urls.at(4), "&lo=[0,-3,1,-2,1,0,0,0,0,0]"));
}

TEST_CASE(lo_decrece_por_cada_transmision_sin_dato) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xA1"));
  for (int i = 0; i < 4; i++) comunicaciones();
  CHECK(contains(gprs.urls.at(0), "&lo=[1,"));
  CHECK(contains(gprs.urls.at(1), "&lo=[0,"));
  CHECK(contains(gprs.urls.at(2), "&lo=[-1,"));
  CHECK(contains(gprs.urls.at(3), "&lo=[-2,"));
}

TEST_CASE(lo_sensor_registrado_que_nunca_transmite) {
  readyGateway();
  comunicaciones();
  comunicaciones();
  CHECK(contains(gprs.urls.at(0), "&lo=[0,0,0,0,0,0,0,0,0,0]"));
  CHECK(contains(gprs.urls.at(1), "&lo=[-1,-1,-1,0,0,0,0,0,0,0]")); // Posiciones 3-9 sin sensor: 0
}

TEST_CASE(lo_no_decrece_si_el_envio_falla) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xA1"));
  gprs.body = "<html>Error</html>";
  comunicaciones();
  comunicaciones();
  gprs.body = "\"5\"0xA1\"0xB2\"0xC3\"";
  comunicaciones();
  CHECK(contains(gprs.urls.at(2), "&lo=[1,"));                 // El servidor aún no la había recibido
}

TEST_CASE(lo_tiene_un_minimo) {
  readyGateway();
  for (int i = 0; i < 120; i++) comunicaciones();
  CHECK(contains(gprs.urls.back(), "&lo=[-99,-99,-99,0,"));
}

TEST_CASE(lo_sensor_reemplazado_empieza_sin_datos) {
  readyGateway();
  receive(nodeFrame("DTA-SHT-0xB2"));
  comunicaciones();
  gprs.body = "\"5\"0xA1\"0xD4\"0xC3\"";                      // 0xB2 reemplazado por 0xD4
  comunicaciones();
  comunicaciones();
  CHECK(contains(gprs.urls.at(1), "&lo=[-1,0,-1,"));           // 0xB2: mismo dato que la vez anterior
  CHECK(contains(gprs.urls.at(2), "&lo=[-2,0,-2,"));           // 0xD4 (lista nueva): primera transmisión, sin datos
}

TEST_CASE(sin_respuesta_tras_el_reintento_cuenta_como_falla) {
  readyGateway();
  comunicaciones();
  gprs.httpActionStale = 2;                                    // También falla el reintento
  comunicaciones();
  CHECK(!serverOk);
  CHECK_EQ(commError, 1);
  CHECK(restartGSM);                                           // El siguiente ciclo reconfigura
}

// D-034: sin conexión GPRS no se intenta la petición (no hay 30 s de espera inútil)
TEST_CASE(red_cierra_la_conexion_se_reconecta_en_el_mismo_ciclo) {
  readyGateway();
  comunicaciones();
  gprs.bearerStatus = 3;                                       // La red cerró la conexión: HTTPACTION da 601
  comunicaciones();
  CHECK(serverOk);
  CHECK_EQ(gprs.count("AT+SAPBR=1,1"), 2);
}

TEST_CASE(sin_conexion_gprs_no_se_repite_la_peticion) {
  readyGateway();
  comunicaciones();
  int actions = gprs.count("AT+HTTPACTION");
  gprs.bearerStatus = 3;
  gprs.bearerOpenErrors = 10;                                  // La conexión no se puede reabrir
  comunicaciones();
  CHECK(!serverOk);
  CHECK_EQ(gprs.count("AT+HTTPACTION"), actions + 1);          // Solo el intento original (601)
  CHECK_EQ(commError, 1);
  CHECK(restartGSM);
}

TEST_CASE(sin_enganche_gprs_se_reengancha_y_envia) {
  readyGateway();
  comunicaciones();
  gprs.bearerStatus = 3;
  gprs.cgatt = 0;                                              // El módem perdió el enganche a GPRS
  comunicaciones();
  CHECK_EQ(gprs.count("AT+CGATT=1"), 1);
  CHECK(serverOk);
}

TEST_CASE(apertura_fallida_se_reintenta_una_vez) {
  readyGateway();
  comunicaciones();
  gprs.bearerStatus = 3;
  gprs.bearerOpenErrors = 1;
  comunicaciones();
  CHECK(serverOk);
}

TEST_CASE(tras_una_falla_el_siguiente_envio_es_en_1_min) {
  readyGateway();
  cfg.mode = 5;
  serverOk = false;
  scheduleNextTx();
  mock::now += 50000UL;
  CHECK(!isTxTime());
  mock::now += 11000UL;
  CHECK(isTxTime());
  serverOk = true;
  scheduleNextTx();
  mock::now += 61000UL;
  CHECK(!isTxTime());                                          // Con éxito se respeta el modo (5 min)
}
