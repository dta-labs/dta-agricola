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
		$lastStatus = new stdClass();
        $lastStatus->index = !is_null($log) ? end(array_keys($log)) : "";
        $lastStatus->status = !is_null($log) ? $log[$lastStatus->index]->{'state'} : "";
        $lastStatus->initialDate = !is_null($log) ? $log[$lastStatus->index]->{'date'} : "";
		return $lastStatus;
	}

	#endregion 3.- Comprobar estado anterior (Logs)

    #region 4.- Enviar Settings al dispositivo 

	function getScheduleDateTime($schedule) {
		$scheduleDateTime = new DateTime($schedule->date);
		list($hour, $minutes) = explode(':', $schedule->time);
		$scheduleDateTime->setTime((int)$hour, (int)$minutes);
		return $scheduleDateTime;
	}

	function getNewTime($date, $millis) {
		$newTime = new DateTime($date->format('Y-m-d H:i'));
		$seconds = $millis / 1000;
		$interval = new DateInterval('PT' . $seconds . 'S');
		$newTime->add($interval);
		return $newTime;
	}

	function getValueOnSchedule($plot, $dateTime) {
		if ($plot->schedule && $plot->forcedStart == 1) {
			// print_r("Timer: ");
			foreach ($plot->schedule as $schedule) {
				$scheduleDateTime = getScheduleDateTime($schedule);
				$newDateTime = getNewTime($scheduleDateTime, $schedule->value ? $schedule->value : 0);
				// print_r($scheduleDateTime->format('Y-m-d H:i') . "<=" . $dateTime->format('Y-m-d H:i') . "<" . $newDateTime->format('Y-m-d H:i') . " => " . (($scheduleDateTime <= $dateTime && $dateTime < $newDateTime) ? "On" : "Off") . " | ");
				if ($scheduleDateTime <= $dateTime && $dateTime < $newDateTime) {
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
		$dateTime = getDateTime($localZone);
		$date = $dateTime->format('Y-m-d');
		$time = $dateTime->format('H:i');
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
					$value = getValueOnSchedule($plot, $dateTime);
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
		$lectura = "\"" . $status . "\"P\"" . $dataSettings->length . $lectura_values . "\"";
		print_r($lectura);
	}

    #endregion 4.- Enviar Settings al dispositivo

	#region 5.- Actualizar estado del dispositivo e información de los sensores

	function updateLog($lastStatus, $localZone, $baseUrl) {
		if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
			$key = ($lastStatus->status == $_GET["st"]) ? "/$lastStatus->index" : "";
            $date = getDateTime($localZone)->format('Ymd Hi');

			$dataUpdate = '{';
			$dataUpdate .= '"date":"' . (($key) ? $lastStatus->initialDate : $date) . '"';
			$dataUpdate .= ',"update":"' . $date . '"';
			$dataUpdate .= ',"state":"' . $_GET["st"] . '"'; 
			$dataUpdate .= ',"signal":"' . ($_GET["si"] ? $_GET["si"] : "") . '"';
			$dataUpdate .= ',"reception":"' . (($_GET["rx"] && ($_GET["rx"] == "Ok" || $_GET["rx"] == "Er")) ? $_GET["rx"] : "") . '"';
			$dataUpdate .= '}';

			$url = $baseUrl . "logs$key.json";              				// 5.1.- cURL de actualización de Logs
			if ($key) {
				putcURLData($url, $dataUpdate);             				// Actualiza registro
			} else {
				postcURLData($url, $dataUpdate);            				// Nuevo registro
			}
		}
	}

	#endregion 5.- Actualizar estado del dispositivo e información de los sensores
	
    #region 6.- Programa principal

	function main() {
		$baseUrl = config();                                                // 0. Configuración
		$dataSettings = getcURLData($baseUrl . "settings.json");            // 1. Optener settings
        $localZone = getLocalZone($dataSettings);                           // 2. Zona horaria
		$lastStatus = checkLastState($baseUrl);    							// 3. Estado anterior
		sendSettings($dataSettings, $localZone);        					// 4. Enviar settings
		updateLog($lastStatus, $localZone, $baseUrl);     					// 5. Actualizar estado
	}
    
    #endregion 6.- Programa principal

	main();

?>