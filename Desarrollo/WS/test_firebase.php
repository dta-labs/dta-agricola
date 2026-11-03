<?php
// test_firebase.php

$url = "https://dta-agricola.firebaseio.com/.json";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);

if ($response === false) {
    echo "❌ Error cURL: " . curl_error($ch) . "\n";
} else {
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    echo "✅ Conexión exitosa. Código HTTP: $httpCode\n";
    echo "Respuesta: " . substr($response, 0, 200) . "...\n"; // mostramos solo los primeros 200 caracteres
}

curl_close($ch);
?>
