// Especificación: spec/funcionamiento.md, "EEPROM"

TEST_CASE(eeprom_vacia_carga_valores_por_defecto) {
  resetNode();
  CHECK(!loadNodeConfig());
  CHECK_EQ(nodeCfg.serial, 0u);
  CHECK_EQ(nodeCfg.timer, DEFAULT_TIMER);
}

TEST_CASE(eeprom_guarda_y_recupera_configuracion) {
  resetNode();
  nodeCfg.serial = 0xCAFE1234;
  nodeCfg.timer = 15;
  saveNodeConfig();
  nodeCfg.serial = 0;
  nodeCfg.timer = 0;
  CHECK(loadNodeConfig());
  CHECK_EQ(nodeCfg.serial, 0xCAFE1234u);
  CHECK_EQ(nodeCfg.timer, 15);
  CHECK_EQ(EEPROM.read(EE_ADDR_MAG), EE_MAGIC);
}

TEST_CASE(eeprom_corrupta_se_descarta) {
  resetNode();
  nodeCfg.serial = 0xCAFE1234;
  saveNodeConfig();
  EEPROM.mem[EE_ADDR_CFG] ^= 0x01;                            // Un bit alterado
  CHECK(!loadNodeConfig());
  CHECK_EQ(nodeCfg.serial, 0u);
}

TEST_CASE(eeprom_no_reescribe_si_no_hay_cambios) {
  resetNode();
  nodeCfg.serial = 0xCAFE1234;
  saveNodeConfig();
  int writes = EEPROM.writes;
  saveNodeConfig();
  CHECK_EQ(EEPROM.writes, writes);
}

TEST_CASE(eeprom_no_se_escribe_en_ciclos_normales) {
  startNode();
  loop();
  int writes = EEPROM.writes;
  for (int i = 0; i < 10; i++) { sht4.t += 1; loop(); }       // Transmisiones con la misma frecuencia
  CHECK_EQ(EEPROM.writes, writes);
}
