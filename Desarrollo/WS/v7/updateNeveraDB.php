<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

try {
    $req = new Request();
    $id = $req->requireSystemId();
    (new NeveraDbUpdater($id, $req, new FirebaseClient()))->process();
} catch (Throwable $e) {
    error_log('updateNeveraDB.php: ' . $e->getMessage());
    http_response_code(500);
    echo 'Error: ' . $e->getMessage();
}
