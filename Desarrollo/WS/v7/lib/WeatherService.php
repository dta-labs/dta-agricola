<?php
declare(strict_types=1);

/**
 * Datos meteorológicos de Open-Meteo para la hora actual, con caché por
 * ubicación durante la petición (10 min), y consulta a estaciones.php.
 */
class WeatherService {
    private const HOURLY = 'temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation,surface_pressure,et0_fao_evapotranspiration,precipitation,soil_temperature_54cm,soil_moisture_27_to_81cm';
    private const TZ = 'America/Chihuahua';

    private HttpClient $http;
    private array $cache = [];
    private array $soilTempCache = [];

    public function __construct(?HttpClient $http = null) {
        $this->http = $http ?? new HttpClient();
    }

    private static function key($lat, $lon): string {
        return round((float) $lat, 4) . ',' . round((float) $lon, 4);
    }

    public function current($lat, $lon): ?array {
        if (!is_numeric($lat) || !is_numeric($lon)) return null;

        $key = self::key($lat, $lon);
        if (isset($this->cache[$key]) && (time() - $this->cache[$key]['ts']) < 600) {
            return $this->cache[$key]['data'];
        }

        $url = DTA_OPEN_METEO_URL . '?' . http_build_query([
            'latitude' => $lat,
            'longitude' => $lon,
            'hourly' => self::HOURLY,
            'timezone' => self::TZ,
            'wind_speed_unit' => 'ms',
            'past_days' => 1,
            'forecast_days' => 1,
        ]);
        $res = $this->http->request('GET', $url, null, [], 10);
        $data = $res ? json_decode($res['body'], true) : null;
        if (!is_array($data)) return null;

        $weather = self::pickCurrentHour($data, (new DateTime('now', new DateTimeZone(self::TZ)))->format('Y-m-d\TH:00'));
        if ($weather === null) return null;

        $this->cache[$key] = ['data' => $weather, 'ts' => time()];
        return $weather;
    }

    public static function pickCurrentHour(array $data, string $currentHour): ?array {
        $hourly = $data['hourly'] ?? [];
        $times = $hourly['time'] ?? [];
        $index = array_search($currentHour, $times, true);
        if ($index === false) $index = self::closestIndex($times, $currentHour);
        if ($index === null) return null;

        return [
            'temp'               => $hourly['temperature_2m'][$index] ?? null,
            'humidity'           => $hourly['relative_humidity_2m'][$index] ?? null,
            'windSpeed'          => $hourly['wind_speed_10m'][$index] ?? null,
            'shortwaveRadiation' => $hourly['shortwave_radiation'][$index] ?? null,
            'surfacePressure'    => $hourly['surface_pressure'][$index] ?? null,
            'eto'                => $hourly['et0_fao_evapotranspiration'][$index] ?? null,
            'precipitation'      => $hourly['precipitation'][$index] ?? null,
            'soilTemp'           => $hourly['soil_temperature_54cm'][$index] ?? null,
            'soilMoisture'       => $hourly['soil_moisture_27_to_81cm'][$index] ?? null,
        ];
    }

    private static function closestIndex(array $times, string $target): ?int {
        $best = null;
        $min = PHP_INT_MAX;
        $t = strtotime($target);
        foreach ($times as $i => $time) {
            $diff = abs(strtotime($time) - $t);
            if ($diff < $min) {
                $min = $diff;
                $best = $i;
            }
        }
        return $best;
    }

    /** [humedad relativa, temperatura] del aire (o temperatura de suelo en caché). */
    public function temperatureHumidity($lat, $lon): array {
        $w = $this->current($lat, $lon);
        if ($w) return [$w['humidity'] ?? null, $w['temp'] ?? null];
        $key = self::key($lat, $lon);
        return [null, $this->soilTempCache[$key] ?? null];
    }

    /** Humedad de suelo en % (la API la da en m³/m³). */
    public function soilMoisture($lat, $lon): ?float {
        $w = $this->current($lat, $lon);
        $this->soilTempCache[self::key($lat, $lon)] = is_array($w) ? ($w['soilTemp'] ?? null) : null;
        $sm = $w['soilMoisture'] ?? null;
        if (!is_numeric($sm)) return null;
        $sm = (float) $sm;
        return $sm < 1 ? $sm * 100.0 : $sm;
    }

