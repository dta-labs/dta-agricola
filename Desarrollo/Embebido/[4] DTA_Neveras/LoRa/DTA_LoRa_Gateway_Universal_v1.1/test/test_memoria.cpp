// Especificación: spec/funcionamiento.md, "EEPROM"

TEST_CASE(eeprom_vacia_usa_valores_por_defecto) {
  resetGateway();
  CHECK(!loadConfig());
  CHECK_EQ(cfg.mode, DEFAULT_MODE);
  CHECK_EQ(cfg.count, 0);
}

TEST_CASE(eeprom_guarda_y_recupera_modo_y_lista) {
  readyGateway();
  cfg.mode = 9;
  saveConfig();
  std::memset(&cfg, 0, sizeof cfg);
  CHECK(loadConfig());
  CHECK_EQ(cfg.mode, 9);
  CHECK_EQ(cfg.count, 3);
  CHECK_EQ(idOf(2), "0xC3");
}

TEST_CASE(eeprom_corrupta_se_descarta) {
  readyGateway();
  saveConfig();
  EEPROM.mem[EE_ADDR_CFG + 5] ^= 0x01;
  CHECK(!loadConfig());
  CHECK_EQ(cfg.count, 0);
}

TEST_CASE(eeprom_no_se_reescribe_sin_cambios) {
  readyGateway();
  saveConfig();
  int writes = EEPROM.writes;
  saveConfig();
  comunicaciones();                                            // Servidor responde la misma configuración
  CHECK_EQ(EEPROM.writes, writes);
}

TEST_CASE(arranque_usa_la_configuracion_guardada) {
  readyGateway();
  cfg.mode = 9;
  saveConfig();
  uint8_t saved[sizeof EEPROM.mem];
  std::memcpy(saved, EEPROM.mem, sizeof saved);
  resetGateway();                                              // Reinicio: la EEPROM se conserva
  std::memcpy(EEPROM.mem, saved, sizeof saved);
  gprs.silent = true;                                          // Servidor inalcanzable
  setup();
  CHECK_EQ(cfg.mode, 9);
  CHECK_EQ(cfg.count, 3);
  receive(nodeFrame("DTA-SHT-0xB2"));
  CHECK_EQ((int) LoRa.sent.size(), 1);                         // Ya acepta sensores sin el servidor
}

// D-025: presupuesto de memoria estática (variables globales del sketch)
TEST_CASE(memoria_global_dentro_del_presupuesto) {
  CHECK(sizeof(cfg.ids) <= 80);                                // Ids como números de 64 bits (Config = 83 B en AVR)
  CHECK(sizeof(rxQueue) <= 112);                               // 2 paquetes de 56 bytes
  CHECK(sizeof(dataToSend) <= 160);                            // 10 lecturas de 16 bytes
}

TEST_CASE(respuesta_del_modem_solo_existe_durante_la_comunicacion) {
  readyGateway();
  static char* during = nullptr;
  gprs.onCommand = [](const std::string&) { during = resp; };
  comunicaciones();
  CHECK(during != nullptr);
  CHECK(during != testResp);                                   // Buffer local de comunicaciones()
  CHECK(resp == testResp);                                     // Al terminar, se libera
}

TEST_CASE(ids_se_comparan_sin_importar_mayusculas) {
  readyGateway();
  const char* l = "0xabcdef12";
  setSensorList(l, l + strlen(l));
  CHECK_EQ(idOf(0), "0xABCDEF12");
  CHECK_EQ(getPossition("0xABCDEF12"), 0);
}
