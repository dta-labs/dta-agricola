<?php
declare(strict_types=1);
/**
 * Migración única: crea settings.station = { region, id } en los sistemas de la
 * tabla de lib/SensorNetwork.php (región tomada de /stations o, si no, de data/estaciones.json).
 * No toca los sistemas que ya tienen station. Las estaciones que no están en el
 * catálogo se reportan y no se escriben.
 *
 *   php tools/migrar_station.php           → solo muestra lo que haría
 *   php tools/migrar_station.php --aplicar → escribe en Firebase
 */
require_once __DIR__ . '/../lib/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Solo por línea de comandos.');
}

$apply = in_array('--aplicar', $argv, true);
$db = new FirebaseClient();
StationCatalog::setFirebase($db);
echo 'Catálogo: ' . count(StationCatalog::all()) . " estaciones\n\n";
$created = $skipped = $errors = 0;

foreach (SensorNetwork::all() as $systemId => $station) {
    $settings = $db->get("systems/$systemId/settings");
    if (!is_object($settings)) {
        echo "✗ $systemId: no existe o no se pudo leer\n";
        $errors++;
        continue;
    }
    if (!empty($settings->station)) {
        echo "= $systemId: ya tiene station = " . json_encode($settings->station, JSON_UNESCAPED_UNICODE) . "\n";
        $skipped++;
        continue;
    }
    $entry = StationCatalog::find($station);
    if ($entry === null) {
        echo "✗ $systemId: la estación $station no está en el catálogo (asígnala desde PWA3)\n";
        $errors++;
        continue;
    }
    $value = ['region' => $entry['region'], 'id' => $entry['id']];
    if ($apply && !$db->put("systems/$systemId/settings/station", $value)) {
        echo "✗ $systemId: error al escribir\n";
        $errors++;
        continue;
    }
    echo ($apply ? '✓' : '→') . " $systemId: station = {$entry['region']} / {$entry['id']} ({$entry['name']})\n";
    $created++;
}

echo "\n" . ($apply ? 'Creadas' : 'Por crear') . ": $created · ya tenían: $skipped · errores/sin catálogo: $errors\n";
if (!$apply) echo "Nada se escribió. Repite con --aplicar para guardar.\n";
