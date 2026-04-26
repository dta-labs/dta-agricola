<?php
declare(strict_types=1);

class AlertProcessor {
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
        curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    }

    public function __destruct() {
        if ($this->curlHandle) {
            curl_close($this->curlHandle);
        }
    }

    private function executeRequest(string $url, string $method = 'GET', ?string $data = null) {
        try {
            $headers = ['Content-Type: application/json'];
            
            if ($method === 'PATCH') {
                $headers[] = 'X-HTTP-Method-Override: PATCH';
                $method = 'POST';
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
            
            return $httpCode >= 200 && $httpCode < 300 ? json_decode($response) : null;
        } catch (RuntimeException $e) {
            error_log("Fallo en executeRequest: " . $e->getMessage());
            return null;
        }
    }

    private function getSettings(): object {
        if ($this->settings === null) {
            $this->settings = $this->executeRequest($this->baseUrl . "settings.json");
            if ($this->settings === null) {
                $this->settings = (object)[
                    'zona' => 0,
                    'summerHour' => 0,
                    'operationMode' => 1,
                    'sensors' => (object)[
                        'sensorNumber' => 10,
                        'S0' => (object)['id' => '0x01'],
                        'S1' => (object)['id' => '0x02'],
                        'S2' => (object)['id' => '0x03'],
                        'S3' => (object)['id' => '0x04'],
                        'S4' => (object)['id' => '0x05'],
                        'S5' => (object)['id' => '0x06'],
                        'S6' => (object)['id' => '0x07'],
                        'S7' => (object)['id' => '0x08'],
                        'S8' => (object)['id' => '0x09'],
                        'S9' => (object)['id' => '0x10']
                    ]
                ];
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
        if (is_object($this->users)) {
            $usersData = get_object_vars($this->users); 
        } elseif (is_array($this->users)) {
            $usersData = $this->users; 
        } else {
            $usersData = [];
        }
        $usersID = array_keys($usersData); 
        return $usersID;
    }

    public function processAlerts(): void {
        if (!isset($_GET['data'])) {
            return;
        }

        if ($_GET['data'] == '[]') {
            $data = array_fill(0, 40, NAN);
        } else {
            $data = $this->fillEmptyData($_GET['data']);
        }

        $this->verifyAlerts($data);
    }

    private function fillEmptyData($rawData): array {
        $rawData = str_replace('[,', '[NaN,NaN,NaN,NaN,', $rawData);
        $rawData = preg_replace_callback('/,{2,}/', function($matches) {
            $count = strlen($matches[0]) - 1;
            $nanBlock = implode(',', array_fill(0, $count * 4, 'NaN'));
            return ',' . $nanBlock . ',';
        }, $rawData);
        $rawData = str_replace(',]', ',NaN,NaN,NaN,NaN]', $rawData);
        $rawData = trim($rawData, '[]');
        $data = explode(',', $rawData);
        $numericData = array_map(function($v) {
            if ($v === 'NaN') return NAN;
            return is_numeric($v) ? (float)$v : NAN;
        }, $data);
        return $numericData;
    }

    private function verifyAlerts($data): void {
        $settings = $this->getSettings();
        $length = $settings->sensors->sensorNumber ?? 0;
        if ($length == 0) return;
        $usersList = $this->getUsers(); 
        
        $alertMessages = [];
        
        for ($i = 0; $i < $settings->sensors->sensorNumber; $i++) {
            $idx = "S$i";
            $sensor = $settings->sensors->$idx;
            $sensorType = $sensor->type ?? "SHT4";
            $sensorLength = ($sensorType == "SHT4" || $sensorType == "WM") ? 4 : (($sensorType == "STH" || $sensorType == "FlP") ? 3 : 1);
            $sensorID = $sensor->alias ?? $sensor->id;
            
            if ($sensorID !== '0x0') {
                $notificationId = ($settings->name ?? $settings->key) . " - " . $sensorID;
                
                // Verificar humedad
                $value = $data[$i * $sensorLength] ?? 'NaN';
                if(is_numeric($value) && isset($sensor->h) && isset($sensor->h->notify) && $sensor->h->notify) {
                    $msg = (isset($sensor->h->minValue) && $value <= $sensor->h->minValue ? "baja " : (isset($sensor->h->maxValue) && $value > $sensor->h->maxValue ? "alta " : "")); 
                    if ($msg != "") {
                        $alertMessage = "Alerta {$msg} humedad: {$value}% en {$notificationId}";
                        $alertMessages[] = $alertMessage;
                        $this->escribirLog($alertMessage);
                    }
                }
                
                // Verificar temperatura
                $value = $data[$i * $sensorLength + 2] ?? 'NaN';
                if(is_numeric($value) && -127 < $value && isset($sensor->t) && isset($sensor->t->notify) && $sensor->t->notify) {
                    $msg = (isset($sensor->t->minValue) && $value <= $sensor->t->minValue ? "baja " : (isset($sensor->t->maxValue) && $value > $sensor->t->maxValue ? "alta " : "")); 
                    if ($msg != "") {
                        $alertMessage = "Alerta {$msg} temperatura: {$value}°C en {$notificationId}";
                        $alertMessages[] = $alertMessage;
                        $this->escribirLog($alertMessage);
                    }
                }
            }
        }
        
        // Si hay alertas, llamar a push.php
        if (!empty($alertMessages)) {
            $this->sendPushNotifications($usersList, $alertMessages);
        }
    }

    private function sendPushNotifications(array $usersList, array $messages): void {
        foreach ($messages as $message) {
            foreach ($usersList as $user) {
                $this->callPushService($user, $message);
            }
        }
    }

    private function callPushService(string $user, string $message): void {
        $pushUrl = "https://dtaamerica.com/WS/push.php?user=" . urlencode($user) . "&txt=" . urlencode($message);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $pushUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
        curl_exec($ch);
        curl_close($ch);
        
        $this->escribirLog("Llamada a push.php para usuario: $user, mensaje: $message");
    }

    public function escribirLog($mensaje) {
        $archivo = __DIR__ . '/alertas_log.txt';
        $fechaHora = date('Y-m-d H:i:s');
        $entrada = "[{$fechaHora}] {$mensaje}\n";
        
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
}

// Programa principal
try {
    if (!isset($_GET['id']) || empty($_GET['id'])) {
        http_response_code(400);
        echo "Error: Falta el parámetro 'id' del sistema";
        exit;
    }
    
    $alertProcessor = new AlertProcessor($_GET['id']);
    $alertProcessor->processAlerts();
    
} catch (Exception $e) {
    error_log("Error en alertas.php: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

?>
