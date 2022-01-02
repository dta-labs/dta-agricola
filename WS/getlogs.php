<?php
	$id = $_GET["id"]; 	
	$url = "https://dta-agricola.firebaseio.com/systems/$id/logs.json";
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$response = curl_exec($ch);
	curl_close($ch);
	$json = get_object_vars(json_decode($response));
	$status = "";
	foreach ($json as $value) {
		$item = (object) $value;
		//$cadena = "Log: '" . $item->{'date'} . " estado: " . $item->{'state'} . "\n";
		//print ($cadena);
		$status = $item->{'state'};
	}
	$indexes = array_keys($json);
	$index = "";
	foreach ($indexes as $value) {
		$index = $value;
	}
	print ("Estado actual: " . $status);
	print ("Indice: " . $index);
?>