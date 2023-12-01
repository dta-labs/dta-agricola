<?php
	function config(){
        $apiKey = "AIzaSyBGhhdWhG7bD4QBkjK5IlXgiGVkoUv70KM";
        $headers = array('Authorization: key='.$apiKey,'Content-Type: application/json');
        $id = $_GET["id"];
        $baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
        return $baseUrl;
    }

    // 0.- Funciones cURLs

    function getcURLData($url) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        // curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response);
    }

    function putcURLData($url, $data) {
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		// curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
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
        return $response;
    }

    function postcURLData($url, $data) {
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		// curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
		$response = curl_exec($ch);
		if (curl_errno($ch)) {
			// echo 'Error: '.curl_errno($ch);
			echo 'Error';
		}
		curl_close($ch);
        return $response;
    }

	// 1.- Consultar configuración (Settings) y enviar las órdenes al dispositivo:

    function getPlans($data, $dir) {
        $plans = "";
        for ($i = 0; $i < intval($data->plansLength); $i++) {
            $p = "p" . $i;
            $starAngle = $data->plans->$p->starAngle;
            $endAngle = $data->plans->$p->endAngle;
            $value = $data->plans->$p->value;
            $endGun = "F";
            // if ($data->status == "ON" && $data->autoreverse == "ON") {
            //     $po = intval($_GET["po"]);
            //     if (intval($starAngle) <= $po && $po < intval($endAngle) && $value == "0") {
            //         $dir = ($data->direction == "FF") ? "RR" : "FF";
            //         $value = "100";
            //     }
            // }
            if ($data->plans->$p->endGun && $data->plans->$p->endGun == "true") {
                $endGun = "T";
            }
            $plans .= "\"" . $starAngle . "\"" . $endAngle . "\"" . $value . "\"" . $endGun;
        }
        return [$plans, $dir];
    }

    function sendSettings($dataSettings) {
        $timeZone = $dataSettings->zona; 					// Zona horaria
        $summerHour = $dataSettings->summerHour; 			// Horario de verano
        $localZone = intval($timeZone) + intval($summerHour);
        $lectura  = "\"" . $dataSettings->status;
        $dir = $dataSettings->direction;
        list($_plans, $_dir) = getPlans($dataSettings, $dir);
        $lectura .= "\"" . $_dir;
        $lectura .= "\"" . $dataSettings->sensorPresion;
        $lectura .= "\"" . $dataSettings->autoreverse;
        $lectura .= "\"" . $dataSettings->latitude;
        $lectura .= "\"" . $dataSettings->longitude;
        $lectura .= "\"" . $dataSettings->type;
        $lectura .= "\"" . $dataSettings->plansLength;
        $lectura .= $_plans;
        $lectura .= "\"";   
        print_r($lectura);
        return [$dir, $localZone];
    }

	// 2.- cURL de actualización de Autorreversa en los Settings

    function autorreversa($dataSettings, $dir, $baseUrl) {
        if ($dataSettings->direction != $dir) {
            $newData = '"' . $dir . '"';
            putcURLData($baseUrl . "settings/direction.json", $newData);
        }
    }

	// 3.- Comprobar estado anterior (Logs):

    function checkLastState($baseUrl, $localZone) {
        $json = get_object_vars(getcURLData($baseUrl . "logs.json"));
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
        return [$status, $voltage, $index, $initialDate, $date];
    }

	// 4.- Actualizar estado actual del dispositivo e información de los sensores

    function updateLog($status, $voltage, $index, $initialDate, $date, $baseUrl) {
        if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
            $key = "";
            if ($status == $_GET["st"] && $voltage == $_GET["vo"]) { $key = "/$index"; }
            $dataUpdate = '{';
            $dataUpdate .= '"date":"' . ($key ? $initialDate : $date) . '"';
            $dataUpdate .= ',"update":"' . $date . '"';
            $dataUpdate .= ',"state":"' . $_GET["st"] . '"';
            if ($_GET["sa"] && ($_GET["sa"] == "true" || $_GET["sa"] == "false")) { $dataUpdate .= ',"safety":"' . $_GET["sa"] . '"'; }
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
    
            $url = $baseUrl . "logs$key.json";      // 4.1.- cURL de actualización de Logs
            if ($key) {
                putcURLData($url, $dataUpdate);     // Actualiza registro
            } else {
                postcURLData($url, $dataUpdate);    // Nuevo registro
            }
        }
    }
	
    // 5.- Programa principal
    
    function main() {
        $baseUrl = config();
        $dataSettings = getcURLData($baseUrl . "settings.json");
        list($dir, $localZone) = sendSettings($dataSettings);
        autorreversa($dataSettings, $dir, $baseUrl);
        list($status, $voltage, $index, $initialDate, $date) = checkLastState($baseUrl, $localZone);
        updateLog($status, $voltage, $index, $initialDate, $date, $baseUrl);
    }
	
    main();

?>