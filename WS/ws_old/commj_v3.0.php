<?php

    #region 0.- Configuración
	function config() {
		$id = $_GET["id"];
		$baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
		return $baseUrl;
	}

    #endregion 0.- Configuración

	#region 1.- Funciones cURLs
    
        function getcURLData($url) {                    // Lee registro
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $response = curl_exec($ch);
            curl_close($ch);
            return json_decode($response);
        }
    
        function putcURLData($url, $data) {             // Actualiza registro
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

	function getNewHour($hour, $millis) {
		$newHour = new DateTime($hour);
		$newHour->modify("+{$millis} milliseconds");
		$newHour = $newHour->format('H:i');
		return $newHour;
	}

	function getStatus($dataSettings, $localZone) {
		$status = $dataSettings->status;
		if ($status) {
			$date = getDateTime($localZone)->format('Y-m-d');
			$time = getDateTime($localZone)->format('H:i');
			for ($i = 0; $i < $dataSettings->length; $i++) {
				$p = "p" . $i;
				$plot = $dataSettings->plots->$p;
				if ($plot->irrigationPlan == 0) {
					return "ON";
				} elseif ($plot->schedule) {
					// print_r("Status: ");
					foreach ($plot->schedule as $schedule) {
						$newHour = getNewHour($schedule->time, $schedule->value ? $schedule->value : 0);
						// print_r($schedule->time . "<=" . $time . "<" . $newHour . " => " . ($schedule->date == $date && $schedule->time <= $time && $time < $newHour) . " | ");
						if ($schedule->date == $date && $schedule->time <= $time && $time < $newHour) {
							return "ON";
						}
					}
					// print_r("\n\r");
				}
			}
			return "OFF";
		}
		return $status;
	}
    
	function sendSettings($baseUrl, $dataSettings, $localZone, $activationTime) {
		$status = getStatus($dataSettings, $localZone);
		$lectura = "\"" . $status . "\"" . $dataSettings->length;
		$date = getDateTime($localZone)->format('Y-m-d');
		$time = getDateTime($localZone)->format('H:i');
		for ($i = 0; $i < $dataSettings->length; $i++) {
			$p = "p" . $i;
			$plot = $dataSettings->plots->$p;
			$value = 0;
			if ($plot->irrigationPlan == 0) {
				$value = $plot->value;
			} elseif ($status && $plot->schedule) {
				// print_r("Timer: ");
				foreach ($plot->schedule as $schedule) {
					$newHour = getNewHour($schedule->time, $schedule->value ? $schedule->value : 0);
					// print_r($schedule->time . "<=" . $time . "<" . $newHour . " => " . ($schedule->date == $date && $schedule->time <= $time && $time < $newHour) . " | ");
					if ($schedule->date == $date && $schedule->time <= $time && $time < $newHour) {
						$value = $schedule->value;
					}
				}
			}
			$lectura .= "\"" . $value;
			$lectura .= "\"" . $plot->valve;
		}
		$lectura .=  "\"";
		print_r($lectura);
	}

    #endregion 4.- Enviar Settings al dispositivo

	#region 5.- Actualizar estado del dispositivo e información de los sensores

	function updateLog($status, $index, $initialDate, $localZone, $baseUrl) {
		if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
			$key = ($status == $_GET["st"]) ? "/$index" : "";
            $date = getDateTime($localZone)->format('Ymd hia');

			$dataUpdate = '{';
			$dataUpdate .= '"date":"' . (($key) ? $initialDate : $date) . '"';
			$dataUpdate .= ',"update":"' . $date . '"';
			$dataUpdate .= ',"state":"' . $_GET["st"] . '"'; 
			$dataUpdate .= ',"signal":"' . ($_GET["si"] ? $_GET["si"] : "") . '"';
			$dataUpdate .= ',"reception":"' . (($_GET["rx"] && ($_GET["rx"] == "Ok" || $_GET["rx"] == "Er")) ? $_GET["rx"] : "") . '"';
			$dataUpdate .= '}';

			$url = $baseUrl . "logs$key.json";              	// 5.1.- cURL de actualización de Logs
			if ($key) {
				putcURLData($url, $dataUpdate);             	// Actualiza registro
			} else {
				postcURLData($url, $dataUpdate);            	// Nuevo registro
			}
		}
	}

	#endregion 5.- Actualizar estado del dispositivo e información de los sensores
	
    #region 6.- Programa principal

	function main() {
		$baseUrl = config();                                                                // 0. Configuración
		$dataSettings = getcURLData($baseUrl . "settings.json");                            // 1. Optener settings
        $localZone = getLocalZone($dataSettings);                                           // 2. Zona horaria
		list($status, $index, $initialDate, $activationTime) = checkLastState($baseUrl);    // 3. Estado anterior
		sendSettings($baseUrl, $dataSettings, $localZone, $activationTime);                 // 4. Enviar settings
		updateLog($status, $index, $initialDate, $localZone, $baseUrl);                     // 5. Actualizar estado
	}
    
    #endregion 6.- Programa principal

	main();

?>