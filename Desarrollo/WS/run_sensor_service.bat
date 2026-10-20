@echo off
echo Servicio de Sensores DTA Agricola
echo ================================
echo.

REM Verificar si PHP está disponible
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: PHP no está instalado o no está en el PATH
    echo Por favor, instale PHP y asegúrese de que esté accesible desde la línea de comandos
    pause
    exit /b 1
)

echo PHP detectado:
php --version | findstr "PHP"
echo.

REM Mostrar opciones
echo Seleccione el modo de ejecución:
echo 1. Ejecutar una vez (modo prueba)
echo 2. Ejecutar continuamente cada 10 minutos (modo daemon)
echo 3. Salir
echo.

set /p choice="Ingrese su opción (1-3): "

if "%choice%"=="1" (
    echo.
    echo Ejecutando servicio una vez...
    echo ----------------------------------------
    php sensor_service.php
    echo.
    echo Ejecución finalizada.
    pause
) else if "%choice%"=="2" (
    echo.
    echo Iniciando servicio en modo daemon...
    echo ----------------------------------------
    echo El servicio se ejecutará continuamente cada 10 minutos.
    echo Presione Ctrl+C para detener el servicio.
    echo.
    php sensor_service.php --daemon
) else if "%choice%"=="3" (
    echo Saliendo...
    exit /b 0
) else (
    echo Opción no válida. Por favor, ejecute el script nuevamente.
    pause
)
