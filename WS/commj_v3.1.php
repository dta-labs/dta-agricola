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
		$dateTime->modify($zona);		// PHP Warning:  DateTime::modify(): Failed to parse time string ( hours) at position 0 (h): The timezone could not be found in the database
		return $dateTime;
	}

	#endregion 2.- Consultar zona horaria

	#region 3.- Comprobar estado anterior (Logs)

	function checkLastState($baseUrl) {
		$log = get_object_vars(getcURLData($baseUrl . "logs.json?orderBy=\"update\"&limitToLast=1"));
        $index = $log ? end(array_keys($log)) : "";
        $status = $log ? $log[$index]->{'state'} : "";
		$initialDate = $log ? $log[$index]->{'date'} : "";
		return [$status, $index, $initialDate];
	}

	#endregion 3.- Comprobar estado anterior (Logs)

    #region 4.- Enviar Settings al dispositivo 

	function getNewHour($hour, $millis) {
		$newHour = new DateTime($hour);
		$newHour->modify("+{$millis} milliseconds");
		$newHour = $newHour->format('H:i');
		return $newHour;
	}

	function getValueOnSchedule($plot, $date, $time) {
		if ($plot->schedule) {
			// print_r("Timer: ");
			foreach ($plot->schedule as $schedule) {
				$newHour = getNewHour($schedule->time, $schedule->value ? $schedule->value : 0);
				// print_r($schedule->time . "<=" . $time . "<" . $newHour . " => " . ($schedule->date == $date && $schedule->time <= $time && $time < $newHour) . " | ");
				if ($schedule->date == $date && $schedule->time <= $time && $time < $newHour) {
					return $schedule->value;
				}
			}
		}
		return 0;
	}
    
	function getValueOnDemand($plot, $date, $time) {
		return 0;
	}
    
	function getValueWidthAI($plot, $date, $time) {
		return 0;
	}
    
	function sendSettings($dataSettings, $localZone) {
		$sumOfValues = 0; 
		$date = getDateTime($localZone)->format('Y-m-d');
		$time = getDateTime($localZone)->format('H:i');
		$lectura_values = "";
		for ($i = 0; $i < $dataSettings->length; $i++) {
			$p = "p" . $i;
			$plot = $dataSettings->plots->$p;
			$value = 0;
			switch ($plot->irrigationPlan) {
				case 0:													// Riego manual
					$value = $plot->forcedStart == 1 ? $plot->value : 0;
					break;
				case 1:													// Riego planificado
					$value = getValueOnSchedule($plot, $date, $time);
					break;
				case 2:													// Riego a demanda
					$value = getValueOnDemand($plot, $date, $time);
					break;
				case 3:													// Riego inteligente
					$value = getValueWidthAI($plot, $date, $time);
					break;
			}
			$sumOfValues += intval($value);
			$lectura_values .= "\"" . $value . "\"" . $plot->valve;
		}
		$status = $sumOfValues == 0 ? "OFF" : "ON";
		$lectura = "\"" . $status . "\"" . $dataSettings->length . $lectura_values . "\"";
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
		$baseUrl = config();                                                // 0. Configuración
		$dataSettings = getcURLData($baseUrl . "settings.json");            // 1. Optener settings
        $localZone = getLocalZone($dataSettings);                           // 2. Zona horaria
		list($status, $index, $initialDate) = checkLastState($baseUrl);    	// 3. Estado anterior
		sendSettings($dataSettings, $localZone);        					// 4. Enviar settings
		updateLog($status, $index, $initialDate, $localZone, $baseUrl);     // 5. Actualizar estado
	}
    
    #endregion 6.- Programa principal

	main();

?>