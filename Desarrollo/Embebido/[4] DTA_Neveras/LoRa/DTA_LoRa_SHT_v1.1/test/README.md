# Batería de pruebas — Nodo DTA_LoRa_SHT_v1.1

Pruebas unitarias que corren en la PC (no en el Arduino). El sketch se compila completo con
g++ y el hardware se reemplaza por simulaciones (`mocks/`): sensor SHT4x, radio LoRa,
EEPROM, LowPower, watchdog, ADC y puerto serie.

## Cómo correrlas

**Windows** (requiere g++, por ejemplo de [MSYS2](https://www.msys2.org/) o [WinLibs](https://winlibs.com/)):

```
cd test
run_tests.bat
```

**Linux / macOS / WSL:**

```
cd test
./run_tests.sh
```

Para correr solo algunas pruebas, pasa parte del nombre: `run_tests.bat trama` o `./run_tests.sh loop_`.

El resultado muestra ✔ o ✘ por prueba y el total al final. Si alguna falla, el programa
termina con código 1 (útil para automatizar).

## Estructura

| Ruta | Contenido |
|---|---|
| `test_main.cpp` | Punto de entrada: incluye el sketch, las utilidades y los archivos de prueba |
| `test_setup_loop.cpp` | `setup()` y `loop()` — spec/funciones.md §1–2 |
| `test_protocolo.cpp` | Tramas, checksum, confirmación, frecuencia — spec/protocolo.md |
| `test_transmision.cpp` | Criterios de transmisión — spec/funcionamiento.md |
| `test_memoria.cpp` | EEPROM — spec/funcionamiento.md |
| `helpers.h` | `resetNode()`, gateway simulado (`gatewayResponds`, `gatewaySilent`), utilidades |
| `framework/minitest.h` | Mini framework de pruebas (`TEST_CASE`, `CHECK`, `CHECK_EQ`, `CHECK_NEAR`) |
| `mocks/` | Simulaciones de Arduino y librerías |
| `hardware/` | Pruebas que se cargan en la placa (watchdog) — ver [hardware/README.md](hardware/README.md) |

## Flujo de trabajo (TDD)

1. Escribir o ajustar la especificación en `spec/`.
2. Escribir la prueba que verifica esa especificación y comprobar que **falla**.
3. Cambiar el código del sketch hasta que la prueba pase.
4. Correr toda la batería: ninguna prueba anterior debe romperse.

## Escribir una prueba

```cpp
TEST_CASE(nombre_descriptivo_en_minusculas) {
  startNode();            // Nodo recién encendido y gateway que confirma
  sht4.t = 2.6;           // Lo que "medirá" el sensor
  loop();
  CHECK(criticalSent);
  CHECK_EQ(TIMER, 5);
}
```

Controles disponibles en las simulaciones:

| Objeto | Campos útiles |
|---|---|
| `sht4` | `present`, `readOk`, `serial`, `t`, `h` |
| `LoRa` | `beginOk`, `sent` (tramas enviadas), `rx` (paquetes por recibir), `sleeping` |
| `EEPROM` | `mem[]`, `writes` |
| `LowPower` | `sleptMs` (tiempo dormido en powerDown) |
| `mock::` | `now` (millis), `events` (orden de llamadas), `wdtEnabled`, `adcValue` |

## Mantenimiento

- Si se agrega una variable global al sketch, agregarla en `resetNode()` (`helpers.h`).
- Si el sketch usa una función nueva de Arduino o de una librería, agregarla en `mocks/`.

## Limitaciones

- En la PC `int` es de 32 bits y `long` de 64; en el ATmega328 son de 16 y 32. Los desbordamientos
  de enteros no se reproducen igual.
- No se prueban tiempos reales, consumo, alcance de radio ni el sensor físico: eso requiere
  pruebas en la placa.
