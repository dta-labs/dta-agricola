@echo off
rem Compila y corre la bateria de pruebas. Uso: run_tests.bat [filtro]
cd /d "%~dp0"
chcp 65001 > nul
g++ -std=c++17 -Wall -Wno-unused-function -Werror=format -Wno-sign-compare -I mocks -I . test_main.cpp -o run_tests.exe
if errorlevel 1 exit /b 1
run_tests.exe %*
