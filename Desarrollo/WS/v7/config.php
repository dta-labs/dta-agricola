<?php
declare(strict_types=1);

/**
 * Configuración central de los Web Services v7 (Sensores / Neveras).
 * Cambia aquí las URLs en lugar de buscarlas dentro de cada servicio.
 */

// Base de datos Firebase (REST)
const DTA_FIREBASE_URL = 'https://dta-agricola.firebaseio.com';

// URL pública donde quedan publicados estos servicios v7
const DTA_WS_V7_URL = 'https://dtaamerica.com/ws/v7';

// Servicios existentes que v7 reutiliza (no se migran en esta versión)
const DTA_ESTACIONES_URL = 'https://dtaamerica.com/ws/estaciones.php';

// Catálogo de estaciones (copia de PWA3 assets/data/estaciones.json)
const DTA_STATIONS_FILE = __DIR__ . '/data/estaciones.json';
const DTA_OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const DTA_OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Clave de OpenWeatherMap (HR del aire cuando la estación local no tiene dato). El repositorio es público:
// la clave va en la variable de entorno OPENWEATHER_API_KEY o en este archivo, fuera de public_html
// (public_html/ws/v7 → carpeta de la cuenta).
define('DTA_OPENWEATHER_KEY_FILE', dirname(__DIR__, 3) . '/openweather.key');

// Carpeta de logs (se crea sola si no existe)
const DTA_LOG_DIR = __DIR__ . '/logs';

// Tiempos máximos de las peticiones HTTP salientes (segundos)
const DTA_HTTP_TIMEOUT         = 15;
const DTA_HTTP_CONNECT_TIMEOUT = 5;

// Datos del gateway
const DTA_TOTAL_SENSORS = 10;

// Estaciones meteorológicas locales (estaciones.php): fuente preferida de HR y
// temperatura cuando falta la lectura de un sensor; Open-Meteo queda de respaldo.
const DTA_USE_STATIONS = true;

// estaciones.php da un registro POR DÍA (tprom = T promedio, hmin = HR mínima del día).
// Se acepta el registro de hoy o de los últimos N días; más viejo se ignora (→ Open-Meteo).
const DTA_STATION_MAX_AGE_DAYS = 1;

// HR que envía un sensor que no tiene cómo medirla: se trata como faltante (promedio del mismo tipo →
// estación → OpenWeatherMap → Open-Meteo). En dayLogs antiguos, un -1 no entra en los promedios.
const DTA_HR_NOT_MEASURED = -1.0;

