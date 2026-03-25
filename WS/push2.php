<?php
// Tu Server Key de Firebase Cloud Messaging
define('FCM_SERVER_KEY', 'AAAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

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