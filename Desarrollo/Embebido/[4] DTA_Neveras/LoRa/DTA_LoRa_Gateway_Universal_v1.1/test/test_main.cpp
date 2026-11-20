// Batería de pruebas del gateway DTA_LoRa_Gateway_Universal v1.1
// El sketch se compila completo en la PC con las simulaciones de la carpeta mocks/.
#include "framework/minitest.h"

// Ruta del sketch: actualizar si se renombra la carpeta o el .ino
#include "../DTA_LoRa_Gateway_Universal_v1.1.ino"

#include "helpers.h"

#include "test_lora.cpp"
#include "test_sensores.cpp"
#include "test_comunicaciones.cpp"
#include "test_memoria.cpp"
#include "test_wifi.cpp"

int main(int argc, char** argv) {
  return minitest::runAll(argc > 1 ? argv[1] : nullptr);   // Argumento opcional: filtrar por nombre
}
