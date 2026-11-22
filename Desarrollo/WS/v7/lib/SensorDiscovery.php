<?php
declare(strict_types=1);

/**
 * Modo descubrimiento (operationMode = "0"): el gateway manda los Id
 * de los sensores ("[0x1A2B,0x3C4D,...]") y se guardan en settings.
 */
final class SensorDiscovery {
    /** Tokens crudos del parámetro data. */
    public static function tokens(string $raw): array {
        $raw = trim(trim($raw), '[]');
        return $raw === '' ? [] : array_map('trim', explode(',', $raw));
    }

    private static function isId(string $t): bool {
        return strpos($t, '0x') === 0;
    }

    /**
     * Sistemas "Sensor": actualiza el id de S0..Sn conservando lat/lon/type.
     * Si algún token no es un Id, no cambia nada.
     * Devuelve los settings actualizados o null si no hay que guardar.
     *
     * Corrección v7: v6 recibía aquí los datos ya convertidos a números,
     * por lo que este modo terminaba en error fatal y nunca guardaba.
     */
    public static function applySensor(object $settings, array $tokens): ?object {
        if (!$tokens) return null;
        foreach ($tokens as $t) {
            if (!self::isId($t)) return null;
        }
        if (!isset($settings->sensors) || !is_object($settings->sensors)) {
            $settings->sensors = new stdClass();
        }
        foreach ($tokens as $i => $t) {
            $s = $settings->sensors->{"S$i"} ?? null;
            if (!is_object($s)) $s = new stdClass();
            $s->id = $t;
            $s->latitude = $s->latitude ?? 0.0;
            $s->longitude = $s->longitude ?? 0.0;
            $s->type = $s->type ?? 'SHT4';
            $settings->sensors->{"S$i"} = $s;
        }
        $settings->sensors->sensorNumber = count($tokens);
        return $settings;
    }

    /**
     * Sistemas "Nevera": reemplaza la lista de sensores por los Id recibidos
     * (posición original, alias = id). Mismo comportamiento que v6.
     */
    public static function applyNevera(object $settings, array $tokens): object {
        $sensors = new stdClass();
        $valid = 0;
        foreach ($tokens as $i => $t) {
            if (self::isId($t)) {
                $sensors->{"S$i"} = (object) ['id' => $t, 'alias' => $t];
                $valid++;
            }
        }
        $sensors->sensorNumber = $valid;
        $settings->sensors = $sensors;
        return $settings;
    }
}
