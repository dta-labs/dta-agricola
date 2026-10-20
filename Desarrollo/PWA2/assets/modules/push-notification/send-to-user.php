<?php
/**
 * Servicio PHP para enviar notificaciones de OneSignal a usuarios específicos
 * 
 * Uso:
 * - Por Player ID: send-to-user.php?player_id=xxxxx&message=Hola
 * - Por External User ID: send-to-user.php?external_user_id=123&message=Hola
 * - Por Email: send-to-user.php?email=user@email.com&message=Hola
 * - Por múltiples IDs: send-to-user.php con JSON body
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración de OneSignal
define('ONESIGNAL_APP_ID', '13e33e2b-473b-4a76-ab36-5379466b63e9');
define('ONESIGNAL_REST_API_KEY', 'os_v2_app_cprt4k2hhnfhnkzwkn4um23d5hx42j3u657e2buxsftvjcawtjim3mcgmnd6arjs5t546e27xafypm6bbmtqmxexevxrd5ypswke7va');

// Función para enviar respuesta JSON
function sendResponse($success, $message, $data = null) {
    http_response_code($success ? 200 : 400);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// Función para enviar notificación a usuarios específicos
function sendToOneSignalUsers($message, $title = null, $targetType, $targetIds, $data = null) {
    $url = 'https://onesignal.com/api/v1/notifications';
    
    $fields = [
        'app_id' => ONESIGNAL_APP_ID,
        'contents' => [
            'en' => $message,
            'es' => $message
        ]
    ];
    
    // Agregar título si se proporciona
    if ($title) {
        $fields['headings'] = [
            'en' => $title,
            'es' => $title
        ];
    }
    
    // Configurar target según el tipo
    // Nota: OneSignal API v1 usa diferentes parámetros
    switch ($targetType) {
        case 'player_id':
            $fields['include_player_ids'] = is_array($targetIds) ? $targetIds : [$targetIds];
            break;
            
        case 'external_user_id':
            $fields['include_external_user_ids'] = is_array($targetIds) ? $targetIds : [$targetIds];
            break;
            
        case 'email':
            $fields['include_email_tokens'] = is_array($targetIds) ? $targetIds : [$targetIds];
            break;
            
        case 'phone':
            $fields['include_phone_numbers'] = is_array($targetIds) ? $targetIds : [$targetIds];
            break;
            
        default:
            throw new Exception('Tipo de target no válido: ' . $targetType);
    }
    
    // Agregar datos adicionales si se proporcionan
    if ($data) {
        $fields['data'] = $data;
    }
    
    // Agregar configuración adicional
    $fields['priority'] = 10;
    $fields['ios_badgeType'] = 'Increase';
    $fields['ios_badgeCount'] = 1;
    
    // Log de debug
    error_log("[OneSignal] Request - Type: $targetType, IDs: " . json_encode($targetIds) . ", Message: " . substr($message, 0, 50));
    error_log("[OneSignal] Request Body: " . json_encode($fields));
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json; charset=utf-8',
        'Authorization: Basic ' . ONESIGNAL_REST_API_KEY
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fields));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($error) {
        error_log("[OneSignal] cURL Error: $error");
        throw new Exception('Error cURL: ' . $error);
    }
    
    // Separar headers del body
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $body = substr($response, $headerSize);
    
    error_log("[OneSignal] Response HTTP: $httpCode");
    error_log("[OneSignal] Response Body: " . $body);
    
    $decoded = json_decode($body, true);
    
    if ($httpCode !== 200) {
        error_log("[OneSignal] API Error - HTTP $httpCode: " . $body);
        throw new Exception("OneSignal API retornó HTTP $httpCode: " . $body);
    }
    
    return $decoded;
}

// Obtener parámetros
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $message = $input['message'] ?? $input['text'] ?? null;
    $title = $input['title'] ?? $input['heading'] ?? null;
    $targetType = $input['target_type'] ?? $input['type'] ?? 'player_id';
    $targetIds = $input['target_ids'] ?? $input['ids'] ?? $input['player_id'] ?? $input['external_user_id'] ?? $input['email'] ?? null;
    $data = $input['data'] ?? null;
} else {
    $message = $_GET['message'] ?? $_GET['text'] ?? $_GET['msg'] ?? null;
    $title = $_GET['title'] ?? $_GET['heading'] ?? null;
    $targetType = $_GET['target_type'] ?? $_GET['type'] ?? 'player_id';
    $targetIds = $_GET['target_ids'] ?? $_GET['ids'] ?? $_GET['player_id'] ?? $_GET['external_user_id'] ?? $_GET['email'] ?? null;
    $data = isset($_GET['data']) ? json_decode($_GET['data'], true) : null;
}

// Validar parámetros
if (empty($message)) {
    sendResponse(false, 'El parámetro "message" es obligatorio');
}

if (strlen($message) > 1000) {
    sendResponse(false, 'El mensaje no puede exceder 1000 caracteres');
}

if (empty($targetIds)) {
    sendResponse(false, 'Debes proporcionar al menos un ID de destino (player_id, external_user_id, email, o phone)');
}

// Convertir a array si es string separado por comas
if (is_string($targetIds)) {
    $targetIds = array_map('trim', explode(',', $targetIds));
}

// Validar tipo de target
$validTypes = ['player_id', 'external_user_id', 'email', 'phone'];
if (!in_array($targetType, $validTypes)) {
    sendResponse(false, 'Tipo de target no válido. Debe ser: ' . implode(', ', $validTypes));
}

// Enviar notificación
try {
    $result = sendToOneSignalUsers($message, $title, $targetType, $targetIds, $data);
    
    if (isset($result['errors'])) {
        sendResponse(false, 'Error de OneSignal: ' . json_encode($result['errors']), $result);
    }
    
    if (isset($result['id'])) {
        sendResponse(true, 'Notificación enviada exitosamente', [
            'notification_id' => $result['id'],
            'recipients' => $result['recipients'] ?? 0,
            'target_type' => $targetType,
            'target_count' => count($targetIds)
        ]);
    }
    
    sendResponse(false, 'Respuesta inesperada de OneSignal', $result);
    
} catch (Exception $e) {
    sendResponse(false, 'Error: ' . $e->getMessage());
}
