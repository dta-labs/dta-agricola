<?php
// if (function_exists('opcache_invalidate')) { opcache_invalidate(__FILE__, true); }
declare(strict_types=1);

class SensorSystem {
    private $baseUrl;
    private $settings = null;
    private $curlHandle;

    #region 0.- Funciones básicas

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
            } else {
                if (!isset($this->settings->operationMode)) {
                    $this->settings->operationMode = 1;
                }
                if (!isset($this->settings->sensors)) {
                    $this->settings->sensors = (object)[
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
                    ];
                } elseif (!isset($this->settings->sensors->sensorNumber)) {
                    $this->settings->sensors->sensorNumber = 10;
                }
            }
        }
        return $this->settings;
    }

    #endregion 0.- Funciones básicas

    #region 1.- Enviar configuración al dispositivo

    private function getDynamicFrequency(): int {
        $localZone = $this->getLocalZone();
        $hour = (int) $this->getDateTime($localZone)->format('H');
        return $hour < 4 ? 15 : ($hour < 7 ? 10 : 30);
    }

    public function formatSettingsForDevice(): string {
        $urlCompleta = "http://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
        $this->escribirLog($urlCompleta);
        $settings = $this->getSettings();
        $frequency = (int) $settings->operationMode;
        $frequency = $frequency == 10 ? $this->getDynamicFrequency() : $frequency;
        $sendData = "\"{$frequency}";
        for ($i = 0; $i < $settings->sensors->sensorNumber; $i++) {
            $idx = "S$i";
            $sendData .= "\"{$settings->sensors->$idx->id}";
        }
        return $sendData . "\"";
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

    public function escribirLog($mensaje) {
        $archivo = __DIR__ . '/log.txt';
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

    #endregion 1.- Enviar configuración al dispositivo

    #region 2.- Lanzar en segundo plano el procesamiento de datos

    public function lanzarProcesamientoSegundoPlano(): void {
        if (!isset($_GET['id'])) {
            error_log("No hay ID del sistema para procesar");
            return;
        }
        $queryString = http_build_query($_GET);
        $updateUrl = "https://dtaamerica.com/ws/updateDB.php?$queryString";
        $this->executeAsyncCall($updateUrl);  // Llamar a updateDB.php en segundo plano
        error_log("Actualizando BD del dispositivo");
    }

    private function executeAsyncCall(string $url): void {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
    }

    #endregion 2.- Lanzar en segundo plano el procesamiento de datos
}

#region 3.- Programa principal

try {
    if (!isset($_GET['id']) || empty($_GET['id'])) {
        http_response_code(400);
        echo "Error: Falta el parámetro 'id' del sistema";
        exit;
    }
    
    $system = new SensorSystem($_GET['id']);
    
    error_log("Enviando configuración al dispositivo");
    $configData = $system->formatSettingsForDevice();   // 1. Devolver la configuración al dispositivo
    print_r($configData);
    flush(); // Forzar envío inmediato
    
    $system->lanzarProcesamientoSegundoPlano();         // 2. Lanzar en segundo plano el procesamiento de datos
    
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

#endregion 3.- Programa principal

?>
