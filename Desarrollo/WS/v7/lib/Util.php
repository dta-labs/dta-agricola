<?php
declare(strict_types=1);

final class Util {
    /**
     * Busca $field en $source; si no está, desciende por el primer elemento
     * (mismo comportamiento que getFieldValue() de v6).
     */
    public static function fieldValue($source, string $field) {
        if (is_array($source)) {
            if (array_key_exists($field, $source)) return $source[$field];
            $first = reset($source);
            return $first !== false ? self::fieldValue($first, $field) : null;
        }
        if (is_object($source)) {
            if (isset($source->{$field})) return $source->{$field};
            $vars = get_object_vars($source);
            $first = reset($vars);
            return $first !== false ? self::fieldValue($first, $field) : null;
        }
        return null;
    }

    /** NaN y -127 (lectura fallida del sensor) ⇒ NaN; el resto se redondea a 1 decimal. */
    public static function cleanReading(float $v): float {
        if (is_nan($v) || $v === -127.0) return NAN;
        return round($v, 1);
    }

    public static function cleanReadings(array $data): array {
        return array_map([self::class, 'cleanReading'], $data);
    }
}
