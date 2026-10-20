<?php

#region 0.- Funciones cURLs

function config() {
    $user = $_GET["user"];
    $baseUrl = "https://dta-agricola.firebaseio.com/users/{$user}/token.json";
    return $baseUrl;
}

function getcURLData($url) {                    // Lee registro
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response);
}

function getTokens() {
    $baseUrl = config();
    $tokens = getcURLData($baseUrl);
    return $tokens;
}

#endregion 0.- Funciones cURLs

#region 1.- Notificaciones push

function getAuth() {
    $auth = [
        'VAPID' => [
            'subject' => 'mailto:cosme@dtaamerica.com',
            'publicKey' => 'BG1caHGzzvPNBWM4NuN5oIpqaRaVFKld8iwNtpx100P3bkMYhEDYfWcCs9sy0Ay3t170750tQlLM8XCzxpysD7o',
            'privateKey' => '2H6ygT5NVsLJenYenTLIiUBZ47RdgVCG_cw8mJ9L9cY',
        ],
    ];
    return $auth;
}

function sendNotification() {
    $tokens = getTokens();
    
    if($tokens) {
        $txt = $_GET["txt"];
        $webPush = new WebPush(getAuth());
        $payload = json_encode([
            "title" => "DTA-Agrícola",
            "body" => $txt,
            "icon" => "DTA.png",
            "sound" => "./assets/sounds/alarma-de-evacuacion.mp3",
            "url" => "./?v=0.1"
        ]);
        // $payload = '{"title":"DTA-Agrícola", "body":"' . $txt . '", "icon":"DTA.png", "sound":"alarma-de-evacuacion.mp3", "url":"./?v=0.1"}';
        foreach ($tokens as $token) {
            $subscription = is_string($token) ? json_decode($token, true) : $token;
            // print_r($token);
            if ($subscription && isset($subscription['endpoint'])) {
                $webPush->sendOneNotification(
                    Subscription::create($subscription),
                    $payload,
                    ['TTL' => 5000]
                );
            }
        }
        $webPush->flush();
        exit;
    }
}

sendNotification();

#endregion 1.- Notificaciones push

// Tu Server Key de Firebase Cloud Messaging
define('FCM_SERVER_KEY', 'AIzaSyCMQrfX00C0DuaYCUugYPDsPSo-a-0nqNA');

// Endpoint de FCM
define('FCM_URL', 'https://fcm.googleapis.com/fcm/send');

// Función para enviar notificación
function sendFCMNotification($deviceToken, $title, $body) {
    $notification = [
        'title' => $title,
        'body'  => $body,
        'sound' => 'default', // sonido nativo de Android
        'icon'  => 'ic_notification' // ícono definido en tu app
    ];

    $fields = [
        'to' => $deviceToken,
        'notification' => $notification,
        'priority' => 'high'
    ];

    $headers = [
        'Authorization: key=' . FCM_SERVER_KEY,
        'Content-Type: application/json'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, FCM_URL);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fields));
    $result = curl_exec($ch);
    curl_close($ch);

    return $result;
}

// Ejemplo de uso
$deviceToken = "TOKEN_DEL_DISPOSITIVO"; // recuperado de tu BD
$title = "Alerta Agroclimática";
$body  = "Temperatura crítica detectada en tu parcela.";

$response = sendFCMNotification($deviceToken, $title, $body);
echo $response;