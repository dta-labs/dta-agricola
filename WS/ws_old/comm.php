<?php
	$id = $_GET["id"]; 	
	
	// Consultar configuración
	
	$var = "";
	if ($_GET["var"]) {
		$var = "/" . $_GET["var"]; 	
	}
	$url = "https://dta-agricola.firebaseio.com/systems/$id/settings$var.json";
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$response = curl_exec($ch);
	curl_close($ch);

	$data = json_decode($response);
	$timeZone = $data->zona;				// Chihuahua
	
	// irrigation,status,direction,velocity,type,fertilization,length,plansLength,startAngle,endAngle,type,value
	print_r("\"" . $data->irrigation . "\"" . $data->status . "\"" . $data->direction . "\"" . $data->velocity . "\"" . $data->type . "\"" . $data->fertilization . "\"" . $data->length . "\"");
	//print_r("\"" . $data->irrigation . "\"" . $data->status . "\"" . $data->direction . "\"" . $data->velocity . "\"" . $data->type . "\"" . $data->fertilization . "\"" . $data->length . "\"" . $data->plansLength . "\"" . $data->starAngle . "\"" . $data->endAngle . "\"" . $data->type . "\"" . $data->value . "\"");

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
	$zona = $timeZone . ' hours';
	$dateTime = new DateTime();
	$dateTime->modify($zona);
	$date = $dateTime->format('Ymd hia');
	
	$indexes = array_keys($json);
	$index = "";
	foreach ($indexes as $value) {
		$index = $value;
	}

	// Actualizar estado actual del dispositivo e información de los sensores
		
	if ($_GET["status"] && ($_GET["status"] == "ON" || $_GET["status"] == "OFF")) {
		$key = "";
		if ($status == $_GET["status"]) {
			$key = "/$index";
		}
		$data = '{';
		if ($key) {
			$data .= '"date":"' . $initialDate . '"';
		} else {
			$data .= '"date":"' . $date . '"';
		}
		$data .= ',"update":"' . $date . '"';
		if ($_GET["status"] && ($_GET["status"] == "ON" || $_GET["status"] == "OFF")) { $data .= ',"state":"' . $_GET["status"] . '"'; }
		if ($_GET["direction"] && ($_GET["direction"] == "FF" || $_GET["direction"] == "RR")) { $data .= ',"direction":"' . $_GET["direction"] . '"'; }
		if ($_GET["speed"] && ($_GET["speed"] >= "0" && $_GET["speed"] < "360")) { $data .= ',"speed":"' . $_GET["speed"] . '"'; }
		if ($_GET["autorreverse"] && ($_GET["autorreverse"] == "ON" || $_GET["autorreverse"] == "OFF")) { $data .= ',"autorreverse":"' . $_GET["autorreverse"] . '"'; }
		if ($_GET["presion"]) { $data .= ',"presion":"' . $_GET["presion"] . '"'; }
		if ($_GET["position"]) { $data .= ',"position":"' . $_GET["position"] . '"'; }
		if ($_GET["safety"]) { $data .= ',"safety":"' . $_GET["safety"] . '"'; }
		if ($_GET["voltage"]) { $data .= ',"voltage":"' . $_GET["voltage"] . '"'; }
		//if ($_GET["position"]) { $data .= ',"position":"' . $_GET["position"] . '"'; }
		//if ($_GET["temperature"]) { $data .= ',"temperature":"' . $_GET["temperature"] . '"'; }
		//if ($_GET["humidity"]) { $data .= ',"humidity":"' . $_GET["humidity"] . '"'; }
		//if ($_GET["presion"]) { $data .= ',"presion":"' . $_GET["presion"] . '"'; }
		//if ($_GET["flow"]) { $data .= ',"flow":"' . $_GET["flow"] . '"'; }
		//if ($_GET["volume"]) { $data .= ',"volume":"' . $_GET["volume"] . '"'; }
		$data .= '}';
		// cURL de actualización
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
	}
	


?>