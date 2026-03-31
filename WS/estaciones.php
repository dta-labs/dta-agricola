<?php

if ($_GET["fi"] && $_GET["ff"] && $_GET["tp"] && $_GET["re"] && $_GET["es"]) {
	$fecha_inicio = $_GET["fi"];
	$fecha_fin    = $_GET["ff"];
	$tipo         = $_GET["tp"];
	$region       = $_GET["re"];
	$estacion     = $_GET["es"];
	$data = ["info" => "$fecha_inicio|$fecha_fin|$region|$tipo|$estacion"];
} else {
	$data = ["info" => "2026-03-01|2026-03-30|CUAUHTEMOC|General|_CUAUHTEMOC"];
}

$url = "https://www.unifrut.com.mx/rem/includes/getReport.php";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

// Parsear HTML
$dom = new DOMDocument();
libxml_use_internal_errors(true);
$dom->loadHTML($response);
libxml_clear_errors();

$xpath = new DOMXPath($dom);
$rows = $xpath->query("//table[@id='Datatable']/tbody/tr");

$resultados = [];
foreach ($rows as $row) {
    $cells = $row->getElementsByTagName("td");
    if ($cells->length > 0) {
        $est   = trim($cells->item(0)->textContent);
        $fecha = trim($cells->item(1)->textContent);
        $tmax  = trim($cells->item(2)->textContent);
        $tmin  = trim($cells->item(4)->textContent);
        $tprom = trim($cells->item(6)->textContent);
        $hmax  = trim($cells->item(7)->textContent);
        $hmin  = trim($cells->item(8)->textContent);
        $rad   = trim($cells->item(13)->textContent);
        $pret  = trim($cells->item(14)->textContent);
        $eto   = trim($cells->item(15)->textContent);

        $resultados[] = [
            "estacion" => $est,
            "fecha"    => $fecha,
            "tmax"     => $tmax,
            "tmin"     => $tmin,
            "tprom"    => $tprom,
            "hmax"     => $hmax,
            "hmin"     => $hmin,
            "rad"      => $rad,
			"pret"     => $pret,
			"eto"      => $eto     
        ];
    }
}

// Quitar los últimos 3 registros de resumen
if (count($resultados) > 3) {
    $resultados = array_slice($resultados, 0, -3);
}


// Devolver JSON
header("Content-Type: application/json; charset=utf-8");
echo json_encode($resultados, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
