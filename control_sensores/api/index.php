<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Allow: GET, POST, OPTIONS');
    http_response_code(204);
    exit;
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '', true);
    if (!is_array($payload)) {
        respond(['error' => 'El cuerpo debe ser JSON válido.'], 400);
    }
    return $payload;
}

function require_value(array $record, string $field, string $context): string
{
    $value = trim((string) ($record[$field] ?? ''));
    if ($value === '') {
        respond(['error' => "Falta $field en $context."], 422);
    }
    return $value;
}

function nullable_text(array $record, string $field): ?string
{
    $value = trim((string) ($record[$field] ?? ''));
    return $value === '' ? null : $value;
}

function nullable_coordinate(array $record, string $field, float $min, float $max): ?float
{
    $value = $record[$field] ?? '';
    if ($value === '' || $value === null) return null;
    if (!is_numeric($value) || (float) $value < $min || (float) $value > $max) {
        respond(['error' => "$field no contiene una coordenada válida."], 422);
    }
    return (float) $value;
}

function placeholders(int $count): string
{
    return implode(',', array_fill(0, $count, '?'));
}

function delete_missing(PDO $pdo, string $table, string $column, array $ids): void
{
    if ($ids === []) {
        $pdo->exec("DELETE FROM $table");
        return;
    }
    $statement = $pdo->prepare("DELETE FROM $table WHERE $column NOT IN (" . placeholders(count($ids)) . ')');
    $statement->execute($ids);
}

$config = require __DIR__ . '/config.php';

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $error) {
    error_log('[control_sensores] Error MySQL: ' . $error->getMessage());
    $message = $error->getMessage();
    $code = str_contains($message, '1045') ? 'DB_ACCESS_DENIED'
        : (str_contains($message, '1049') ? 'DB_NOT_FOUND'
        : (str_contains($message, '2002') ? 'DB_HOST_UNREACHABLE' : 'DB_CONNECTION_ERROR'));
    respond([
        'error' => 'No fue posible conectar con MySQL.',
        'code' => $code,
        'database' => $config['database'],
        'username' => $config['username'],
    ], 503);
}

$path = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
if (!str_ends_with($path, 'sync') && !str_ends_with($path, 'index.php')) {
    respond(['error' => 'Ruta no encontrada.'], 404);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        respond(['data' => [
            'sensors' => $pdo->query('SELECT idSensor, tipo, alias FROM sensores ORDER BY idSensor')->fetchAll(),
            'networks' => $pdo->query('SELECT idRedSensores, alias, propietario FROM redes_sensores ORDER BY idRedSensores')->fetchAll(),
            'assignments' => $pdo->query('SELECT idSensor, idRedSensores, latitud, longitud FROM asignaciones ORDER BY idSensor')->fetchAll(),
            'serverUpdatedAt' => gmdate('c'),
        ]]);
    } catch (Throwable $error) {
        respond(['error' => 'No fue posible leer los registros.'], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST, OPTIONS');
    respond(['error' => 'Método no permitido.'], 405);
}

$payload = request_json();
$sensors = $payload['sensors'] ?? null;
$networks = $payload['networks'] ?? null;
$assignments = $payload['assignments'] ?? null;
if (!is_array($sensors) || !is_array($networks) || !is_array($assignments)) {
    respond(['error' => 'Se requieren los arreglos sensors, networks y assignments.'], 422);
}

try {
    $pdo->beginTransaction();

    $sensorIds = [];
    $sensorStatement = $pdo->prepare(
        'INSERT INTO sensores (idSensor, tipo, alias) VALUES (?, ?, ?) '
        . 'ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), alias = VALUES(alias)'
    );
    foreach ($sensors as $index => $sensor) {
        if (!is_array($sensor)) throw new RuntimeException('Sensor inválido.');
        $id = require_value($sensor, 'idSensor', "sensors[$index]");
        $tipo = require_value($sensor, 'tipo', "sensors[$index]");
        if (isset($sensorIds[$id])) respond(['error' => "idSensor duplicado: $id"], 422);
        $sensorIds[$id] = true;
        $sensorStatement->execute([$id, $tipo, nullable_text($sensor, 'alias')]);
    }

    $networkIds = [];
    $networkStatement = $pdo->prepare(
        'INSERT INTO redes_sensores (idRedSensores, alias, propietario) VALUES (?, ?, ?) '
        . 'ON DUPLICATE KEY UPDATE alias = VALUES(alias), propietario = VALUES(propietario)'
    );
    foreach ($networks as $index => $network) {
        if (!is_array($network)) throw new RuntimeException('Red inválida.');
        $id = require_value($network, 'idRedSensores', "networks[$index]");
        $alias = require_value($network, 'alias', "networks[$index]");
        if (isset($networkIds[$id])) respond(['error' => "idRedSensores duplicado: $id"], 422);
        $networkIds[$id] = true;
        $networkStatement->execute([$id, $alias, nullable_text($network, 'propietario')]);
    }

    // Las asignaciones se reconstruyen para reflejar también eliminaciones locales.
    $pdo->exec('DELETE FROM asignaciones');
    $assignmentStatement = $pdo->prepare(
        'INSERT INTO asignaciones (idSensor, idRedSensores, latitud, longitud) VALUES (?, ?, ?, ?)'
    );
    $assignedSensors = [];
    foreach ($assignments as $index => $assignment) {
        if (!is_array($assignment)) throw new RuntimeException('Asignación inválida.');
        $sensorId = require_value($assignment, 'idSensor', "assignments[$index]");
        $networkId = require_value($assignment, 'idRedSensores', "assignments[$index]");
        if (!isset($sensorIds[$sensorId])) respond(['error' => "El sensor $sensorId no existe en el envío."], 422);
        if (!isset($networkIds[$networkId])) respond(['error' => "La red $networkId no existe en el envío."], 422);
        if (isset($assignedSensors[$sensorId])) respond(['error' => "El sensor $sensorId tiene más de una asignación."], 422);
        $assignedSensors[$sensorId] = true;
        $assignmentStatement->execute([
            $sensorId,
            $networkId,
            nullable_coordinate($assignment, 'latitud', -90, 90),
            nullable_coordinate($assignment, 'longitud', -180, 180),
        ]);
    }

    delete_missing($pdo, 'sensores', 'idSensor', array_keys($sensorIds));
    delete_missing($pdo, 'redes_sensores', 'idRedSensores', array_keys($networkIds));
    $pdo->commit();

    respond(['data' => [
        'sensors' => $pdo->query('SELECT idSensor, tipo, alias FROM sensores ORDER BY idSensor')->fetchAll(),
        'networks' => $pdo->query('SELECT idRedSensores, alias, propietario FROM redes_sensores ORDER BY idRedSensores')->fetchAll(),
        'assignments' => $pdo->query('SELECT idSensor, idRedSensores, latitud, longitud FROM asignaciones ORDER BY idSensor')->fetchAll(),
        'serverUpdatedAt' => gmdate('c'),
    ]]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond(['error' => 'No fue posible sincronizar los registros.', 'detail' => $error->getMessage()], 500);
}
