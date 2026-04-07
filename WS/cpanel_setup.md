# Configuración para cPanel Cron Jobs

## Archivo Principal
Usa `sensor_service_cron.php` que está optimizado para ejecución en cPanel.

## Pasos para Configurar en cPanel

### 1. Subir Archivos
Sube estos archivos a tu hosting cPanel:
- `sensor_service_cron.php`
- Asegúrate que estén en la carpeta `/public_html/WS/` o similar

### 2. Configurar Cron Job en cPanel

1. **Inicia sesión en cPanel**
2. **Busca "Cron Jobs"** (usualmente en la sección "Advanced")
3. **Añade nuevo Cron Job**

#### Configuración Recomendada:

**Opción A: Cada 10 minutos (recomendado)**
```
Minute: */10
Hour: *
Day: *
Month: *
Weekday: *
```

**Opción B: Cada 15 minutos (alternativa)**
```
Minute: */15
Hour: *
Day: *
Month: *
Weekday: *
```

#### Comando a Ejecutar:

**Para PHP 7.4/8.0:**
```bash
/usr/bin/php /home/tu_usuario/public_html/WS/sensor_service_cron.php
```

**Para PHP 8.1+ (si está disponible):**
```bash
/usr/bin/php8.1 /home/tu_usuario/public_html/WS/sensor_service_cron.php
```

**Si no conoces la ruta exacta de PHP:**
```bash
php /home/tu_usuario/public_html/WS/sensor_service_cron.php
```

### 3. Encontrar tu Ruta Correcta

#### Método 1: Usar cPanel File Manager
1. Ve a "File Manager" en cPanel
2. Navega a donde subiste `sensor_service_cron.php`
3. Haz clic derecho → "Copy" → copia la ruta completa

#### Método 2: Crear script de prueba
Crea `test_path.php`:
```php
<?php
echo "PHP Path: " . PHP_BINARY . "\n";
echo "Current Path: " . __DIR__ . "\n";
echo "Full Path: " . __FILE__ . "\n";
?>
```
Accede via navegador: `http://tudominio.com/WS/test_path.php`

### 4. Configurar Email de Notificaciones (Opcional)

En cPanel Cron Jobs:
1. Añade tu email en "Cron Email"
2. Recibirás notificaciones de cada ejecución
3. **Recomendación**: Desactívalo después de verificar que funciona

### 5. Verificar Ejecución

#### Método 1: Revisar Logs
El servicio genera `sensor_service_cron.log` en la misma carpeta.

#### Método 2: Ejecución Manual
Ejecuta en la terminal de cPanel:
```bash
php /home/tu_usuario/public_html/WS/sensor_service_cron.php
```

#### Método 3: Verificar Timestamp
Revisa si el archivo de log se actualiza cada 10 minutos.

## Configuración Adicional

### Limitaciones de cPanel
- **Tiempo máximo**: Generalmente 30-300 segundos por ejecución
- **Memoria**: Limitada por el hosting compartido
- **Concurrentes**: Solo una ejecución a la vez

### Optimizaciones Implementadas
- ✅ Timeout de 5 minutos máximo
- ✅ SSL verify disabled (compatible con cPanel)
- ✅ Rotación automática de logs
- ✅ Manejo robusto de errores
- ✅ Salida amigable para cron

### Si Tienes Problemas

#### Error "Permission Denied"
```bash
# Asegurar permisos correctos (755 para archivos PHP)
chmod 755 /home/tu_usuario/public_html/WS/sensor_service_cron.php
```

#### Error "PHP not found"
Contacta a soporte de tu hosting para la ruta correcta de PHP.

#### Error "Connection timeout"
- Verifica conectividad desde el servidor
- Considera aumentar el timeout en el código

## Monitoreo

### Estadísticas en el Log
El log muestra:
```
=== INICIO EJECUCIÓN CRON - 2025-04-06 18:30:00 ===
Procesando sistema Sensor: 24530080316 (key: 24530080316)
✓ OK: Sistema 24530080316 procesado
RESUMEN: 5 sistemas analizados, 1 procesados, 0 errores
TIEMPO EJECUCIÓN: 2.34 segundos
=== FIN EJECUCIÓN CRON - 2025-04-06 18:30:00 ===
```

### Mantenimiento
- **Revisar logs** semanalmente
- **Limpiar logs antiguos** (el sistema rota automáticamente cada 7 días)
- **Monitorear uso** de recursos del hosting

## Comandos Útiles

### Ver logs recientes:
```bash
tail -f /home/tu_usuario/public_html/WS/sensor_service_cron.log
```

### Ver cron jobs activos:
```bash
crontab -l
```

### Probar ejecución manual:
```bash
/usr/bin/php /home/tu_usuario/public_html/WS/sensor_service_cron.php
```

---

**Nota**: Reemplaza `tu_usuario` con tu nombre de usuario real de cPanel.
