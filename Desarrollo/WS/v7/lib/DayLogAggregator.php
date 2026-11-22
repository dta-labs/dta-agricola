<?php
declare(strict_types=1);

/**
 * Registros de dayLogs (8 valores por sensor) y resumen diario para logs.
 *
 * dataRaw por sensor: [ms, hr, tmin, tmax, t, etc, hf, vcc]
 * En el registro instantáneo tmin = tmax = t. hr = -1: el sensor no mide HR.
 */
final class DayLogAggregator {
    public const SENSORS = DTA_TOTAL_SENSORS;
    public const VPS = 8;

    /**
     * Expande 4 valores/sensor (ms, hr, t, vcc) a 8 valores/sensor como strings.
     * @param callable(int $sensor, float $t, float $hr): float $etcFn
     */
    public static function expand(array $data, callable $etcFn): array {
        $data = Util::cleanReadings($data);
        $out = [];
        for ($i = 0; $i < self::SENSORS; $i++) {
            $ms  = $data[$i * 4]     ?? NAN;
            $hr  = $data[$i * 4 + 1] ?? NAN;
            $t   = $data[$i * 4 + 2] ?? NAN;
            $vcc = $data[$i * 4 + 3] ?? NAN;
            // ETc en mm/h con 2 decimales (con 1 las tasas nocturnas se redondeaban a 0)
            $etc = (!is_nan($t) && !is_nan($hr)) ? round($etcFn($i, $t, $hr), 2) : NAN;
            $hf  = !is_nan($t) ? Agronomy::chillHours($t) : NAN;
            foreach ([$ms, $hr, $t, $t, $t, $etc, $hf, $vcc] as $v) {
                $out[] = (string) $v;
            }
        }
        return $out;
    }

    /**
     * Resumen del día: promedio de ms/hr/t, mínimo de tmin, máximo de tmax, último vcc;
     * ETc (mm/día) y unidades frío = promedio horario × 24. (v6 sumaba cada registro de 10–30 min
     * como si fuera una hora: 2 a 6 veces de más.) Los registros con longitud distinta se ignoran.
     *
     * Corrección v7: en v6 el máximo arrancaba en PHP_FLOAT_MIN (el positivo
     * más pequeño), así que un día con Tmax bajo cero quedaba como "NaN".
     */
    public static function summarize(array $dayLogs): array {
        if (!$dayLogs) return [];
        $n = self::SENSORS;
        $sum = ['ms' => array_fill(0, $n, 0.0), 'hr' => array_fill(0, $n, 0.0), 't' => array_fill(0, $n, 0.0), 'etc' => array_fill(0, $n, 0.0), 'hf' => array_fill(0, $n, 0.0)];
        $cnt = ['ms' => array_fill(0, $n, 0), 'hr' => array_fill(0, $n, 0), 't' => array_fill(0, $n, 0), 'etc' => array_fill(0, $n, 0), 'hf' => array_fill(0, $n, 0)];
        $tmin = array_fill(0, $n, INF);
        $tmax = array_fill(0, $n, -INF);
        $vcc  = array_fill(0, $n, 0.0);
        $hrNotMeasured = array_fill(0, $n, false);
        $fields = ['ms' => 0, 'hr' => 1, 't' => 4, 'etc' => 5, 'hf' => 6];

        foreach ($dayLogs as $log) {
            $raw = is_object($log) ? ($log->dataRaw ?? null) : ($log['dataRaw'] ?? null);
            $values = is_string($raw) ? json_decode($raw, true) : null;
            if (!is_array($values) || count($values) !== $n * self::VPS) continue;

            for ($i = 0; $i < $n; $i++) {
                $base = $i * self::VPS;
                foreach ($fields as $f => $off) {
                    $v = self::num($values[$base + $off] ?? null, $f === 'etc' ? 2 : 1);
                    if ($f === 'hr' && $v === DTA_HR_NOT_MEASURED) {
                        $hrNotMeasured[$i] = true;   // -1: el sensor no mide HR; no entra al promedio
                        continue;
                    }
                    if ($v !== null) {
                        $sum[$f][$i] += $v;
                        $cnt[$f][$i]++;
                    }
                }
                $v = self::num($values[$base + 2] ?? null);
                if ($v !== null && $v < $tmin[$i]) $tmin[$i] = $v;
                $v = self::num($values[$base + 3] ?? null);
                if ($v !== null && $v > $tmax[$i]) $tmax[$i] = $v;
                $v = self::num($values[$base + 7] ?? null);
                if ($v !== null) $vcc[$i] = $v;
            }
        }

        $out = [];
        for ($i = 0; $i < $n; $i++) {
            $out[] = $cnt['ms'][$i] ? round($sum['ms'][$i] / $cnt['ms'][$i], 1) : 'NaN';
            $out[] = $cnt['hr'][$i] ? round($sum['hr'][$i] / $cnt['hr'][$i], 1) : ($hrNotMeasured[$i] ? DTA_HR_NOT_MEASURED : 'NaN');
            $out[] = is_finite($tmin[$i]) ? $tmin[$i] : 'NaN';
            $out[] = is_finite($tmax[$i]) ? $tmax[$i] : 'NaN';
            $out[] = $cnt['t'][$i] ? round($sum['t'][$i] / $cnt['t'][$i], 1) : 'NaN';
            $out[] = $cnt['etc'][$i] ? round($sum['etc'][$i] / $cnt['etc'][$i] * 24, 1) : 'NaN';
            $out[] = $cnt['hf'][$i] ? round($sum['hf'][$i] / $cnt['hf'][$i] * 24, 1) : 'NaN';
            $out[] = $vcc[$i] ?: 'NaN';
        }
        return $out;
    }

    /** Número redondeado a 1 decimal, o null si no es numérico ("NAN", "NaN", vacío...). */
    private static function num($v, int $decimals = 1): ?float {
        if ($v === 'NaN' || !is_numeric($v)) return null;
        $f = round((float) $v, $decimals);
        return is_nan($f) ? null : $f;
    }
}
