<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

try {
    SensorEndpoint::run(new Request(), new FirebaseClient(), new AsyncCaller());
} catch (Throwable $e) {
    error_log('sensor.php: ' . $e->getMessage());
    http_response_code(500);
    echo 'Error: ' . $e->getMessage();
}
