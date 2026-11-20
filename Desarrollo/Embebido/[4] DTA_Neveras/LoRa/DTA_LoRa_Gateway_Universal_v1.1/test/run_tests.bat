@echo off
rem Compila y corre la bateria de pruebas. Uso: run_tests.bat [filtro]
cd /d "%~dp0"
chcp 65001 > nul
rem -fpermissive: freeRam() convierte punteros a int (valido en AVR de 16 bits, no en la PC)
g++ -std=c++17 -fpermissive -w -Werror=format -I mocks -I . test_main.cpp -o run_tests.exe
if errorlevel 1 exit /b 1
run_tests.exe %*
