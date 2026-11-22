# Servicio de Sensores DTA Agricola

Este servicio PHP accede a la base de datos Firebase cada 10 minutos, lee todos los registros de la tabla `systems`, extrae las llaves de los sistemas de tipo "Sensor" y realiza llamadas al servicio correspondiente.

## Arquitectura de la Base de Datos

```json
"systems": {
    "20333844254": {...},
    "20333844270": {...},
    "222222222222": {...},
    "24430362948": {...},
    "24530080316": {
        "settings": {
            "key": "24530080316",
            "sensors": {
                "S1": {
                    "id": "20333844254"
                }
            },
            "type": "Sensor"
        }
    }
}
```

## Funcionalidad

1. **Conexión a Firebase**: Accede a `https://dta-agricola.firebaseio.com/systems/`
2. **Filtrado**: Identifica sistemas donde `settings.type === "Sensor"`
3. **Extracción**: Obtiene la `key` desde `settings.key`
4. **Llamada**: Realiza la llamada: `https://dtaamerica.com/ws/sensor_v6.1.php?id=$key&data=[]&rx=Ok&si=26`

## Modos de Ejecución

### 1. Ejecución Única (Prueba)
```bash
php sensor_service.php
```
O usando el script por lotes:
```batch
run_sensor_service.bat
```
Seleccionar opción 1.

### 2. Ejecución Continua (Daemon)
```bash
php sensor_service.php --daemon
```
O usando el script por lotes:
```batch
run_sensor_service.bat
```
Seleccionar opción 2.

### 3. Ejecución Web
Accede via navegador a:
```
http://tu-servidor.com/WS/sensor_service.php
```

## Archivos Generados

- **sensor_service.php**: Servicio principal
- **run_sensor_service.bat**: Script para ejecución en Windows
- **sensor_service.log**: Archivo de log (se crea automáticamente)

## Configuración

### Requisitos
- PHP 7.4 o superior
- Extensión cURL habilitada
- Acceso a internet

### Configuración de PHP
Asegúrate que en `php.ini` esté habilitado:
```ini
extension=curl
allow_url_fopen=On
```

## Programación Automática (Opcional)

### Windows Task Scheduler
1. Abrir "Programador de Tareas"
2. Crear tarea básica
3. Configurar para ejecutarse cada 10 minutos
4. Acción: `php "C:\ruta\al\proyecto\WS\sensor_service.php"`

### Linux Cron
```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar cada 10 minutos
*/10 * * * * /usr/bin/php /ruta/al/proyecto/WS/sensor_service.php
```

## Logs

El servicio genera un archivo `sensor_service.log` con información de:
- Inicio y fin de ejecuciones
- Sistemas procesados
- Errores encontrados
- Resumen de operaciones

Ejemplo de log:
```
[2025-04-06 18:30:00] Iniciando servicio de sensores - 2025-04-06 18:30:00
[2025-04-06 18:30:01] Procesando sistema Sensor: 24530080316 (key: 24530080316)
[2025-04-06 18:30:02] ✓ Llamada exitosa para sistema 24530080316
[2025-04-06 18:30:03] Resumen: 5 sistemas analizados, 1 sensores procesados
[2025-04-06 18:30:03] Servicio finalizado - 2025-04-06 18:30:03
```

## Solución de Problemas

### Error: "PHP no está instalado"
- Instala PHP desde https://www.php.net/downloads.php
- Agrega PHP al PATH del sistema

### Error de conexión cURL
- Verifica conexión a internet
- Confirma que la extensión cURL está habilitada
- Revisa firewalls o proxies

### Error de Firebase
- Verifica la URL de Firebase
- Confirma que la base de datos sea accesible públicamente

## Consideraciones

- El servicio está diseñado para ser robusto y manejar errores gracefully
- Los timeouts están configurados para evitar bloqueos prolongados
- El logging ayuda en el diagnóstico de problemas
- El modo daemon es ideal para producción
- Para pruebas, usa el modo de ejecución única
