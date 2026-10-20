<?php
	$apiKey = "AIzaSyBGhhdWhG7bD4QBkjK5IlXgiGVkoUv70KM";
	$headers = array('Authorization: key='.$apiKey,'Content-Type: application/json');
	$id = $_GET["id"];

	// 1.- Consultar configuración (Settings) y enviar las órdenes al dispositivo:

	$url = "https://dta-agricola.firebaseio.com/systems/$id/settings.json";
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	// curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$response = curl_exec($ch);
	curl_close($ch);

	$dataSettings = json_decode($response);
	$timeZone = $dataSettings->zona; 					// Zona horaria
	$summerHour = $dataSettings->summerHour; 			// Horario de verano
	$localZone = intval($timeZone) + intval($summerHour);

	$lectura  = "\"" . $dataSettings->status;

	$dir = $dataSettings->direction;
	$plans = "";
	for ($i = 0; $i < intval($dataSettings->plansLength); $i++) {
		$p = "p" . $i;
		$starAngle = $dataSettings->plans->$p->starAngle;
		$endAngle = $dataSettings->plans->$p->endAngle;
		$value = $dataSettings->plans->$p->value;
		$endGun = "F";
		if ($dataSettings->status == "ON" && $dataSettings->autoreverse == "ON") {
			if (intval($_GET["po"]) >= intval($starAngle) && intval($_GET["po"]) < intval($endAngle) && $value == "0") {
				$dir = ($dataSettings->direction == "FF") ? "RR" : "FF";
				$value = "100";
			}
		}
		if ($dataSettings->plans->$p->endGun && $dataSettings->plans->$p->endGun == "true") {
			$endGun = "T";
		}
		$plans .= "\"" . $starAngle . "\"" . $endAngle . "\"" . $value . "\"" . $endGun;
	}

	$lectura .= "\"" . $dir;
	$lectura .= "\"" . $dataSettings->sensorPresion;
	$lectura .= "\"" . $dataSettings->autoreverse;
	$lectura .= "\"" . $dataSettings->latitude;
	$lectura .= "\"" . $dataSettings->longitude;
	$lectura .= "\"" . $dataSettings->type;
	$lectura .= "\"" . $dataSettings->plansLength;
	$lectura .= $plans;
	$lectura .= "\"";

	print_r($lectura);
	
	// 2.- cURL de actualización de Autorreversa en los Settings

	if ($dataSettings->direction != $dir) {
		$url = "https://dta-agricola.firebaseio.com/systems/$id/settings/direction.json";
		$newData = '"' . $dir . '"';
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		// curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
		curl_setopt($ch, CURLOPT_POSTFIELDS, $newData);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
		$response = curl_exec($ch);
		if (curl_errno($ch)) {
			// echo 'Error: '.curl_errno($ch);
			echo 'Error';
		}
		curl_close($ch);
	}

	// 3.- Comprobar estado anterior (Logs):

	$url = "https://dta-agricola.firebaseio.com/systems/$id/logs.json";
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	// curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$response = curl_exec($ch);
	curl_close($ch);
	$json = get_object_vars(json_decode($response));
	$status = "";
	$initialDate = "";
	foreach ($json as $value) {
		$item = (object) $value;
		$status = $item->{'state'};
		$initialDate = $item->{'date'};
		$voltage = $item->{'voltage'};
	}
	$zona = $localZone . ' hours';
	$dateTime = new DateTime();
	$dateTime->modify($zona);
	$date = $dateTime->format('Ymd hia');

	$indexes = array_keys($json);
	$index = "";
	foreach ($indexes as $value) {
		$index = $value;
	}

	// 4.- Actualizar estado actual del dispositivo e información de los sensores

	if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
		$key = "";
		// if ($status == $_GET["st"] && $voltage == $_GET["vo"]) {
		// 	$key = "/$index";
		// }
		if ($index) {
			$key = "/$index";
		}
		$dataUpdate = '{';
		if (!$key || ($key && $_GET["st"] && $_GET["st"] == "ON" && $_GET["vo"] && ($_GET["vo"] == "false" || ($_GET["vo"] == "true" && $_GET["sa"] && $_GET["sa"] == "false")))) {
			$dataUpdate .= '"date":"' . $date . '"';
		} else {
			$dataUpdate .= '"date":"' . $initialDate . '"';
		}
		$dataUpdate .= ',"update":"' . $date . '"';
		if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) { $dataUpdate .= ',"state":"' . $_GET["st"] . '"'; }
		if ($_GET["sa"] && ($_GET["sa"] == "true" || $_GET["sa"] == "false")) { 
			if ($_GET["st"] && $_GET["st"] == "ON") {
				$dataUpdate .= ',"safety":"' . $_GET["sa"] . '"'; 
			} else {
				$dataUpdate .= ',"safety":"true"';
			}
		}
		if ($_GET["di"] && ($_GET["di"] == "FF" || $_GET["di"] == "RR")) { $dataUpdate .= ',"direction":"' . $_GET["di"] . '"'; }
		if ($_GET["vo"] && ($_GET["vo"] == "true" || $_GET["vo"] == "false")) { $dataUpdate .= ',"voltage":"' . $_GET["vo"] . '"'; }
		if ($_GET["sp"]) { $dataUpdate .= ',"speed":"' . $_GET["sp"] . '"'; }
		if ($_GET["pr"]) { $dataUpdate .= ',"presion":"' . $_GET["pr"] . '"'; }
		if ($_GET["po"]) { $dataUpdate .= ',"position":"' . $_GET["po"] . '"'; }
		if ($_GET["la"]) { $dataUpdate .= ',"latitude":"' . $_GET["la"] . '"'; }
		if ($_GET["lo"]) { $dataUpdate .= ',"longitude":"' . $_GET["lo"] . '"'; }
		if ($_GET["er"]) { $dataUpdate .= ',"error":"' . $_GET["er"] . '"'; }
		if ($_GET["si"]) { $dataUpdate .= ',"signal":"' . $_GET["si"] . '"'; }
		if ($_GET["ar"] && ($_GET["ar"] == "ON" || $_GET["ar"] == "OFF")) { $dataUpdate .= ',"autoreverse":"' . $_GET["ar"] . '"'; }
		if ($_GET["rx"] && ($_GET["rx"] == "Ok" || $_GET["rx"] == "Er")) { $dataUpdate .= ',"reception":"' . $_GET["rx"] . '"'; }
		$dataUpdate .= '}';

		// 4.1.- cURL de actualización de Logs

		$url = "https://dta-agricola.firebaseio.com/systems/$id/logs$key.json";
		// print("URL: " . $url);
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		// curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		if ($key) {
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
			// print("PUT");
		} else {
			curl_setopt($ch, CURLOPT_POST, 1);
			// print("POST");
		}
		curl_setopt($ch, CURLOPT_POSTFIELDS, $dataUpdate);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
		$response = curl_exec($ch);
		if (curl_errno($ch)) {
			// echo 'Error: '.curl_errno($ch);
			echo 'Error';
		}
		curl_close($ch);

	}
			
	
?>