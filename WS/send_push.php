<?php

require 'vendor/autoload.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

$auth = [
    'VAPID' => [
        'subject' => 'mailto:cosme@dtaamerica.com',
        'publicKey' => 'BG1caHGzzvPNBWM4NuN5oIpqaRaVFKld8iwNtpx100P3bkMYhEDYfWcCs9sy0Ay3t170750tQlLM8XCzxpysD7o',
        'privateKey' => '2H6ygT5NVsLJenYenTLIiUBZ47RdgVCG_cw8mJ9L9cY',
    ],
];

$webPush = new WebPush($auth);

if($_GET['user']) {
    $user = $_GET['user'];
    $endpoint = '{"endpoint":"https://wns2-bn3p.notify.windows.com/w/?token=BQYAAAAMNyNAmsknddHvq%2fZ2u5%2f68Wtp9ivmzhyfErx6%2bYsTQ07DQVbswKkB7ZPynjO2XeMwrPRGJ90PG1imI6b4ZSC1TRom3pgIJCwB0qVQLTuD5qGjpcga9mn6k%2bts5G3Z3XkhGrY27SVBmjgAfUtEpVe9rcullTVwEII3Yhj3DSkPgGKZQEC2I5fk5FGJsw1gOhWXSafQKK3GL15uQfAx3ZfOdegNb7XpU%2fG8paBLP2aiX03K8WLHofcp%2bne0mOpzwtyd8BLIGx4t6xxytDT4b88EFLtkmhbQ76cR3DsKTMVyrbfOICcoIhWjSNWjKSarLqQ%3d","expirationTime":null,"keys":{"p256dh":"BM_5ivOVJJromAVHBbXXRkP56EyM_l9_VJKRd3NOnC9pGB_xfp0LftevKFT3OqDC6TIbC0kGVsEu4uDxDQFV4bI","auth":"Oq_7bKHf_ZirVOYw84veRw"}}';
    $payload = '{"title":"Hola ' . $user . '", "body":"Mi notificación en PHP", "icon":"icon-192.png", "url":"./?v=0.1"}';
    $report = $webPush->sendOneNotification(
        Subscription::create(
            json_decode($endpoint, true)),
            $payload,
            ['TTL' => 5000]
    );
    // print_r($report);
    exit;
}

// $endpoint = '{"endpoint":"https://wns2-bn3p.notify.windows.com/w/?token=BQYAAAAMNyNAmsknddHvq%2fZ2u5%2f68Wtp9ivmzhyfErx6%2bYsTQ07DQVbswKkB7ZPynjO2XeMwrPRGJ90PG1imI6b4ZSC1TRom3pgIJCwB0qVQLTuD5qGjpcga9mn6k%2bts5G3Z3XkhGrY27SVBmjgAfUtEpVe9rcullTVwEII3Yhj3DSkPgGKZQEC2I5fk5FGJsw1gOhWXSafQKK3GL15uQfAx3ZfOdegNb7XpU%2fG8paBLP2aiX03K8WLHofcp%2bne0mOpzwtyd8BLIGx4t6xxytDT4b88EFLtkmhbQ76cR3DsKTMVyrbfOICcoIhWjSNWjKSarLqQ%3d","expirationTime":null,"keys":{"p256dh":"BM_5ivOVJJromAVHBbXXRkP56EyM_l9_VJKRd3NOnC9pGB_xfp0LftevKFT3OqDC6TIbC0kGVsEu4uDxDQFV4bI","auth":"Oq_7bKHf_ZirVOYw84veRw"}}';
// $payload = '{"title":"Hola desde PHP", "body":"Mi notificación en PHP", "icon":"icon-192.png", "url":"./?v=0.1"}';

// $report = $webPush->sendOneNotification(
//     Subscription::create(
//         json_decode($endpoint, true)),
//         $payload,
//         ['TTL' => 5000]
// );

// print_r($report);
