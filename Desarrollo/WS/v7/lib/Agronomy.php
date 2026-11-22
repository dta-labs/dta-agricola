<?php
declare(strict_types=1);

/**
 * Cálculos agronómicos: ETc (ETo × Kc) y horas frío.
 * Fórmulas idénticas a updateSensorDB v6.
 */
final class Agronomy {
    private const KC_FIELDS = ['cropCoefficient', 'kc', 'Kc', 'cultivoKc', 'coeficienteCultivo'];

    /** ETc en mm/h (sin redondear) con la mejor fuente: ETo horario de Open-Meteo → Penman-Monteith → aproximación. */
    public static function etc(float $temp, float $hr, ?array $weather, $sensorSettings, $systemSettings): float {
        $kc = self::cropCoefficient($sensorSettings, $systemSettings);

        $apiEto = $weather['eto'] ?? null;
        if (is_numeric($apiEto)) {
            return max(0, (float) $apiEto * $kc);
        }

        $wind = $weather['windSpeed'] ?? null;
        $rad  = $weather['shortwaveRadiation'] ?? null;
        $pres = $weather['surfacePressure'] ?? null;
        if (is_numeric($wind) && is_numeric($rad) && is_numeric($pres)) {
            $eto = self::etoPenmanMonteith($temp, $hr, (float) $wind, (float) $rad, (float) $pres);
            return max(0, $eto * $kc);
        }

        $hrDecimal = max(0, min(1, $hr / 100));
        $fallback = 0.408 * (0.408 * exp(0.051 * $temp)) * (0.05 * $temp) * (1 - $hrDecimal);
        return max(0, $fallback * $kc);
    }

    public static function etoPenmanMonteith(float $temp, float $hr, float $windSpeed, float $shortwaveRadiation, float $surfacePressure): float {
        $es = 0.6108 * exp((17.27 * $temp) / ($temp + 237.3));
        $ea = $es * max(0, min(1, $hr / 100));
        $delta = (4098 * $es) / pow($temp + 237.3, 2);
        $pressureKpa = $surfacePressure > 20 ? $surfacePressure / 10 : $surfacePressure;
        $gamma = 0.000665 * $pressureKpa;
        $u2 = max(0.1, $windSpeed);
        $rn = 0.77 * (max(0, $shortwaveRadiation) * 0.0036);
        $num = (0.408 * $delta * $rn) + ($gamma * (37 / ($temp + 273)) * $u2 * max(0, $es - $ea));
        $den = $delta + ($gamma * (1 + 0.34 * $u2));
        return $den <= 0 ? 0.0 : $num / $den;
    }

    /** Kc: primero en el sensor, luego en el sistema; 1.0 si no hay. */
    public static function cropCoefficient($sensorSettings, $systemSettings): float {
        foreach (self::KC_FIELDS as $field) {
            $v = Util::fieldValue($sensorSettings, $field);
            if (is_numeric($v)) return max(0, (float) $v);
            $v = Util::fieldValue($systemSettings, $field);
            if (is_numeric($v)) return max(0, (float) $v);
        }
        return 1.0;
    }

    /**
     * Unidades frío por hora, modelo Utah (Richardson, 1974):
     *   < 1.5 °C: 0 · 1.5–2.4: 0.5 · 2.5–9.1: 1 · 9.2–12.4: 0.5 · 12.5–15.9: 0 · 16.0–18.0: −0.5 · > 18.0: −1
     */
    public static function chillHours(float $temp): float {
        if ($temp < 1.5) return 0.0;
        if ($temp < 2.5) return 0.5;
        if ($temp < 9.2) return 1.0;
        if ($temp < 12.5) return 0.5;
        if ($temp < 16.0) return 0.0;
        if ($temp <= 18.0) return -0.5;
        return -1.0;
    }
}
