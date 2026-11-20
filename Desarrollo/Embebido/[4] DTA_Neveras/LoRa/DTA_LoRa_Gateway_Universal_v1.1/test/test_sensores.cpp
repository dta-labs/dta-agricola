// Especificación: spec/funcionamiento.md, "Lista de sensores"

TEST_CASE(lista_se_carga_ignorando_espacios_e_ids_invalidos) {
  resetGateway();
  const char* l = " 0xA1, 0xB2 ,0x0123456789ABCDEF0123,0xC3";
  setSensorList(l, l + strlen(l));
  CHECK_EQ(cfg.count, 3);
  CHECK_EQ(idOf(0), "0xA1");
  CHECK_EQ(idOf(1), "0xB2");
  CHECK_EQ(idOf(2), "0xC3");
}

TEST_CASE(lista_se_limita_a_10) {
  resetGateway();
  std::string l;
  for (int i = 0; i < 12; i++) l += "0xA" + std::to_string(i) + ",";
  setSensorList(l.c_str(), l.c_str() + l.size());
  CHECK_EQ(cfg.count, MAX_SENSORS);
}

static void prepData() {
  readyGateway();
  std::strcpy(dataToSend[0], "1,1.0,3.3");
  std::strcpy(dataToSend[1], "2,2.0,3.3");
  std::strcpy(dataToSend[2], "3,3.0,3.3");
}

TEST_CASE(respuesta_reemplaza_la_lista_completa) {
  prepData();
  CHECK(applyBody("7,0xD4,0xE5"));
  CHECK_EQ(cfg.mode, 7);
  CHECK_EQ(cfg.count, 2);
  CHECK_EQ(idOf(0), "0xD4");
}

TEST_CASE(lista_igual_conserva_lecturas_pendientes) {
  prepData();
  CHECK(applyBody("5,0xA1,0xb2,0xC3"));
  CHECK(dataToSend[0][0] && dataToSend[1][0] && dataToSend[2][0]);
}

TEST_CASE(cambio_de_sensor_borra_solo_su_posicion) {                    // Corrección v1.1
  prepData();
  CHECK(applyBody("5,0xA1,0xD4,0xC3"));
  CHECK(dataToSend[0][0]);
  CHECK(!dataToSend[1][0]);
  CHECK(dataToSend[2][0]);
}

TEST_CASE(sensor_eliminado_borra_su_posicion) {
  prepData();
  CHECK(applyBody("5,0xA1,0xB2"));
  CHECK(dataToSend[0][0] && dataToSend[1][0]);
  CHECK(!dataToSend[2][0]);
}

TEST_CASE(sensores_recorridos_borran_las_posiciones_que_cambian) {
  prepData();
  CHECK(applyBody("5,0xB2,0xC3"));
  CHECK(!dataToSend[0][0] && !dataToSend[1][0] && !dataToSend[2][0]);
}

TEST_CASE(lista_vacia_borra_todo) {
  prepData();
  CHECK(applyBody("5"));
  CHECK_EQ(cfg.count, 0);
  CHECK(!dataToSend[0][0] && !dataToSend[1][0] && !dataToSend[2][0]);
}

TEST_CASE(salir_de_descubrimiento_borra_todas_las_lecturas) {
  prepData();
  cfg.mode = 0;
  CHECK(applyBody("5,0xA1,0xB2,0xC3"));
  CHECK(!dataToSend[0][0] && !dataToSend[1][0] && !dataToSend[2][0]);
}

TEST_CASE(respuesta_truncada_no_cambia_la_lista) {
  prepData();
  std::strcpy(resp, "\r\n+HTTPREAD: 40\r\n\"7\"0xD4\"0xE");     // Sin comilla de cierre
  bool fe = false;
  CHECK(!applyServerResponse(fe));
  CHECK(fe);
  CHECK_EQ(cfg.count, 3);
  CHECK_EQ(cfg.mode, 5);
}

// Formato real de sensor_v6.php: las comillas separan los campos -> "5"0xA1"0xB2"
TEST_CASE(respuesta_real_del_servidor_separada_por_comillas) {
  readyGateway();
  CHECK(applyBody("7\"0xD4\"0xE5\"0x289585BD00000051"));
  CHECK_EQ(cfg.mode, 7);
  CHECK_EQ(cfg.count, 3);
  CHECK_EQ(idOf(0), "0xD4");
  CHECK_EQ(idOf(2), "0x289585BD00000051");
}

TEST_CASE(respuesta_real_sin_sensores) {
  readyGateway();
  CHECK(applyBody("5"));
  CHECK_EQ(cfg.mode, 5);
  CHECK_EQ(cfg.count, 0);
}

TEST_CASE(respuesta_real_conserva_lecturas_de_sensores_que_no_cambian) {
  prepData();
  CHECK(applyBody("5\"0xA1\"0xD4\"0xC3"));
  CHECK(dataToSend[0][0]);
  CHECK(!dataToSend[1][0]);
  CHECK(dataToSend[2][0]);
}

