#!/usr/bin/env bash
# Compila y corre la batería de pruebas. Uso: ./run_tests.sh [filtro]
set -e
cd "$(dirname "$0")"
g++ -std=c++17 -Wall -Wno-unused-function -Werror=format -Wno-sign-compare -I mocks -I . test_main.cpp -o run_tests.out
./run_tests.out "$@"
