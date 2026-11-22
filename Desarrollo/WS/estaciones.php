<?php
declare(strict_types=1);

/*
 * estaciones.php — datos de las estaciones meteorológicas locales (UNIFRUT REM).
 * Uso: estaciones.php?fi=aaaa-mm-dd&ff=aaaa-mm-dd&tp=Hora&re=<REGION>&es=<id>
 * Responde una lista JSON con un renglón por día:
 *   [{ estacion, fecha, tmax, tmin, tprom, hmax, hmin, rad, pret, eto }]
 *
 * Correcciones 2026-11-21:
 *  - Se quitan los renglones de resumen ("Promedio / Totales", "Maximo", "Minimo") siempre. Antes solo si había
 *    más de 3 renglones: sin datos se devolvían esos tres con tprom "0.00", que parecían 0 °C.
 *  - Nombres de estación en UTF-8 (antes "Ã“scar Soto Maynez").
 *  - Parámetros obligatorios y validados (antes, sin parámetros, devolvía un rango fijo de marzo de CUAUHTEMOC).
 *  - Si UNIFRUT no responde: HTTP 502 y [] (antes error fatal al leer una respuesta vacía); tiempos máximos en cURL.
 */

header("Content-Type: application/json; charset=utf-8");

function responder(int $codigo, $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

function fechaValida($v): bool {
    if (!is_string($v) || preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) !== 1) return false;
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

$fi = $_GET["fi"] ?? null;
$ff = $_GET["ff"] ?? null;
$tp = $_GET["tp"] ?? null;
$re = $_GET["re"] ?? null;
$es = $_GET["es"] ?? null;

if (!fechaValida($fi) || !fechaValida($ff) || $fi > $ff) {
    responder(400, ["error" => "fi y ff son obligatorios con formato aaaa-mm-dd (fi <= ff)"]);
}
foreach (["tp" => $tp, "re" => $re, "es" => $es] as $nombre => $valor) {
    if (!is_string($valor) || $valor === "" || preg_match('/[|\r\n]/', $valor)) {
        responder(400, ["error" => "Falta o no es válido el parámetro '$nombre'"]);
    }
}

$ch = curl_init("https://www.unifrut.com.mx/rem/includes/getReport.php");
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => ["info" => "$fi|$ff|$re|$tp|$es"],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => 20,
]);
$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false || $response === "" || $httpCode < 200 || $httpCode >= 300) {
    error_log("estaciones.php: UNIFRUT no respondió ($httpCode) $error");
    responder(502, []);
}

// Parsear HTML como UTF-8
$dom = new DOMDocument();
libxml_use_internal_errors(true);
$dom->loadHTML('<?xml encoding="UTF-8">' . $response);
libxml_clear_errors();

$xpath = new DOMXPath($dom);
$rows = $xpath->query("//table[@id='Datatable']/tbody/tr");

$resumen = ["promedio / totales", "promedio", "totales", "maximo", "máximo", "minimo", "mínimo"];
$resultados = [];
foreach ($rows as $row) {
    $cells = $row->getElementsByTagName("td");
    if ($cells->length < 16) continue;
    $celda = fn(int $i): string => trim($cells->item($i)->textContent);

    $est = $celda(0);
    if (in_array(mb_strtolower($est, 'UTF-8'), $resumen, true)) continue;   // renglones de resumen

    $resultados[] = [
        "estacion" => $est,
        "fecha"    => $celda(1),
        "tmax"     => $celda(2),
        "tmin"     => $celda(4),
        "tprom"    => $celda(6),
        "hmax"     => $celda(7),
        "hmin"     => $celda(8),
        "rad"      => $celda(13),
        "pret"     => $celda(14),
        "eto"      => $celda(15)
    ];
}

responder(200, $resultados);