    private array $stationCache = [];
    private array $owmCache = [];

    /** HR (%) y T (°C) actuales de OpenWeatherMap, o null (sin clave, sin respuesta o sin coordenadas). */
    public function openWeather($lat, $lon): ?array {
        if (!is_numeric($lat) || !is_numeric($lon)) return null;
        $key = self::key($lat, $lon);
        if (array_key_exists($key, $this->owmCache)) return $this->owmCache[$key];
        $apiKey = self::openWeatherKey();
        if ($apiKey === null) {
            error_log('WeatherService: sin clave de OpenWeatherMap (OPENWEATHER_API_KEY o ' . DTA_OPENWEATHER_KEY_FILE . ')');
            return $this->owmCache[$key] = null;
        }
        $res = $this->http->getJson(DTA_OPENWEATHER_URL . '?' . http_build_query([
            'lat' => $lat, 'lon' => $lon, 'units' => 'metric', 'appid' => $apiKey,
        ]), true);
        $hr = $res['main']['humidity'] ?? null;
        $t  = $res['main']['temp'] ?? null;
        return $this->owmCache[$key] = (is_numeric($hr) || is_numeric($t))
            ? ['hr' => is_numeric($hr) ? (float) $hr : null, 't' => is_numeric($t) ? (float) $t : null]
            : null;
    }

    private static function openWeatherKey(): ?string {
        $k = getenv('OPENWEATHER_API_KEY');
        if (!is_string($k) || trim($k) === '') {
            $k = is_readable(DTA_OPENWEATHER_KEY_FILE) ? (string) file_get_contents(DTA_OPENWEATHER_KEY_FILE) : '';
        }
        $k = trim((string) $k);
        return $k === '' ? null : $k;
    }

    /**
     * Último registro diario de una estación local (estaciones.php).
     *
     * estaciones.php recibe fi/ff como aaaa-mm-dd y regresa UN renglón por día (aunque se pida
     * tp=Hora) con fecha aaaa-mm-dd y valores diarios; al final añade "Promedio / Totales",
     * "Maximo" y "Minimo", que se descartan. Sin datos devuelve solo esos tres (tprom "0.00").
     *
     * @param array{region:string, id:string} $station
     * @return array{hr: ?float, t: ?float, fecha: string}|null
     */
    public function stationReading(array $station, DateTime $now): ?array {
        $key = $station['region'] . '|' . $station['id'] . '|' . $now->format('Y-m-d');
        if (array_key_exists($key, $this->stationCache)) return $this->stationCache[$key];

        $from = (clone $now)->modify('-' . DTA_STATION_MAX_AGE_DAYS . ' day')->format('Y-m-d');
        $rows = $this->http->getJson(DTA_ESTACIONES_URL . '?' . http_build_query([
            'fi' => $from, 'ff' => $now->format('Y-m-d'), 'tp' => 'Hora', 're' => $station['region'], 'es' => $station['id'],
        ]), true);

        return $this->stationCache[$key] = is_array($rows) ? self::pickStationRow($rows, $now) : null;
    }

    /** Renglón diario más reciente sin pasarse de hoy y con a lo más DTA_STATION_MAX_AGE_DAYS de antigüedad. */
    public static function pickStationRow(array $rows, DateTime $now): ?array {
        $today = $now->format('Y-m-d');
        $oldest = (clone $now)->modify('-' . DTA_STATION_MAX_AGE_DAYS . ' day')->format('Y-m-d');
        $best = null;
        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $fecha = trim((string) ($row['fecha'] ?? ''));
            if (!self::isIsoDate($fecha) || $fecha > $today || $fecha < $oldest) continue;   // resumen, futuro o viejo
            $hr = self::num($row['hmin'] ?? null);
            $t  = self::num($row['tprom'] ?? null);
            if ($hr === null && $t === null) continue;
            if ($best === null || $fecha >= $best['fecha']) {
                $best = ['hr' => $hr, 't' => $t, 'fecha' => $fecha];
            }
        }
        return $best;
    }

    private static function isIsoDate(string $s): bool {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) !== 1) return false;
        [$y, $m, $d] = array_map('intval', explode('-', $s));
        return checkdate($m, $d, $y);
    }

    private static function num($v): ?float {
        if (is_string($v)) $v = str_replace(',', '.', trim($v));
        return is_numeric($v) ? (float) $v : null;
    }
}
