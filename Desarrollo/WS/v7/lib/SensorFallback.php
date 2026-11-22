<?php
declare(strict_types=1);

/**
 * Completa las lecturas faltantes (NaN) de los sensores SHT/SHT4/WM.
 * Orden de respaldo por valor j del sensor (0 humedad suelo, 1 HR, 2 T, 3 Vcc):
 *   1. Promedio de los demás sensores DEL MISMO TIPO (+ ruido para j<3)
 *   j=3 (Vcc) faltante: siempre 4 V. Tipos: SHT, SHT4, WM, Ms, NPK, NPKML.
 *   Todos los tipos igual: mismo tipo → estación → meteorología. A un WM no se le da la humedad de suelo de
 *   Open-Meteo (% contra cb).
 *   2. j=0: humedad de suelo de Open-Meteo (%)
 *      j=1 (HR): estación local → OpenWeatherMap → Open-Meteo · j=2 (T): estación local → Open-Meteo
 *      (coordenadas del sensor o, si no tiene, del sistema)
 * Mismo algoritmo que updateActualData() de v6, con la estación local ya
 * funcionando (en v6 la llamada a estaciones.php nunca llegaba a salir).
 */
class SensorFallback {
    private const FILLABLE_TYPES = ['SHT', 'SHT4', 'WM', 'Ms', 'NPK', 'NPKML'];
    private const VCC_FILL = 4.0;
    private const VPS = 4;

    private object $settings;
    private WeatherService $weather;
    private LocalClock $clock;
    /** @var callable(float,float,$seed):float */
    private $noise;

    public function __construct(object $settings, WeatherService $weather, LocalClock $clock, ?callable $noise = null) {
        $this->settings = $settings;
        $this->weather = $weather;
        $this->clock = $clock;
        $this->noise = $noise ?? [self::class, 'randomize'];
    }

    public function fill(array $data): array {
        $data = Util::cleanReadings($data);
        $station = DTA_USE_STATIONS ? SensorNetwork::stationFor($this->settings) : null;
        $limit = SystemSettings::sensorCount($this->settings);

        // Secuencial a propósito: los sensores ya completados entran en el promedio de los siguientes.
        for ($i = 0; $i < $limit; $i++) {
            for ($j = 0; $j < self::VPS; $j++) {
                $k = $i * self::VPS + $j;
                $data[$k] = $this->valueOrFallback($data, $i, $j, $station);
            }
        }
        return $data;
    }

    private function valueOrFallback(array $data, int $sensor, int $j, ?array $station): float {
        $k = $sensor * self::VPS + $j;
        $value = $data[$k] ?? NAN;
        if (!is_nan($value)) return $value;

        $cfg = SystemSettings::sensor($this->settings, $sensor);
        if (!in_array($cfg->type ?? null, self::FILLABLE_TYPES, true)) return $value;

        if ($j === 3) return self::VCC_FILL;   // Vcc faltante: siempre 4 V
        $mean = $this->mean($data, $j, (string) $cfg->type);
        if ($j < 3) $mean = $this->noise($mean, $k);
        if (!is_nan($mean)) return $mean;

        [$lat, $lon] = $this->coordinates($sensor);
        $id  = $cfg->id ?? null;

        if ($j === 0) {
            if ($cfg->type === 'WM') return NAN;   // Open-Meteo da humedad de suelo en %, el WM mide cb
            $sm = $this->weather->soilMoisture($lat, $lon);
            return $sm === null ? NAN : $this->noise($sm, $id);
        }

        if ($station !== null) {
            $reading = $this->weather->stationReading($station, $this->clock->now());
            $v = $reading[$j === 1 ? 'hr' : 't'] ?? null;
            if ($v !== null) return $this->noise((float) $v, $id);
        }
        if ($j === 1) {                                      // HR: OpenWeatherMap → Open-Meteo
            $owm = $this->weather->openWeather($lat, $lon);
            if ($owm !== null && $owm['hr'] !== null) return $this->noise($owm['hr'], $id);
        }
        $th = $this->weather->temperatureHumidity($lat, $lon);
        $v = $th[$j === 1 ? 0 : 1] ?? null;
        return is_numeric($v) ? $this->noise((float) $v, $id) : NAN;
    }

    /**
     * HR del aire en el sitio del sensor (estación local → Open-Meteo), sin ruido.
     * Se usa cuando el sensor no mide HR (envía -1).
     */
    public function ambientHumidity(int $sensor): float {
        $station = DTA_USE_STATIONS ? SensorNetwork::stationFor($this->settings) : null;
        if ($station !== null) {
            $hr = $this->weather->stationReading($station, $this->clock->now())['hr'] ?? null;
            if ($hr !== null) return (float) $hr;
        }
        [$lat, $lon] = $this->coordinates($sensor);
        $owm = $this->weather->openWeather($lat, $lon);
        if ($owm !== null && $owm['hr'] !== null) return $owm['hr'];
        $hr = $this->weather->temperatureHumidity($lat, $lon)[0] ?? null;
        return is_numeric($hr) ? (float) $hr : NAN;
    }

    /**
     * Coordenadas del sensor si son válidas; si no (faltan o 0,0 del modo descubrimiento), las del sistema.
     * @return array{0: ?float, 1: ?float}
     */
    public function coordinates(int $sensor): array {
        $cfg = SystemSettings::sensor($this->settings, $sensor);
        foreach ([$cfg, $this->settings] as $o) {
            $lat = $o->latitude ?? null;
            $lon = $o->longitude ?? null;
            if (is_numeric($lat) && is_numeric($lon) && abs((float) $lat) <= 90 && abs((float) $lon) <= 180
                && !((float) $lat == 0.0 && (float) $lon == 0.0)) {
                return [(float) $lat, (float) $lon];
            }
        }
        return [null, null];
    }

    /**
     * Promedio del valor j entre los sensores del MISMO TIPO. No se mezclan tipos ni magnitudes:
     * el tipo dicta la unidad (SHT/SHT4 en %, WM en cb; PSI es presión de agua).
     */
    private function mean(array $data, int $j, string $type): float {
        $sum = 0.0;
        $n = 0;
        $limit = SystemSettings::sensorCount($this->settings);
        for ($s = 0; $s < $limit; $s++) {
            if ((SystemSettings::sensor($this->settings, $s)->type ?? null) !== $type) continue;
            $v = $data[$s * self::VPS + $j] ?? NAN;
            if (!is_nan($v) && !($j === 1 && $v === DTA_HR_NOT_MEASURED)) {
                $sum += $v;
                $n++;
            }
        }
        return $n > 0 ? $sum / $n : NAN;
    }

    private function noise(float $value, $seed): float {
        return ($this->noise)($value, 1.0, $seed);
    }

    /** Valor uniforme en [a-δ, a+δ] más ruido gaussiano σ=0.3, redondeado a 1 decimal (v6: getRndValue). */
    public static function randomize(float $a, float $delta, $seed = null): float {
        if (is_nan($a)) return NAN;
        if ($seed !== null) {
            mt_srand(intval(is_int($seed) ? $seed : (string) $seed, 16) + (int) (microtime(true) * 1000));
        }
        $uniform = ($a - $delta) + (mt_rand() / mt_getrandmax()) * (2 * $delta);
        $u1 = max(mt_rand() / mt_getrandmax(), PHP_FLOAT_EPSILON);
        $u2 = mt_rand() / mt_getrandmax();
        $gauss = sqrt(-2 * log($u1)) * cos(2 * M_PI * $u2);
        return round($uniform + $gauss * 0.3, 1);
    }
}
