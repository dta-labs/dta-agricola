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
        escribirLog("Settings: " . $lectura);
        print_r($lectura);
    }

    #endregion 2.- Consultar Settings

    #region 3.- Comprobar estado anterior (Logs)

    function checkLastStatus($baseUrl, $dataSettings) {
        $timeZone = intval($dataSettings->zona ?? 0);         // Zona horaria
        $summerHour = intval($dataSettings->summerHour ?? 0); // Horario de verano
        $localZone = $timeZone + $summerHour;

        $data = getcURLData($baseUrl . 'logs.json?orderBy="update"&limitToLast=1');
        $log = is_object($data) ? get_object_vars($data) : [];

        $lastStatus = new stdClass();
        $lastStatus->index = "";
        $lastStatus->status = "";
        $lastStatus->safety = "";
        $lastStatus->voltage = "";
        $lastStatus->initialDate = "";

        $keys = array_keys($log);
        $lastKey = end($keys);

        if (!empty($log) && isset($log[$lastKey])) {
            $entry = $log[$lastKey];
            $lastStatus->index = $lastKey;
            $lastStatus->status = $entry->status ?? "";
            $lastStatus->safety = $entry->safety ?? "";
            $lastStatus->voltage = $entry->voltage ?? "";
            $lastStatus->initialDate = $entry->date ?? "";
        }

        $dateTime = new DateTime();
        $dateTime->modify($localZone . ' hours');
        $lastStatus->date = $dateTime->format('Ymd H:i');

        return $lastStatus;
    }

    #endregion 3.- Comprobar estado anterior (Logs)

    #region 4.- Actualizar estado del dispositivo

    function updateLog($lastStatus, $baseUrl) {
        if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
            $key = "";
            $index = $lastStatus->index;
            if ($lastStatus->status == $_GET["st"] && $lastStatus->voltage == $_GET["vo"] && $lastStatus->safety == $_GET["sa"]) { $key = "/$index"; }
            $dataUpdate = '{';
            $dataUpdate .= '"date":"' . ($key ? $lastStatus->initialDate : $lastStatus->date) . '"';
            $dataUpdate .= ',"update":"' . $lastStatus->date . '"';
            $dataUpdate .= ',"status":"' . $_GET["st"] . '"';
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
            $dataUpdate .= ',"log":"' . ($_GET["vo"] == "false" ? "Voltage" : ($_GET["sa"] == "false" ? "Security" : ($_GET["er"] == 0 ? "Position" : ($_GET["rx"] == "Er" ? "Reception" : ($_GET["pr"] == 0 ? "Presure" : ""))))) . ' "'; 
            $dataUpdate .= '}';
    
            $url = $baseUrl . "logs$key.json";                                                      		// 5.1.- cURL de actualización de Logs
            if ($key) {
                putcURLData($url, $dataUpdate);                                                     		// Actualiza registro
            } else {
                postcURLData($url, $dataUpdate);                                                    		// Nuevo registro
            }

            if ($lastStatus->status != $_GET["st"] && $_GET["st"] == "OFF" && $_GET["sa"] == "false") {		// 5.2.- cURL de actualización de Settings
                $url = $baseUrl . "settings/status.json";
                putcURLData($url, '"OFF"');
            }

            escribirLog("Update Log: " . $dataUpdate);

        }
    }

    #endregion 4.- Actualizar estado del dispositivo

    #region 5.- Miscelaneas
    
    function escribirLog($mensaje) {
        $archivo = __DIR__ . '/pivot_log.txt'; // Usamos ruta absoluta
        $fechaHora = date('Y-m-d H:i:s');
        $entrada = "[{$fechaHora}] {$mensaje}\n";
        
        // Verificar si podemos escribir en el directorio
        if (!is_writable(dirname($archivo))) {
            error_log("Error: El directorio no tiene permisos de escritura: " . dirname($archivo));
            return false;
        }
        
        $manejador = @fopen($archivo, 'a');
        if ($manejador === false) {
            $error = error_get_last();
            error_log("Error al abrir el archivo de log: " . ($error['message'] ?? 'Error desconocido'));
            return false;
        }
        
        if (fwrite($manejador, $entrada) === false) {
            error_log("Error al escribir en el archivo de log");
            fclose($manejador);
            return false;
        }
        
        fclose($manejador);
        return true;
    }    

    #endregion 5.- Miscelaneas
    
    #region 6.- Programa principal
    
    function main() {
        $urlCompleta = "http://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
        escribirLog($urlCompleta);
        $baseUrl = config();
        $dataSettings = getcURLData($baseUrl . "settings.json");
        sendSettings($dataSettings);
        $lastStatus = checkLastStatus($baseUrl, $dataSettings);
        updateLog($lastStatus, $baseUrl);
    }

    #endregion 6.- Programa principal
	
    main();

?>