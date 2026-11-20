#!/usr/bin/env bash
# Compila y corre la batería de pruebas. Uso: ./run_tests.sh [filtro]
set -e
cd "$(dirname "$0")"
# -fpermissive: freeRam() convierte punteros a int (válido en AVR de 16 bits, no en la PC)
g++ -std=c++17 -fpermissive -w -Werror=format -I mocks -I . test_main.cpp -o run_tests.out
./run_tests.out "$@"
