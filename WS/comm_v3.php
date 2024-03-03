<?php

    #region 0.- Configuración
    
    function config(){
        $id = $_GET["id"];
        $baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
        return $baseUrl;
    }

    #endregion 0.- Configuración

    #region 1.- Funciones cURLs

    function getcURLData($url) {                    // Leer registro
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response);
    }

    function putcURLData($url, $data) {             // Actualizar registro
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
		$response = curl_exec($ch);
		if (curl_errno($ch)) {
			echo 'Error';
		}
		curl_close($ch);
        return $response;
    }

    function postcURLData($url, $data) {            // Nuevo registro
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
		$response = curl_exec($ch);
		if (curl_errno($ch)) {
			echo 'Error';
		}
		curl_close($ch);
        return $response;
    }

    #endregion 1.- Funciones cURLs

    #region 2.- Consultar Settings

    function getPlans($data) {
        $plans = "";
        for ($i = 0; $i < intval($data->plansLength); $i++) {
            $p = "p" . $i;
            $starAngle = $data->plans->$p->starAngle;
            $endAngle = $data->plans->$p->endAngle;
            $value = $data->plans->$p->value;
            $endGun = "F";
            if ($data->plans->$p->endGun && $data->plans->$p->endGun == "true") {
                $endGun = "T";
            }
            $plans .= "\"" . $starAngle . "\"" . $endAngle . "\"" . $value . "\"" . $endGun;
        }
        return $plans;
    }

    function sendSettings($dataSettings) {
        $lectura  = "\"" . $dataSettings->status;
        $lectura .= "\"" . $dataSettings->direction;
        $lectura .= "\"" . $dataSettings->sensorPresion;
        $lectura .= "\"" . $dataSettings->autoreverse;
        $lectura .= "\"" . $dataSettings->latitude;
        $lectura .= "\"" . $dataSettings->longitude;
        $lectura .= "\"" . $dataSettings->type;
        $lectura .= "\"" . $dataSettings->plansLength;
        $lectura .= getPlans($dataSettings);
        $lectura .= "\"";   
        print_r($lectura);
    }

    #endregion 2.- Consultar Settings

    #region 3.- Comprobar estado anterior (Logs)

    function checkLastState($baseUrl, $dataSettings) {
        $timeZone = $dataSettings->zona; 					// Zona horaria
        $summerHour = $dataSettings->summerHour; 			// Horario de verano
        $localZone = intval($timeZone) + intval($summerHour);

        $log = get_object_vars(getcURLData($baseUrl . "logs.json?orderBy=\"update\"&limitToLast=1"));
        $index = $log ? end(array_keys($log)) : "";
        $status = $log ? $log[$index]->{'state'} : "";
        $safety = $log ? $log[$index]->{'safety'} : "";
        $voltage = $log ? $log[$index]->{'voltage'} : "";
        $initialDate = $log ? $log[$index]->{'date'} : "";

        $zona = $localZone . ' hours';
        $dateTime = new DateTime();
        $dateTime->modify($zona);
        $date = $dateTime->format('Ymd H:i');
        return [$index, $status, $safety, $voltage, $initialDate, $date];
    }

    #endregion 3.- Comprobar estado anterior (Logs)

    #region 4.- Actualizar estado del dispositivo

    function updateLog($index, $status, $safety, $voltage, $initialDate, $date, $baseUrl) {
        if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
            $key = "";
            if ($status == $_GET["st"] && $voltage == $_GET["vo"]) { $key = "/$index"; }
            $dataUpdate = '{';
            $dataUpdate .= '"date":"' . ($key ? $initialDate : $date) . '"';
            $dataUpdate .= ',"update":"' . $date . '"';
            $dataUpdate .= ',"state":"' . $_GET["st"] . '"';
            $dataUpdate .= ($_GET["sa"] && ($_GET["sa"] == "true" || $_GET["sa"] == "false")) ? ',"safety":"' . $_GET["sa"] . '"' : ""; 
            $dataUpdate .= ($_GET["di"] && ($_GET["di"] == "FF" || $_GET["di"] == "RR")) ? ',"direction":"' . $_GET["di"] . '"' : ""; 
            $dataUpdate .= ($_GET["vo"] && ($_GET["vo"] == "true" || $_GET["vo"] == "false")) ? ',"voltage":"' . $_GET["vo"] . '"' : ""; 
            $dataUpdate .= ($_GET["sp"]) ? ',"speed":"' . $_GET["sp"] . '"' : ""; 
            $dataUpdate .= ($_GET["pr"]) ? ',"presion":"' . $_GET["pr"] . '"' : ""; 
            $dataUpdate .= ($_GET["po"]) ? ',"position":"' . $_GET["po"] . '"' : ""; 
            $dataUpdate .= ($_GET["la"]) ? ',"latitude":"' . $_GET["la"] . '"' : ""; 
            $dataUpdate .= ($_GET["lo"]) ? ',"longitude":"' . $_GET["lo"] . '"' : ""; 
            $dataUpdate .= ($_GET["er"]) ? ',"error":"' . $_GET["er"] . '"' : ""; 
            $dataUpdate .= ($_GET["si"]) ? ',"signal":"' . $_GET["si"] . '"' : ""; 
            $dataUpdate .= ($_GET["ar"] && ($_GET["ar"] == "ON" || $_GET["ar"] == "OFF")) ? ',"autoreverse":"' . $_GET["ar"] . '"' : ""; 
            $dataUpdate .= ($_GET["rx"] && ($_GET["rx"] == "Ok" || $_GET["rx"] == "Er")) ? ',"reception":"' . $_GET["rx"] . '"' : ""; 
            $dataUpdate .= '}';
    
            $url = $baseUrl . "logs$key.json";                                                      // 5.1.- cURL de actualización de Logs
            if ($key) {
                putcURLData($url, $dataUpdate);                                                     // Actualiza registro
            } else {
                postcURLData($url, $dataUpdate);                                                    // Nuevo registro
            }

            if ($status != $_GET["st"] && $_GET["st"] == "OFF" && $_GET["sa"] == "false") {         // 5.2.- cURL de actualización de Settings
                $url = $baseUrl . "settings/status.json";
                putcURLData($url, '"OFF"');
            }

        }
    }

    #endregion 4.- Actualizar estado del dispositivo

    #region 5.- Programa principal
    
    function main() {
        $baseUrl = config();
        $dataSettings = getcURLData($baseUrl . "settings.json");
        sendSettings($dataSettings);
        list($index, $status, $safety ,$voltage, $initialDate, $date) = checkLastState($baseUrl, $dataSettings);
        updateLog($index, $status, $safety, $voltage, $initialDate, $date, $baseUrl);
    }

    #endregion 5.- Programa principal
	
    main();

?>