// La configuración se acepta aunque el servidor agregue bytes antes o después (D-021)
static void applyRaw(const std::string& r) {
  readyGateway();
  cfg.mode = 0;
  std::strncpy(resp, r.c_str(), RESP_SIZE - 1);
  resp[RESP_SIZE - 1] = '\0';
}
static const std::string REAL_BODY = "\"5\"0x10B9CD49\"0x10B9CE4A\"0xF46A2A5\"0xF46A367\"0x10B9CD9C\"";

TEST_CASE(respuesta_real_del_servidor_del_17_nov) {
  applyRaw("\r\n+HTTPREAD: 56\r\n" + REAL_BODY + "\r\nOK\r\n");
  bool fe; CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.mode, 5);
  CHECK_EQ(cfg.count, 5);
  CHECK_EQ(idOf(4), "0x10B9CD9C");
}

TEST_CASE(respuesta_con_bom_se_acepta) {
  applyRaw("\r\n+HTTPREAD: 59\r\n\xEF\xBB\xBF" + REAL_BODY + "\r\nOK\r\n");
  bool fe; CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.mode, 5);
  CHECK_EQ(cfg.count, 5);
}

TEST_CASE(respuesta_con_salto_de_linea_o_espacio_se_acepta) {
  applyRaw("\r\n+HTTPREAD: 57\r\n" + REAL_BODY + "\n\r\nOK\r\n");
  bool fe; CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.mode, 5);
  applyRaw("\r\n+HTTPREAD: 57\r\n " + REAL_BODY + "\r\nOK\r\n");
  CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.mode, 5);
}

TEST_CASE(respuesta_con_aviso_de_php_despues_se_acepta) {
  applyRaw("\r\n+HTTPREAD: 160\r\n" + REAL_BODY +
           "<br />\n<b>Warning</b>:  Undefined property: stdClass::$type in /home/ws/sensor_v6.php on line 133<br />\r\nOK\r\n");
  bool fe; CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.mode, 5);
  CHECK_EQ(cfg.count, 5);
}

TEST_CASE(respuesta_sin_configuracion_se_rechaza) {
  applyRaw("\r\n+HTTPREAD: 20\r\n<html>Error 500</html>\r\nOK\r\n");
  bool fe; CHECK(!applyServerResponse(fe));
  CHECK(fe);
  CHECK_EQ(cfg.mode, 0);
}

// Tramas reales del servidor (2026-11-17): peor caso = modo de 3 dígitos y 10 Ids de 16 dígitos (D-026)
static const std::string BODY_MAX = "\"144\"0x28F1D193000000A1\"0x28F1D193000000A2\"0x28F1D193000000A3\"0x28F1D193000000A4\"0x28F1D193000000A5\"0x28F1D193000000A6\"0x28F1D193000000A7\"0x28F1D193000000A8\"0x28F1D193000000A9\"0x28F1D193000000AA\"";

TEST_CASE(trama_maxima_10_ids_de_16_digitos) {
  applyRaw("\r\n+HTTPREAD: 195\r\n" + BODY_MAX + "\r\nOK\r\n");
  bool fe; CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.mode, 144);
  CHECK_EQ(cfg.count, 10);
  CHECK_EQ(idOf(0), "0x28F1D193000000A1");
  CHECK_EQ(idOf(9), "0x28F1D193000000AA");
}

TEST_CASE(trama_maxima_con_eco_del_modem) {                     // El SIM800 reiniciado vuelve a tener eco
  applyRaw("AT+HTTPREAD=0,220\r\r\n\r\n+HTTPREAD: 195\r\n" + BODY_MAX + "\r\nOK\r\n");
  bool fe; CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.mode, 144);
  CHECK_EQ(cfg.count, 10);
}

TEST_CASE(trama_maxima_con_bom_y_aviso_de_php) {                 // Respuesta mayor que el buffer: la configuración va primero
  applyRaw("AT+HTTPREAD=0,220\r\r\n\r\n+HTTPREAD: 220\r\n\xEF\xBB\xBF" + BODY_MAX + "<br />\n<b>Warning</b>:  Undefined property");
  bool fe; CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.count, 10);
}

TEST_CASE(trama_modo_descubrimiento_con_un_sensor) {
  applyRaw("\r\n+HTTPREAD: 14\r\n\"0\"0x10B9CD49\"\r\nOK\r\n");
  bool fe; CHECK(applyServerResponse(fe));
  CHECK_EQ(cfg.mode, 0);
  CHECK_EQ(cfg.count, 1);
  CHECK_EQ(idOf(0), "0x10B9CD49");
}

TEST_CASE(httpread_alcanza_para_la_trama_maxima_con_bom) {
  CHECK(std::string(HTTPREAD_CMD) == "AT+HTTPREAD=0,250");
  CHECK(RESP_SIZE >= 300);                                      // Reserva pedida (D-027)
  CHECK(RESP_SIZE >= 20 + 18 + 250 + 6 + 1);                    // Eco + encabezado + lectura + OK                    // Eco + encabezado + BOM + configuración + fin de texto
}
