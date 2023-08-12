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
	$timeZone = $data->zona;				// Chihuahua
	
	// irrigation,status,direction,velocity,type,fertilization,length,plansLength,startAngle,endAngle,type,value
	print_r("\"" . $data->irrigation . "\"" . $data->status . "\"" . $data->plots . "\"" . $data->velocity . "\"" . $data->position . "\"");

	$zona = $timeZone . ' hours';
	$dateTime = new DateTime();
	$dateTime->modify($zona);
	$date = $dateTime->format('Ymd hia');
	
	// Actualizar estado actual del dispositivo e información de los sensores
		
	//if ($_GET["status"] && ($_GET["status"] == "ON" || $_GET["status"] == "OFF")) {
		$data = '{"update":"' . $date . '",';
		$data .= '"state":"' . $_GET["status"] . '",'; 
		$data .= '"plots":"' . $_GET["plots"] . '",'; 
		$data .= '"velocity":"' . $_GET["velocity"] . '",'; 
		$data .= '"position":"' . $_GET["position"] . '"'; 
		$data .= '}';
		// cURL de actualización
		$url = "https://dta-agricola.firebaseio.com/systems/$id/log.json";
		// print("URL: " . $url);
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
		//curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
		$response = curl_exec($ch);
		if (curl_errno($ch)) {
			// echo 'Error: '.curl_errno($ch);
			echo 'Error';
		}
		curl_close($ch);
	//}
	


?>