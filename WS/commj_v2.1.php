<?php

    #region 0.- Configuración
	function config() {
        $apiKey = "AIzaSyBGhhdWhG7bD4QBkjK5IlXgiGVkoUv70KM";
		$headers = array('Authorization: key=' . $apiKey, 'Content-Type: application/json');
		$id = $_GET["id"];
		$baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
		return $baseUrl;
	}

    #endregion 0.- Configuración

	#region 1.- Funciones cURLs
    
        function getcURLData($url) {                    // Lee registro
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            // curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $response = curl_exec($ch);
            curl_close($ch);
            return json_decode($response);
        }
    
        function putcURLData($url, $data) {             // Actualiza registro
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
    
        function postcURLData($url, $data) {            // Nuevo registro
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

	#endregion 1.- Funciones cURLs

	#region 2.- Consultar zona horaria

    function getLocalZone($dataSettings) {
        $timeZone = $dataSettings->zona ? $dataSettings->zona : 0; // Zona horaria
		$summerHour = $dataSettings->summerHour ? $dataSettings->summerHour : 0; // Horario de verano
		$localZone = intval($timeZone) + intval($summerHour);
        return $localZone;
    }

	function getDateTime($localZone) {
		$zona = $localZone . ' hours';
		$dateTime = new DateTime();
		$dateTime->modify($zona);
		return $dateTime;
	}

	#endregion 2.- Consultar zona horaria

	#region 3.- Comprobar estado anterior (Logs)

	function checkLastState($baseUrl) {
		$log = get_object_vars(getcURLData($baseUrl . "logs.json?orderBy=\"update\"&limitToLast=1"));
        $index = $log ? end(array_keys($log)) : "";
        $status = $log ? $log[$index]->{'state'} : "";
		$initialDate = $log ? $log[$index]->{'date'} : "";
		$activationTime = $log ? $log[$index]->{'activationTime'} : "";
		return [$status, $index, $initialDate, $activationTime];
	}

	#endregion 3.- Comprobar estado anterior (Logs)

    #region 4.- Enviar Settings al dispositivo 

	function getAutoreverse($dataSettings, $localZone) {
		$autoreverse = $dataSettings->autoreverse;
		if ($autoreverse == "OFF" && $dataSettings->isScheduled) {
			$date = getDateTime($localZone)->format('Y-m-d');
			$time = getDateTime($localZone)->format('H:i');
			if ($dataSettings->position == 0 || $dataSettings->position == $dataSettings->length) {
				foreach ($dataSettings->schedule as $schedule) {
					if ($date == $schedule->date && $time == $schedule->time) {
						return "ON";
					}
				}
			}
		}
		return $autoreverse;
	}

	function updateStatus($baseUrl, $dataSettings, $autoreverse, $activationTime) {
        $status = $dataSettings->status;
        if ($autoreverse == "OFF" && !$dataSettings->isScheduled && $dataSettings->position == $dataSettings->length - 1) { 
            $p = "p" . ($dataSettings->position);
			$plotTimer = $dataSettings->plots->$p->value;
            if ($plotTimer <= $activationTime) {
                putcURLData($baseUrl . "settings/autoreverse.json", '"ON"');
                putcURLData($baseUrl . "settings/status.json", '"OFF"');
                return "OFF";
            }
		}
        return $status;
	}
    
	function sendSettings($baseUrl, $dataSettings, $localZone, $activationTime) {
        $autoreverse = getAutoreverse($dataSettings, $localZone);
		$status = updateStatus($baseUrl, $dataSettings, $autoreverse, $activationTime);
		$lectura = "\"" . $status . "\"" . $autoreverse . "\"" . $dataSettings->length . "\"" . $dataSettings->position;
		for ($i = 0; $i < $dataSettings->length; $i++) {
			$p = "p" . $i;
			$lectura .= "\"" . $dataSettings->plots->$p->value;
			$lectura .= "\"" . $dataSettings->plots->$p->valvle;
		}
		$lectura .=  "\"";
		print_r($lectura);
	}

    #endregion 4.- Enviar Settings al dispositivo

	#region 5.- Actualizar estado del dispositivo e información de los sensores

	function updateLog($status, $index, $initialDate, $localZone, $baseUrl) {
		if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
			$key = "";
			if ($status == $_GET["st"]) {
				$key = "/$index";
			}
            $date = getDateTime($localZone)->format('Ymd hia');
			$dataUpdate = '{';
			if ($key) {
				$dataUpdate .= '"date":"' . $initialDate . '"';
			} else {
				$dataUpdate .= '"date":"' . $date . '"';
			}
			$dataUpdate .= ',"update":"' . $date . '"';
			if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) { $dataUpdate .= ',"state":"' . $_GET["st"] . '"'; }
			if ($_GET["tm"]) { $dataUpdate .= ',"activationTime":"' . $_GET["tm"] . '"'; }
			if ($_GET["po"]) { $dataUpdate .= ',"plot":"' . $_GET["po"] . '"'; }
			if ($_GET["si"]) { $dataUpdate .= ',"signal":"' . $_GET["si"] . '"'; }
			if ($_GET["rx"] && ($_GET["rx"] == "Ok" || $_GET["rx"] == "Er")) { $dataUpdate .= ',"reception":"' . $_GET["rx"] . '"'; }
			$dataUpdate .= '}';

			$url = $baseUrl . "logs$key.json";              // 4.1.- cURL de actualización de Logs
			if ($key) {
				putcURLData($url, $dataUpdate);             // Actualiza registro
			} else {
				postcURLData($url, $dataUpdate);            // Nuevo registro
			}

			$url = $baseUrl . "settings/position.json";     // 4.2.- cURL de actualización de Settings
			putcURLData($url, $_GET["po"]);                 // Actualiza registro
		}
	}

	#endregion 5.- Actualizar estado del dispositivo e información de los sensores
	
    #region 6.- Programa principal

	function main() {
		$baseUrl = config();                                                                            // 0. Configuración
		$dataSettings = getcURLData($baseUrl . "settings.json");                                        // 1. Optener settings
        $localZone = getLocalZone($dataSettings);                                                       // 2. Zona horaria
		list($status, $index, $initialDate, $activationTime) = checkLastState($baseUrl, $localZone);    // 3. Estado anterior
		sendSettings($baseUrl, $dataSettings, $localZone, $activationTime);                             // 4. Enviar settings
		updateLog($status, $index, $initialDate, $localZone, $baseUrl);                                 // 5. Actualizar estado
	}
    
    #endregion 6.- Programa principal

	main();

?>