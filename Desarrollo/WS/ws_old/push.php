<?php
/*
 * push.php?user=<clave del usuario>&txt=<mensaje> — notificación Web Push (VAPID) a las suscripciones de
 * users/{user}/token. Lo llama alertas.php.
 *
 * Correcciones 2026-11-21:
 *  - user validado (no puede apuntar a otra ruta de Firebase) y txt obligatorio.
 *  - Suscripciones guardadas como objeto: antes terminaba en error fatal ("Cannot use object as array").
 *    Se aceptan: una suscripción (texto JSON u objeto) o una colección de ellas.
 *  - Tiempo máximo en la lectura de Firebase.
 * Pendiente: PWA3 guarda tokens FCM en users/{user}/fcmTokens y borra "token"; este servicio no los usa.
 */

require 'vendor/autoload.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

#region 0.- Funciones cURLs

function config() {
    $user = $_GET["user"] ?? '';
    // clave del usuario sin caracteres que cambien la ruta de Firebase
    if (!is_string($user) || $user === '' || preg_match('/[\/.#$\[\]?&%\s\\]/', $user)) {
        http_response_code(400);
        exit("Error: parámetro 'user' inválido");
    }
    return "https://dta-agricola.firebaseio.com/users/" . rawurlencode($user) . "/token.json";
}

function getcURLData($url) {                    // Lee registro (como arreglos asociativos)
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response === false ? null : json_decode($response, true);
}

/** Lista de suscripciones Web Push (cada una con "endpoint"). */
function getTokens() {
    $raw = getcURLData(config());
    $toSubscription = function ($v) {
        if (is_string($v)) $v = json_decode($v, true);
        return is_array($v) && isset($v['endpoint']) && is_string($v['endpoint']) ? $v : null;
    };
    $single = $toSubscription($raw);
    if ($single !== null) return [$single];                 // una sola suscripción
    if (!is_array($raw)) return [];
    return array_values(array_filter(array_map($toSubscription, $raw)));   // colección
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
        $txt = $_GET["txt"] ?? '';
        if (!is_string($txt) || trim($txt) === '') {
            http_response_code(400);
            exit("Error: falta el parámetro 'txt'");
        }
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
        foreach ($tokens as $subscription) {
            $webPush->sendOneNotification(
                Subscription::create($subscription),
                $payload,
                ['TTL' => 5000, 'urgency' => 'high']
            );
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
echo "Sin suscripciones Web Push para este usuario\n";

#endregion 1.- Notificaciones push
