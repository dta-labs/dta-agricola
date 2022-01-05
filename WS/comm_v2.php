<?php
	$id = $_GET["id"];

	// Consultar configuración

	$url = "https://dta-agricola.firebaseio.com/systems/$id/settings.json";
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$response = curl_exec($ch);
	curl_close($ch);

	$data = json_decode($response);
	//print_r($data);
	$timeZone = $data->zona; // Zona horaria
	$summerHour = $data->summerHour; // Horario de verano
	$localZone = intval($timeZone) + intval($summerHour);

	$lectura = "\"" . $data->status . "\"" . $data->direction . "\"" . $data->sensorPresion . "\"" . $data->autoreverse;
	$lectura .=  "\"" . $data->latitude;
	$lectura .=  "\"" . $data->longitude;
	$lectura .=  "\"" . $data->type;
	$lectura .=  "\"" . $data->plansLength;
	for ($i = 0; $i < intval($data->plansLength); $i++) {
		$p = "p" . $i;
		$lectura .= "\"" . $data->plans->$p->starAngle . "\"" . $data->plans->$p->endAngle . "\"" . $data->plans->$p->value;
		if ($data->plans->$p->endGun && $data->plans->$p->endGun == "true") {
			$lectura .= "\"T";
		} else {
			$lectura .= "\"F";
		}
	}
	$lectura .=  "\"";

	print_r($lectura);

	// Comprobar estado anterior

	$url = "https://dta-agricola.firebaseio.com/systems/$id/logs.json";
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
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

	// Actualizar estado actual del dispositivo e información de los sensores

	if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
		$key = "";
		if ($status == $_GET["st"] && $voltage == $_GET["vo"]) {
			$key = "/$index";
		}
		$data = '{';
		if ($key) {
			$data .= '"date":"' . $initialDate . '"';
		} else {
			$data .= '"date":"' . $date . '"';
		}
		$data .= ',"update":"' . $date . '"';
		if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) { $data .= ',"state":"' . $_GET["st"] . '"'; }
		if ($_GET["sa"] && ($_GET["sa"] == "true" || $_GET["sa"] == "false")) { $data .= ',"safety":"' . $_GET["sa"] . '"'; }
		if ($_GET["di"] && ($_GET["di"] == "FF" || $_GET["di"] == "RR")) { $data .= ',"direction":"' . $_GET["di"] . '"'; }
		if ($_GET["vo"] && ($_GET["vo"] == "true" || $_GET["vo"] == "false")) { $data .= ',"voltage":"' . $_GET["vo"] . '"'; }
		if ($_GET["sp"]) { $data .= ',"speed":"' . $_GET["sp"] . '"'; }
		if ($_GET["pr"]) { $data .= ',"presion":"' . $_GET["pr"] . '"'; }
		if ($_GET["po"]) { $data .= ',"position":"' . $_GET["po"] . '"'; }
		if ($_GET["la"]) { $data .= ',"latitude":"' . $_GET["la"] . '"'; }
		if ($_GET["lo"]) { $data .= ',"longitude":"' . $_GET["lo"] . '"'; }
		if ($_GET["er"]) { $data .= ',"error":"' . $_GET["er"] . '"'; }
		if ($_GET["si"]) { $data .= ',"signal":"' . $_GET["si"] . '"'; }
		if ($_GET["ar"] && ($_GET["ar"] == "ON" || $_GET["ar"] == "OFF")) { $data .= ',"autoreverse":"' . $_GET["ar"] . '"'; }
		if ($_GET["rx"] && ($_GET["rx"] == "Ok" || $_GET["rx"] == "Er")) { $data .= ',"reception":"' . $_GET["rx"] . '"'; }
		//if ($_GET["position"]) { $data .= ',"position":"' . $_GET["position"] . '"'; }
		//if ($_GET["temperature"]) { $data .= ',"temperature":"' . $_GET["temperature"] . '"'; }
		//if ($_GET["humidity"]) { $data .= ',"humidity":"' . $_GET["humidity"] . '"'; }
		//if ($_GET["presion"]) { $data .= ',"presion":"' . $_GET["presion"] . '"'; }
		//if ($_GET["flow"]) { $data .= ',"flow":"' . $_GET["flow"] . '"'; }
		//if ($_GET["volume"]) { $data .= ',"volume":"' . $_GET["volume"] . '"'; }
		$data .= '}';

		// cURL de actualización de Logs

		$url = "https://dta-agricola.firebaseio.com/systems/$id/logs$key.json";
		// print("URL: " . $url);
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		if ($key) {
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
			// print("PUT");
		} else {
			curl_setopt($ch, CURLOPT_POST, 1);
			// print("POST");
		}
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
		$response = curl_exec($ch);
		if (curl_errno($ch)) {
			// echo 'Error: '.curl_errno($ch);
			echo 'Error';
		}
		curl_close($ch);

		// cURL de actualización de Settings

		if ($_GET["ar"] && $_GET["ar"] == "ON") {
			$url = "https://dta-agricola.firebaseio.com/systems/$id/settings/direction.json";
			$data = '"' . $_GET["di"] . '"';
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
			curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
			curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
			$response = curl_exec($ch);
			if (curl_errno($ch)) {
			// echo 'Error: '.curl_errno($ch);
			echo 'Error';
			}
			curl_close($ch);
		}

		if (($key == "") && ($_GET["st"] && $_GET["st"] == "OFF")) {
			$url = "https://dta-agricola.firebaseio.com/systems/$id/settings/status.json";
			$data = '"OFF"';
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
			curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
			curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
			$response = curl_exec($ch);
			if (curl_errno($ch)) {
			// echo 'Error: '.curl_errno($ch);
			echo 'Error';
			}
			curl_close($ch);
		}
	}
?>