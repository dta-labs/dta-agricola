<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 1. Obtener datos del request
function getRequestData() {
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        $playerId = $_GET['player_id'] ?? null;
        $userEmail = $_GET['user_email'] ?? null;
    } else {
        $input = json_decode(file_get_contents('php://input'), true);
        $playerId = $input['player_id'] ?? null;
        $userEmail = $input['user_email'] ?? null;
    }
    if (empty($playerId) || empty($userEmail)) {
        sendResponse(false, 'Parámetros "player_id" y "user_email" son obligatorios');
    }
    return [$playerId, $userEmail];
}

// 2. Sustituir puntos por guiones
function dot2dash($email) {
    return str_replace('.', '-', strtolower($email));
}

// 3. Obtener tokens existentes y evitar duplicados
function getTokens($firebaseUrl, $playerId) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $firebaseUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $tokens = json_decode($response, true);

    if (!is_array($tokens)) {
        $tokens = [];
    }

    if (!in_array($playerId, $tokens)) {
        $tokens[] = $playerId;
    }

    return $tokens;
}

// 4. Guardar tokens en Firebase
function saveTokens($firebaseUrl, $tokens) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $firebaseUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($tokens));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $result = curl_exec($ch);
    curl_close($ch);

    return $result;
}

// 5. Función para responder en JSON
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

// 6. Función principal

function main() {
    list($playerId, $userEmail) = getRequestData();                                     // 1. Obtener datos del request
    $userKey = dot2dash($userEmail);                                                    // 2. Sustituir puntos por guiones
    $firebaseUrl = "https://dta-agricola.firebaseio.com/users/{$userKey}/token.json";   
    $tokens = getTokens($firebaseUrl, $playerId);                                       // 3. Obtener tokens existentes y evitar duplicados
    $result = saveTokens($firebaseUrl, $tokens);                                        // 4. Guardar tokens en Firebase
    if ($result) {                                                                      // 5. Función para responder en JSON
        sendResponse(true, 'Player ID guardado en Firebase', [
            'player_id' => $playerId,
            'user' => $userKey,
            'total_tokens' => count($tokens)
        ]);
    } else {
        sendResponse(false, 'Error al guardar en Firebase');
    }
}

main();
