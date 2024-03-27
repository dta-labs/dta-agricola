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

    #region 3.- Enviar Settings al dispositivo 

	function sendSettings($dataSettings) {
        $sendData = "\"" . $dataSettings->sleepingTime . "\"" . $dataSettings->sensors->sensorNumber;
        for ($i = 0; $i < $dataSettings->sensors->sensorNumber; $i++) {
            $idx = "S" . $i;
            $sendData .= "\"" . $dataSettings->sensors->$idx->id; 
        }
        $sendData .= "\"";
		print_r($sendData);
	}

    #endregion 3.- Enviar Settings al dispositivo

	#region 4.- Actualizar estado del dispositivo e información de los sensores

	function updateLog($localZone, $baseUrl) {
		if ($_GET["no"]) {
			$key = "";
            $date = getDateTime($localZone)->format('Ymd hia');
			$dataUpdate = '{';
			$dataUpdate .= '"date":"' . $date . '"';
			$lenght = $_GET["no"];
			$dataUpdate .= ',"lenght":"' . $lenght . '"';
			$dataUpdate .= ',"dataRaw":"['; 
			for ($i = 0; $i < $lenght; $i++) {
				$idx = "S" . $i;
				$dataUpdate .= $_GET[$idx]; 
				$dataUpdate .= $i < $lenght - 1 ? ',' : ''; 
			}
			$dataUpdate .= ']"'; 
			$dataUpdate .= ',"signal":"' . ($_GET["si"] ? $_GET["si"] : "") . '"';
			$dataUpdate .= ',"reception":"' . (($_GET["rx"] && ($_GET["rx"] == "Ok" || $_GET["rx"] == "Er")) ? $_GET["rx"] : "") . '"';
			$dataUpdate .= '}';

			$url = $baseUrl . "logs$key.json";              // 4.1.- cURL de actualización de Logs
			postcURLData($url, $dataUpdate);            	// Nuevo registro
		}
	}

	#endregion 4.- Actualizar estado del dispositivo e información de los sensores
	
    #region 5.- Programa principal

	function main() {
		$baseUrl = config();                                                // 0. Configuración
		$dataSettings = getcURLData($baseUrl . "settings.json");            // 1. Optener settings
        $localZone = getLocalZone($dataSettings);                           // 2. Zona horaria
		sendSettings($dataSettings);                 						// 3. Enviar settings
		updateLog($localZone, $baseUrl);     								// 4. Actualizar estado
	}
    
    #endregion 5.- Programa principal

	main();

?>