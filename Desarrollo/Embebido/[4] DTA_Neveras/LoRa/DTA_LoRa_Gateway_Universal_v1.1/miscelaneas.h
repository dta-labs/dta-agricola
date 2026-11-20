#pragma region Common

void (*resetSoftware)(void) = 0;

int freeRam() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

// Memoria mínima libre desde el arranque (solo en la placa): al iniciar se marca la RAM libre
// y luego se cuenta cuánta nunca llegó a usar la pila. Es la medida real del margen de memoria.
#if defined(__AVR__)
#define RAM_PAINT 0xC5
extern uint8_t _end;

void paintFreeRam() {                                 // Llamar al inicio de setup()
  uint8_t* p = &_end;
  uint8_t* top = (uint8_t*) SP - 32;
  while (p < top) *p++ = RAM_PAINT;
}

uint16_t minFreeRam() {
  const uint8_t* p = &_end;
  uint16_t n = 0;
  while (*p == RAM_PAINT) { p++; n++; }
  return n;
}
#endif

int calculateSum(const char* str, uint8_t len) {
  int sum = 0;
  for (uint8_t i = 0; i < len; i++) sum += str[i];
  return sum;
}

// ---------- Ids de sensores: texto "0x1A2B" <-> número de 64 bits ----------

// "0x" + 1..16 dígitos hex (mayúsculas o minúsculas). El Id 0 no es válido.
bool parseId(const char* s, uint8_t len, uint64_t& id) {
  if (len < 3 || len > ID_LEN - 1 || s[0] != '0' || toupper(s[1]) != 'X') return false;
  id = 0;
  for (uint8_t i = 2; i < len; i++) {
    char c = toupper(s[i]);
    uint8_t v;
    if (c >= '0' && c <= '9') v = c - '0';
    else if (c >= 'A' && c <= 'F') v = c - 'A' + 10;
    else return false;
    id = (id << 4) | v;
  }
  return id != 0;
}

// Escribe el Id como texto "0x" + hex en mayúsculas sin ceros a la izquierda (out: al menos ID_LEN bytes)
void formatId(uint64_t id, char* out) {
  uint8_t n = 1;                                      // Cantidad de dígitos hex
  for (uint64_t v = id >> 4; v; v >>= 4) n++;
  out[0] = '0';
  out[1] = 'x';
  out[2 + n] = '\0';
  for (uint8_t i = 0; i < n; i++, id >>= 4) {         // Del último dígito al primero
    uint8_t v = id & 0xF;
    out[1 + n - i] = v < 10 ? '0' + v : 'A' + v - 10;
  }
}

bool isHexadecimal(const char* id) {
  uint64_t v;
  return parseId(id, strlen(id), v);
}

// ---------- Esperas que no pierden paquetes LoRa ----------

void idleTasks() {
  if (!gsmSession) loraPoll();                        // Durante la sesión de envío el radio duerme
}

void waitMs(unsigned long ms) {
  unsigned long t0 = millis();
  while (millis() - t0 < ms) idleTasks();
}

#pragma endregion Common
