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
	$timeZone = $data->zona ? $data->zona : 0; // Zona horaria
	$summerHour = $data->summerHour ? $data->summerHour : 0; // Horario de verano
	$localZone = intval($timeZone) + intval($summerHour);
	
	$lectura = "\"" . $data->status . "\"" . $data->position;
	for ($i = 0; $i < 7; $i++) {
		$p = "p" . $i;
		$lectura .= "\"" . $data->plots->$p->value;
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
		if ($status == $_GET["st"]) {
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
		if ($_GET["tm"]) { $data .= ',"activationTime":"' . $_GET["tm"] . '"'; }
		if ($_GET["po"]) { $data .= ',"plot":"' . $_GET["po"] . '"'; }
		if ($_GET["si"]) { $data .= ',"signal":"' . $_GET["si"] . '"'; }
		if ($_GET["rx"] && ($_GET["rx"] == "Ok" || $_GET["rx"] == "Er")) { $data .= ',"reception":"' . $_GET["rx"] . '"'; }
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

	}

?>