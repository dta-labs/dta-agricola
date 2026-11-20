#pragma region Memoria

#include <EEPROM.h>

// Distribución: [0] marca | [1..] Config | [1 + sizeof(Config)] CRC
#define EE_MAGIC     0xA7                     // 0xA7: Ids como números (v1.261117006)
#define EE_ADDR_MAG  0
#define EE_ADDR_CFG  1
#define EE_ADDR_CRC  (EE_ADDR_CFG + sizeof(Config))

uint8_t configCrc() {
  const uint8_t* p = (const uint8_t*) &cfg;
  uint8_t crc = 0;
  for (uint16_t i = 0; i < sizeof(Config); i++) {
    crc ^= p[i];
    for (uint8_t b = 0; b < 8; b++) crc = (crc & 0x80) ? (crc << 1) ^ 0x07 : crc << 1;
  }
  return crc;
}

void resetConfig() {
  memset(&cfg, 0, sizeof(cfg));
  cfg.mode = DEFAULT_MODE;
}

// Recupera modo y lista de sensores; si no hay datos válidos usa los valores por defecto
bool loadConfig() {
  if (EEPROM.read(EE_ADDR_MAG) == EE_MAGIC) {
    EEPROM.get(EE_ADDR_CFG, cfg);
    if (EEPROM.read(EE_ADDR_CRC) == configCrc() && cfg.count <= MAX_SENSORS) return true;
  }
  resetConfig();
  return false;
}

// EEPROM.put/update solo escriben los bytes que cambiaron
void saveConfig() {
  EEPROM.put(EE_ADDR_CFG, cfg);
  EEPROM.update(EE_ADDR_CRC, configCrc());
  EEPROM.update(EE_ADDR_MAG, EE_MAGIC);
}

#pragma endregion Memoria
