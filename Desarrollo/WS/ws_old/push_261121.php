<?php

require 'vendor/autoload.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

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
            "icon" => "./assets/images/DTA.png",
            "sound" => "default",
            // "sound" => "./assets/sounds/alarma-de-evacuacion.mp3",
            "url" => "./?v=0.1"
        ]);
        // $payload = '{"title":"DTA-Agrícola", "body":"' . $txt . '", "icon":"DTA.png", "sound":"alarma-de-evacuacion.mp3", "url":"./?v=0.1"}';
        foreach ($tokens as $token) {
            $subscription = is_string($token) ? json_decode($token, true) : $token;
            // print_r($token);
            if ($subscription && isset($subscription['endpoint'])) {
                // print_r("Enviar notificación... " . json_encode($subscription) . " ");
                $webPush->sendOneNotification(
                    Subscription::create($subscription),
                    $payload,
                    ['TTL' => 5000, 'urgency' => 'high']
                );
            }
        }
        // $webPush->flush();
        print_r("Procesar resultados");
        $reports = $webPush->flush();
        if (empty($reports) || $reports === null) {
            echo "⚠️ flush() no devolvió reportes. Nada se encoló.\n";
        } else {
            foreach ($reports as $report) {
                $endpoint = $report->getEndpoint();
                echo $report->isSuccess()
                    ? "✅ Push enviado correctamente a {$endpoint}\n"
                    : "❌ Error al enviar a {$endpoint}: {$report->getReason()}\n";
            }
        }
        exit;
    }
}

sendNotification();

#endregion 1.- Notificaciones push
