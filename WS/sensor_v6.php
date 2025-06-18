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
        curl_setopt($this->curlHandle, CURLOPT_URL, $url);
        curl_setopt($this->curlHandle, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($data !== null) {
            curl_setopt($this->curlHandle, CURLOPT_POSTFIELDS, $data);
        }

        $response = curl_exec($this->curlHandle);
        $error = curl_errno($this->curlHandle);
        
        if ($error) {
            error_log("Error cURL: " . curl_error($this->curlHandle));
            throw new RuntimeException('Error en la petición cURL');
        }

        return $method === 'GET' ? json_decode($response) : $response;
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
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er']) ? $_GET['rx'] : ''
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
            $sensorLength =  $sensor->type == "SHT4x" ? 4 : ($sensor->type == "STH"  || $sensor->type == "FlP")? 3 : 1;
            $sensorID = $sensor->alias ?? $sensor->id;
            if ($sensorID !== '0x0') {
                $minHumThreshold = $sensor->h->minValue ?? 20;
                $maxHumThreshold = $sensor->h->maxValue ?? 80;
                $value = $data[$i * $sensorLength];
                if(isset($sensor->h) && isset($sensor->h->notify) && $sensor->h->notify) {
                    $this->sendPushNotification($usersID, "Humedad", $sensorID, $value, $minHumThreshold, $maxHumThreshold);
                }
                $minTempThreshold = $sensor->t->minValue ?? 5;
                $maxTempThreshold = $sensor->t->maxValue ?? 30;
                $value = $data[$i * $sensorLength + 1];
                if(isset($sensor->t) && isset($sensor->t->notify) && $sensor->t->notify) {
                    $this->sendPushNotification($usersID, "Temperatura", $sensorID, $value, $minTempThreshold, $maxTempThreshold);
                }
            }
        }
    }

    private function sendPushNotification($usersID, $txt, $sensorID, $value, $minThreshold, $maxThreshold): void {
        if ($value !== 'NaN' && $value !== '-127' && $value > -127 && $value !== '' && $minThreshold !== 'null' && $maxThreshold !== 'null') {
            if ($value <= $minThreshold || $maxThreshold <= $value) { 
                $txt = "Alerta " . ($value <= $minThreshold ? "baja " : "alta ") . $txt; 
                foreach ($usersID as $user) {
                    $msg = "{$txt}: {$sensorID} [{$value}" . ($txt == 'Temperatura' ? '°C' : '%') . "]...";
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