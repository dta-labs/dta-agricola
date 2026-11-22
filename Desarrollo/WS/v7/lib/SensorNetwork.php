<?php
declare(strict_types=1);

/**
 * Estación meteorológica de referencia de cada sistema Sensor.
 * (Antes estaba dentro de updateSensorDB.php como getFilterObject().)
 */
final class SensorNetwork {
    private const STATIONS = [
        '24530080324' => '_osm',  // Heber Alonso Morales Andujoo
        '24530080449' => '_osm',  // Luis Carlos Estrada Estrada
        '20333844254' => '_nal',  // Manuel Enrique Rivera Cano
        '24530080316' => '_fac',  // Ruben Alberto Dominguez Montano
        '24530080456' => '_fac',  // Silvia Yadira Rivera Alvarez
        '24530084283' => '_lbr',  // Alvaro Loya Andujo
        '24530094291' => '_osm',  // Alfredo Quintana Juarez
        '24530094135' => '_bac',  // Laura Carmina Arriola Ordoñez (Jesús Manuel Mariscal)
        '24530080415' => '_mrc',  // Salvador Saenz Mendoza
        '24530094119' => '_mrc',  // Guadalupe Lozano Garcia (Ramiro)
        '24530080423' => '_mrc',  // Francisco Terán
        '25331424856' => '_mmi',  // Luly Camacho
        '24530094143' => '_mmi',  // Claudio_PROFRUT_Rancho González Lardizabal
        '24530094150' => '_mmi',  // Claudio_PROFRUT_Estanque González Lardizabal
        '24530094127' => '_mmi',  // Álvaro Mingura
        '24530080431' => '_bas',  // Trinidad Estrada Valadez
        '24530094275' => '_ros',  // Ignacio Luis Delgado Casale
        '24530080407' => '_lju',  // Javier Hernández Caballero
        '24530080332' => '_lac',  // Carlos Macyshyn Rasor (Capilla)
    ];

    /**
     * Estación del sistema como ['region' => ..., 'id' => ...], o null.
     *   1. settings.station = { region, id }  (PWA3, REQ-121)
     *   2. settings.station = "_fac"          (texto, REQ-120)
     *   3. esta tabla por settings.key
     * Si falta la región se toma del catálogo; sin región no se puede consultar (re=) ⇒ null.
     */
    public static function stationFor(?object $settings): ?array {
        $own = $settings->station ?? null;
        $id = $region = '';
        if (is_object($own)) {
            $id = trim((string) ($own->id ?? ''));
            $region = trim((string) ($own->region ?? ''));
        } elseif (is_string($own)) {
            $id = trim($own);
        }
        if ($id === '') {
            $key = $settings->key ?? null;
            $id = is_scalar($key) ? (self::STATIONS[(string) $key] ?? '') : '';
        }
        if ($id === '') return null;
        if ($region === '') $region = StationCatalog::find($id)['region'] ?? '';
        return $region === '' ? null : ['region' => $region, 'id' => $id];
    }
}
