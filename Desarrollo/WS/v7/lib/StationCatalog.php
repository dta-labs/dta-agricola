<?php
declare(strict_types=1);

/**
 * Catálogo de estaciones meteorológicas locales: [{ id, name, region }].
 * Fuente: Firebase /stations (una lectura por petición, solo si se necesita);
 * respaldo: data/estaciones.json (copia del de PWA3).
 */
final class StationCatalog {
    private static ?array $byId = null;
    private static ?FirebaseClient $db = null;

    /** Los endpoints pasan su cliente; sin cliente (pruebas) solo se usa el JSON. */
    public static function setFirebase(?FirebaseClient $db): void {
        self::$db = $db;
        self::$byId = null;
    }

    public static function find(string $id): ?array {
        return self::all()[$id] ?? null;
    }

    /** @return array<string, array{id:string, name:string, region:string}> */
    public static function all(): array {
        if (self::$byId !== null) return self::$byId;

        $list = [];
        if (self::$db !== null) {
            $list = self::fromFirebase(self::$db->get('stations'));
            if (!$list) error_log('StationCatalog: /stations vacío, ilegible o con formato no reconocido; se usa ' . DTA_STATIONS_FILE);
        }
        if (!$list) {
            $json = @file_get_contents(DTA_STATIONS_FILE);
            $list = self::fromFirebase($json === false ? null : json_decode($json));
        }

        self::$byId = [];
        foreach ($list as $e) self::$byId[$e['id']] = $e;
        return self::$byId;
    }

    /**
     * Convierte el nodo /stations en [{ id, name, region }] (misma regla que PWA3 estaciones.desdeFirebase):
     *   - lista u objeto de { id, name, region } (o estacion/nombre en lugar de name)
     *   - agrupado por región: { "NAMIQUIPA": { "_osm": "Óscar…" } }, con objetos o con listas;
     *     la región no empieza con "_" y el id de estación sí, salvo que traiga "id".
     */
    public static function fromFirebase($value): array {
        $out = [];
        $seen = [];
        $add = function ($id, $name, $region) use (&$out, &$seen): void {
            $id = self::text($id);
            $region = self::text($region);
            if ($id === '' || $region === '' || isset($seen[$id])) return;
            $seen[$id] = true;
            $name = self::text($name);
            $out[] = ['id' => $id, 'name' => $name !== '' ? $name : $id, 'region' => $region];
        };
        if (!is_array($value) && !is_object($value)) return $out;

        foreach ((array) $value as $key => $v) {
            $key = (string) $key;
            if (!is_array($v) && !is_object($v)) continue;
            $v = (object) $v;
            $region = self::text($v->region ?? null) ?: self::text($v->re ?? null);
            if ($region !== '') {
                $add(self::text($v->id ?? null) ?: $key, self::nameOf($v), $region);
                continue;
            }
            if ($key === '' || $key[0] === '_') continue;
            foreach ((array) $v as $sub => $e) {
                $sub = (string) $sub;
                $isId = $sub !== '' && $sub[0] === '_';
                if (is_string($e)) {
                    if ($isId) $add($sub, $e, $key);
                } elseif (is_array($e) || is_object($e)) {
                    $e = (object) $e;
                    $id = self::text($e->id ?? null);
                    if ($id !== '' || $isId) $add($id ?: $sub, self::nameOf($e), $key);
                }
            }
        }
        return $out;
    }

    private static function nameOf(object $o): string {
        return self::text($o->name ?? null) ?: (self::text($o->estacion ?? null) ?: self::text($o->nombre ?? null));
    }

    private static function text($v): string {
        return is_string($v) ? trim($v) : (is_int($v) || is_float($v) ? (string) $v : '');
    }
}
