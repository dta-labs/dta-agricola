<?php
declare(strict_types=1);

/**
 * Settings de un sistema (systems/{id}/settings) con los valores por
 * defecto que usaba v6 cuando Firebase no responde.
 */
class SystemSettings {
    public static function load(FirebaseClient $db, string $id, bool $withDefaults = true): ?object {
        $settings = $db->get("systems/$id/settings");
        if (!is_object($settings)) {
            return $withDefaults ? self::defaults() : null;
        }
        return $settings;
    }

    public static function defaults(): object {
        $sensors = (object) ['sensorNumber' => 10];
        for ($i = 0; $i < 10; $i++) {
            $sensors->{"S$i"} = (object) ['id' => sprintf('0x%02d', $i + 1)];
        }
        return (object) [
            'zona'          => 0,
            'summerHour'    => 0,
            'operationMode' => 1,
            'sensors'       => $sensors,
        ];
    }

    public static function localZone(?object $settings): int {
        return intval($settings->zona ?? 0) + intval($settings->summerHour ?? 0);
    }

    public static function clock(?object $settings): LocalClock {
        return new LocalClock(self::localZone($settings));
    }

    public static function sensorCount(?object $settings): int {
        return (int) ($settings->sensors->sensorNumber ?? 0);
    }

    public static function sensor(?object $settings, int $i): ?object {
        $s = $settings->sensors->{"S$i"} ?? null;
        return is_object($s) ? $s : null;
    }

    public static function isDiscoveryMode(?object $settings): bool {
        return isset($settings->operationMode) && (string) $settings->operationMode === '0';
    }
}
