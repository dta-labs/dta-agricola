<?php
	$id = $_GET["id"]; 	
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
	print_r($response);

	// $data = json_decode($response, true);
	// foreach ($data as $key => $value) {
	// 	echo $data[$key]["state"];
	// }
?>