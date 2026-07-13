<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Allow: GET, POST, PUT, DELETE, OPTIONS');
    http_response_code(204);
    exit;
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        respond(['error' => 'El cuerpo JSON no es válido.'], 400);
    }
    return $data;
}

function validate(array $data): array
{
    $required = ['iccid', 'phone', 'client', 'device', 'location', 'installedAt', 'status'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
            respond(['error' => "El campo {$field} es obligatorio."], 422);
        }
    }
    if (!preg_match('/^[0-9]{10,22}$/', (string)$data['iccid'])) {
        respond(['error' => 'El ICCID debe contener entre 10 y 22 dígitos.'], 422);
    }
    if (!in_array($data['status'], ['active', 'inactive'], true)) {
        respond(['error' => 'El estado no es válido.'], 422);
    }
    foreach (['latitude' => [-90, 90], 'longitude' => [-180, 180]] as $field => [$min, $max]) {
        if (($data[$field] ?? '') !== '' && (!is_numeric($data[$field]) || (float)$data[$field] < $min || (float)$data[$field] > $max)) {
            respond(['error' => "El campo {$field} no es válido."], 422);
        }
    }
    return [
        ':iccid' => trim((string)$data['iccid']),
        ':phone' => trim((string)$data['phone']),
        ':client' => trim((string)$data['client']),
        ':device' => trim((string)$data['device']),
        ':location' => trim((string)$data['location']),
        ':latitude' => ($data['latitude'] ?? '') === '' ? null : (float)$data['latitude'],
        ':longitude' => ($data['longitude'] ?? '') === '' ? null : (float)$data['longitude'],
        ':installed_at' => (string)$data['installedAt'],
        ':status' => (string)$data['status'],
    ];
}

try {
    $config = require __DIR__ . '/config.php';
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']);
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $method = $_SERVER['REQUEST_METHOD'];
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

    if ($method === 'GET' && ($_GET['health'] ?? '') === '1') {
        $table = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'phone_lines'")->fetchColumn();
        respond([
            'ok' => (bool)$table,
            'database' => $config['database'],
            'table' => $table ? 'phone_lines disponible' : 'phone_lines no existe en esta base',
            'pdo_mysql' => true,
        ], $table ? 200 : 500);
    }

    if ($method === 'GET') {
        $sql = "SELECT id, iccid, phone, client, device, location, latitude, longitude,
                       DATE_FORMAT(installed_at, '%Y-%m-%d') AS installedAt,
                       status, DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updatedAt
                FROM phone_lines ORDER BY updated_at DESC";
        respond(['data' => $pdo->query($sql)->fetchAll()]);
    }

    if ($method === 'POST') {
        $values = validate(body());
        $stmt = $pdo->prepare('INSERT INTO phone_lines (iccid, phone, client, device, location, latitude, longitude, installed_at, status) VALUES (:iccid, :phone, :client, :device, :location, :latitude, :longitude, :installed_at, :status)');
        $stmt->execute($values);
        respond(['message' => 'Línea creada.', 'id' => (int)$pdo->lastInsertId()], 201);
    }

    if ($method === 'PUT') {
        if (!$id) respond(['error' => 'Se requiere un id válido.'], 400);
        $values = validate(body());
        $values[':id'] = $id;
        $stmt = $pdo->prepare('UPDATE phone_lines SET iccid=:iccid, phone=:phone, client=:client, device=:device, location=:location, latitude=:latitude, longitude=:longitude, installed_at=:installed_at, status=:status WHERE id=:id');
        $stmt->execute($values);
        if ($stmt->rowCount() === 0) {
            $exists = $pdo->prepare('SELECT 1 FROM phone_lines WHERE id = ?');
            $exists->execute([$id]);
            if (!$exists->fetchColumn()) respond(['error' => 'La línea no existe.'], 404);
        }
        respond(['message' => 'Línea actualizada.']);
    }

    if ($method === 'DELETE') {
        if (($_GET['all'] ?? '') === '1') {
            $pdo->exec('DELETE FROM phone_lines');
            respond(['message' => 'Registros eliminados.']);
        }
        if (!$id) respond(['error' => 'Se requiere un id válido.'], 400);
        $stmt = $pdo->prepare('DELETE FROM phone_lines WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) respond(['error' => 'La línea no existe.'], 404);
        respond(['message' => 'Línea eliminada.']);
    }

    header('Allow: GET, POST, PUT, DELETE, OPTIONS');
    respond(['error' => 'Método no permitido.'], 405);
} catch (PDOException $error) {
    $mysqlCode = (int)($error->errorInfo[1] ?? $error->getCode());
    error_log($error->getMessage());
    $messages = [
        1044 => 'El usuario MySQL no tiene permisos sobre la base configurada.',
        1045 => 'MySQL rechazó el usuario o la contraseña configurados.',
        1049 => 'La base de datos configurada no existe. Revisa el nombre y el prefijo del hosting.',
        1062 => 'El ICCID ya está registrado.',
        1146 => 'La tabla phone_lines no existe en la base configurada. Importa database.sql en esa misma base.',
        2002 => 'No se pudo conectar con el servidor MySQL. Revisa DB_HOST y DB_PORT.',
        2003 => 'No se pudo conectar con el servidor MySQL. Revisa DB_HOST y DB_PORT.',
    ];
    respond([
        'error' => $messages[$mysqlCode] ?? 'No fue posible completar la operación en la base de datos.',
        'code' => 'DB_' . $mysqlCode,
    ], $mysqlCode === 1062 ? 409 : 500);
} catch (Throwable $error) {
    error_log($error->getMessage());
    $missingDriver = str_contains(strtolower($error->getMessage()), 'could not find driver');
    respond([
        'error' => $missingDriver ? 'PHP no tiene habilitada la extensión pdo_mysql.' : 'Ocurrió un error interno.',
        'code' => $missingDriver ? 'PDO_MYSQL_MISSING' : 'INTERNAL_ERROR',
    ], 500);
}
