// Batería de pruebas del nodo DTA_LoRa_SHT_v1.1
// El sketch se compila completo en la PC con las simulaciones de la carpeta mocks/.
#include "framework/minitest.h"

#include "../DTA_LoRa_SHT_v1.1.ino"

#include "helpers.h"

#include "test_setup_loop.cpp"
#include "test_protocolo.cpp"
#include "test_transmision.cpp"
#include "test_memoria.cpp"

int main(int argc, char** argv) {
  return minitest::runAll(argc > 1 ? argv[1] : nullptr);   // Argumento opcional: filtrar por nombre
}
