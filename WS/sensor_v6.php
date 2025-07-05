<?php
declare(strict_types=1);

class SensorSystem {
    private $baseUrl;
    private $settings = null;
    private $users = null;
    private $curlHandle;

    public function __construct(string $id) {
        $this->baseUrl = "https://dta-agricola.firebaseio.com/systems/$id/";
        $this->initCurl();
    }

    private function initCurl(): void {
        $this->curlHandle = curl_init();
        curl_setopt($this->curlHandle, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, ['Content-Type: text/plain']);
    }

    public function __destruct() {
        if ($this->curlHandle) {
            curl_close($this->curlHandle);
        }
    }

    private function executeRequest(string $url, string $method = 'GET', ?string $data = null) {
        $headers = ['Content-Type: application/json'];
        
        // Si es PATCH, necesitamos agregar el método en un encabezado especial
        if ($method === 'PATCH') {
            $headers[] = 'X-HTTP-Method-Override: PATCH';
            $method = 'POST'; // Usamos POST para PATCH
        }
        
        curl_setopt_array($this->curlHandle, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers
        ]);
        
        if ($data !== null) {
            curl_setopt($this->curlHandle, CURLOPT_POSTFIELDS, $data);
        }
    
        $response = curl_exec($this->curlHandle);
        $error = curl_errno($this->curlHandle);
        
        if ($error) {
            error_log("Error cURL: " . curl_error($this->curlHandle));
            throw new RuntimeException('Error en la petición cURL: ' . curl_error($this->curlHandle));
        }
    
        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
        $this->escribirLog("HTTP $method $url - Código: $httpCode");
        
