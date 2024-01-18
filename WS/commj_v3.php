<?php
    function config() {
        $apiKey = "AIzaSyBGhhdWhG7bD4QBkjK5IlXgiGVkoUv70KM";
        $headers = array('Authorization: key=' . $apiKey, 'Content-Type: application/json');
        $id = $_GET["id"];
        $baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
        return $baseUrl;
    }

    // 0.- Funciones cURLs:

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

    function getDateTime($localZone) {
        $zona = $localZone . ' hours';
        $dateTime = new DateTime();
        $dateTime->modify($zona);
        return $dateTime;
    }

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

    function sendSettings($dataSettings) {
        //print_r($dataSettings);
        $timeZone = $dataSettings->zona ? $dataSettings->zona : 0; // Zona horaria
        $summerHour = $dataSettings->summerHour ? $dataSettings->summerHour : 0; // Horario de verano
        $localZone = intval($timeZone) + intval($summerHour);
        $autoreverse = getAutoreverse($dataSettings, $localZone);

        $lectura = "\"" . $dataSettings->status . "\"" . $autoreverse . "\"" . $dataSettings->length . "\"" . $dataSettings->position;
        for ($i = 0; $i < 7; $i++) {
            $p = "p" . $i;
            $lectura .= "\"" . $dataSettings->plots->$p->value;
            $lectura .= "\"" . $dataSettings->plots->$p->valve;
        }
        $lectura .=  "\"";
        print_r($lectura);
        return $localZone;
    }

    // 2.- Comprobar estado anterior (Logs):

    function checkLastState($baseUrl, $localZone) {
        $json = get_object_vars(getcURLData($baseUrl . "logs.json"));
        $status = "";
        $initialDate = "";
        foreach ($json as $value) {
            $item = (object) $value;
            $status = $item->{'state'};
            $initialDate = $item->{'date'};
        }
        // $zona = $localZone . ' hours';
        // $dateTime = new DateTime();
        // $dateTime->modify($zona);
        // $date = $dateTime->format('Ymd hia');
        $date = getDateTime($localZone)->format('Ymd hia');

        $indexes = array_keys($json);
        $index = "";
        foreach ($indexes as $value) {
            $index = $value;
        }
        return [$status, $index, $initialDate, $date];
    }

    // 3.- Actualizar estado actual del dispositivo e información de los sensores

    function updateLog($status, $index, $initialDate, $date, $baseUrl) {
        if ($_GET["st"] && ($_GET["st"] == "ON" || $_GET["st"] == "OFF")) {
            $key = "";
            if ($status == $_GET["st"]) {
                $key = "/$index";
            }
            // if ($index) {
            //     $key = "/$index";
            // }
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

    // 4.- Programa principal

    function main() {
        $baseUrl = config();
        $dataSettings = getcURLData($baseUrl . "settings.json");
        $localZone = sendSettings($dataSettings);
        list($status, $index, $initialDate, $date) = checkLastState($baseUrl, $localZone);
        updateLog($status, $index, $initialDate, $date, $baseUrl);
    }

    main();

?>