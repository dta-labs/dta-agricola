<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

try {
    $req = new Request();
    $id = $req->requireSystemId();
    $db = new FirebaseClient();
    StationCatalog::setFirebase($db);   // catálogo de estaciones desde /stations
    (new SensorDbUpdater($id, $req, $db, new WeatherService()))->process();
} catch (Throwable $e) {
    error_log('updateSensorDB.php: ' . $e->getMessage());
    http_response_code(500);
    echo 'Error: ' . $e->getMessage();
}