        return $httpCode >= 200 && $httpCode < 300 ? json_decode($response) : null;
    }

    private function getSettings(): object {
        if ($this->settings === null) {
            $this->settings = $this->executeRequest($this->baseUrl . "settings.json");
            if ($this->settings === null) {
                // Si no hay settings, devolver un objeto vacío por defecto
                $this->settings = (object)['zona' => 0, 'summerHour' => 0];
            }
        }
        return $this->settings;
    }

    private function getUsers(): array {
        if ($this->users === null) {
            $this->users = $this->executeRequest($this->baseUrl . "users.json");
            if ($this->users === null) {
                $this->users = [];
            }
        }
        $usersData = get_object_vars($this->users); 
        $usersID = array_keys($usersData); 
        return $usersID;
    }

    private function getLocalZone(): int {
        $settings = $this->getSettings();
        $timeZone = $settings->zona ?? 0;
        $summerHour = $settings->summerHour ?? 0;
        return intval($timeZone) + intval($summerHour);
    }

    private function getDateTime(int $localZone): DateTime {
        $dateTime = new DateTime();
        $dateTime->modify("$localZone hours");
        return $dateTime;
    }

    public function formatSettingsForDevice(): string {
        $this->escribirLog("formatSettingsForDevice...");
        $settings = $this->getSettings();
        $sendData = "\"{$settings->operationMode}";
        
        for ($i = 0; $i < $settings->sensors->sensorNumber; $i++) {
            $idx = "S$i";
            $sendData .= "\"{$settings->sensors->$idx->id}";
        }
        
        return $sendData . "\"";
    }

    private function updateLog(array $data): void {
        $this->escribirLog("updateLog...");
        $settings = $this->getSettings();
        if (empty($data) || $settings->operationMode == 0) {
            return;
        }
        $date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
        $logData = [
            'date' => $date,
            'dataRaw' => json_encode($data),
            'signal' => $_GET['si'] ?? '',
            'qos' => $_GET['qos'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er', 'ini']) ? $_GET['rx'] : ''
        ];
        $this->executeRequest(
            $this->baseUrl . "logs.json",
            'POST',
            json_encode($logData)
        );
    }

    private function verifyAlerts($data): void {
        $settings = $this->getSettings();
        $usersID = $this->getUsers(); 
        $dataSize = count($data);
        $length = $settings->sensors->sensorNumber ?? 0;
        if ($length == 0) {
            return;
        }
        for ($i = 0; $i < $settings->sensors->sensorNumber; $i++) {
            $idx = "S$i";
            $sensor = $settings->sensors->$idx;
            $sensorLength = $sensor->type == "SHT4" ? 4 : (($sensor->type == "STH" || $sensor->type == "FlP") ? 3 : 1);
            $sensorID = $sensor->alias ?? $sensor->id;
            if ($sensorID !== '0x0') {
                $notificationId = ($settings->name ?? $settings->key) . " - " . $sensorID;
                $minHumThreshold = $sensor->h->minValue ?? 30;
                $maxHumThreshold = $sensor->h->maxValue ?? 80;
                $notifyH = $sensor->h->notify ?? false;
                $value = $data[$i * $sensorLength] ?? 'NaN';
                if($value !== 'NaN' && isset($sensor->h) && $notifyH) {
                    $this->sendPushNotification($usersID, "Humedad", $notificationId, $value, $minHumThreshold, $maxHumThreshold);
                }
                $minTempThreshold = $sensor->t->minValue ?? 2;
                $maxTempThreshold = $sensor->t->maxValue ?? 30;
                $notifyT = $sensor->t->notify ?? false;
                $value = $data[$i * $sensorLength + 2] ?? 'NaN';
                if($value !== 'NaN' && isset($sensor->t) && $notifyT) {
                    $this->sendPushNotification($usersID, "Temperatura", $notificationId, $value, $minTempThreshold, $maxTempThreshold);
                }
            }
        }
    }

    private function sendPushNotification($usersID, $txt, $sensorID, $value, $minThreshold, $maxThreshold): void {
        if ($value !== 'NaN' && $value !== '-127' && $value > -127 && $value !== '' && $minThreshold !== 'null' && $maxThreshold !== 'null') {
            if ($value <= $minThreshold || $maxThreshold <= $value) { 
                $msg = "Alerta " . ($value <= $minThreshold ? "baja " : "alta ") . $txt; 
                foreach ($usersID as $user) {
                    $msg = "{$msg}: {$sensorID} [{$value}" . ($txt == 'Temperatura' ? '°C' : '%') . "]...";
                    $url = "https://dtaamerica.com/ws/push.php?user={$user}&txt=" . urlencode($msg);
                    $response = file_get_contents($url);
                }
            }
        }
    }

    public function escribirLog($mensaje) {
        $archivo = __DIR__ . '/log.txt'; // Usamos ruta absoluta
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

    private function updateSettings(object $settings): void {
        $this->executeRequest(
            $this->baseUrl . "settings.json",
            'PUT',
            json_encode($settings)
        );
    }

    private function fillEmptyData($rawData, $sensors, $sensorNumber): array {
		$rawData = str_replace(',,', ',NaN,NaN,NaN,NaN,', $rawData);
		$rawData = str_replace(',,', ',NaN,NaN,NaN,NaN,', $rawData);
		$rawData = str_replace('[,', '[NaN,NaN,NaN,NaN,', $rawData);
		$rawData = str_replace(',]', ',NaN,NaN,NaN,NaN]', $rawData);
		$rawData = trim($rawData, '[]');	// Remover los corchetes del inicio y final
		$data = explode(',', $rawData);     // Dividir por comas
		return $data;
    }

    public function processData(): void {
        $this->escribirLog("processData...");
        if (isset($_GET['data']) && $_GET['data'] !== '[]') {
            $this->processRegularData();
        } else {
            $this->processEmptyData();
        }
    }

    private function processRegularData() {
        $settings = $this->getSettings();
        $data = $this->fillEmptyData($_GET['data'], $settings->sensors, $settings->sensors->sensorNumber);
        if ($settings->operationMode && ($settings->operationMode == "" || $settings->operationMode == "0" || $settings->operationMode == 0)) {
            $actualize = true;
            $length = count($data);
            for ($i = 0; $i < $length; $i++) {
                $idx = "S$i";
                if (isset($data[$i]) && strpos($data[$i], '0x') === 0) {
                    $settings->sensors->$idx->id = $data[$i];
                    $settings->sensors->$idx->latitude = $settings->sensors->$idx->latitude ?? 0.0;
                    $settings->sensors->$idx->longitude = $settings->sensors->$idx->longitude ?? 0.0;
                    $settings->sensors->$idx->type = $settings->sensors->$idx->type ?? "SHT";
                } else {
                    $actualize = false;
                    break;
                }
            }
            if ($actualize) {
                $settings->sensors->sensorNumber = $length;       // Actualizar el número de sensores
                $this->settings = $settings;                      // Actualizar la caché local
                $this->updateSettings($settings);
            }
        } else {
            $this->updateLog($data);
            $this->verifyAlerts($data);
        }
    }
    
    private function checkLastLog($baseUrl) {
        $response = $this->executeRequest($baseUrl . "logs.json?orderBy=\"update\"&limitToLast=1");
        if ($response === null) {
            return null;
        }
        $logs = is_object($response) ? get_object_vars($response) : [];
        if (empty($logs)) {
            return null;
        }
        // Obtenemos la última clave y su valor
        $lastKey = array_key_last($logs);
        return (object)[
            'key' => $lastKey,
            'data' => $logs[$lastKey]
        ];
    }

    private function processEmptyData(): void {
        $this->escribirLog("processEmptyData...");
        $data = array_fill(0, 40, "NaN"); // Mismo efecto que tu array de "NaN"
        $settings = $this->getSettings();
        $this->escribirLog("updateLog...");
        $date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
        $logData = [
            'date' => $date,
            'dataRaw' => json_encode($data),
            'signal' => $_GET['si'] ?? '',
            'qos' => $_GET['qos'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er', 'ini']) ? $_GET['rx'] : '',
        ];
    
        $lastLog = $this->checkLastLog($this->baseUrl);
        $method = 'POST';
        $url = $this->baseUrl . "logs.json";
        
        // Si encontramos un log existente con el mismo dataRaw, actualizamos ese registro
        if ($lastLog !== null && $logData['dataRaw'] === $lastLog->data->dataRaw) {
            $url = $this->baseUrl . "logs/" . $lastLog->key . ".json";
            $method = 'PATCH';
            $logData['date'] = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
            $this->escribirLog("Actualizando registro existente con key: " . $lastLog->key . " y fecha: " . $logData['date']);
        } else {
            $this->escribirLog("Creando nuevo registro. Comparación: ");
        }
        
        $response = $this->executeRequest($url, $method, json_encode($logData));
        if ($response === null) {
            $this->escribirLog("Error al $method el registro");
        } else {
            $this->escribirLog("Operación $method completada exitosamente");
        }
    }
}

// Programa principal
try {
    $system = new SensorSystem($_GET['id']);
    $urlCompleta = "http://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];     // URL completa
    $system->escribirLog($urlCompleta);
    print_r($system->formatSettingsForDevice());                             // Enviar configuración al dispositivo
    $system->processData();                                                         // Procesar datos si están presentes    
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}