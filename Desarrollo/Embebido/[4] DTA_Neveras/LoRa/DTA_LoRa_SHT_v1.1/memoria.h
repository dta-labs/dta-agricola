#pragma region Memoria

#include <EEPROM.h>

// Distribución: [0] marca | [1..] NodeConfig | [1 + sizeof(NodeConfig)] CRC
#define EE_MAGIC     0xB7
#define EE_ADDR_MAG  0
#define EE_ADDR_CFG  1
#define EE_ADDR_CRC  (EE_ADDR_CFG + sizeof(NodeConfig))

struct NodeConfig {
  uint32_t serial;                              // Serie del SHT4x: conserva el Id aunque el sensor falle
  uint8_t timer;                                // Minutos entre lecturas indicados por el gateway
};
NodeConfig nodeCfg;

uint8_t nodeCrc() {
  const uint8_t* p = (const uint8_t*) &nodeCfg;
  uint8_t crc = 0;
  for (uint8_t i = 0; i < sizeof(NodeConfig); i++) {
    crc ^= p[i];
    for (uint8_t b = 0; b < 8; b++) crc = (crc & 0x80) ? (crc << 1) ^ 0x07 : crc << 1;
  }
  return crc;
}

bool loadNodeConfig() {
  if (EEPROM.read(EE_ADDR_MAG) == EE_MAGIC) {
    EEPROM.get(EE_ADDR_CFG, nodeCfg);
    if (EEPROM.read(EE_ADDR_CRC) == nodeCrc()) return true;
  }
  nodeCfg.serial = 0;
  nodeCfg.timer = DEFAULT_TIMER;
  return false;
}

// EEPROM.put/update solo escriben los bytes que cambiaron
void saveNodeConfig() {
  EEPROM.put(EE_ADDR_CFG, nodeCfg);
  EEPROM.update(EE_ADDR_CRC, nodeCrc());
  EEPROM.update(EE_ADDR_MAG, EE_MAGIC);
}

#pragma endregion Memoria
