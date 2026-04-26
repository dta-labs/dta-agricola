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

    public function getSettings() {
        $this->settings = $this->executeRequest($this->baseUrl . "settings.json");
    }

    private function getLocalZone(): int {
        $timeZone = $this->settings->zona ?? 0;
        $summerHour = $this->settings->summerHour ?? 0;
        return intval($timeZone) + intval($summerHour);
    }

    private function getDateTime(int $localZone): DateTime {
        $dateTime = new DateTime();
        $dateTime->modify("$localZone hours");
        return $dateTime;
    }

    private function escribirLog($mensaje) {
        $localZone = $this->getLocalZone();
        $fechaHora = $this->getDateTime($localZone)->format('Y-m-d H:i:s');
        $fecha = substr($fechaHora, 0, 10);
        $archivo = __DIR__ . '/' . $fecha . '_log.txt';
        $hora = substr($fechaHora, 11, 8);
        $entrada = "[{$hora}] {$mensaje}\n";
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

    #endregion 0.- Funciones básicas

    #region 1.- Enviar configuración al dispositivo

    public function formatSettingsForDevice(): string {
        $queryString = urldecode(http_build_query($_GET));
        $this->escribirLog($queryString);
        $frequency = (int) $this->settings->operationMode;
        if ($frequency == 10) $frequency = $this->getDynamicFrequency();
        $sendData = "\"{$frequency}";
        for ($i = 0; $i < $this->settings->sensors->sensorNumber; $i++) {
            $idx = "S{$i}";
            $sendData .= "\"{$this->settings->sensors->$idx->id}";
        }
        return $sendData . "\"";
    }

    private function getDynamicFrequency(): int {
        $localZone = $this->getLocalZone();
        $hour = (int) $this->getDateTime($localZone)->format('H');
        return $hour < 7 ? 10 : 30;
    }

    #endregion 1.- Enviar configuración al dispositivo

    #region 2.- Lanzar en segundo plano el procesamiento de datos

    public function lanzarProcesamientoSegundoPlano(): void {
        $queryString = http_build_query($_GET);
        $updateUrl = "https://dtaamerica.com/ws/updateDB.php?$queryString";
        $cmd = "curl -s \"$updateUrl\" > /dev/null 2>&1 &";
        pclose(popen($cmd, 'r'));
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
    $system->getSettings();                             // 0. Obtener la configuración al dispositivo
    $configData = $system->formatSettingsForDevice();   // 1. Devolver la configuración al dispositivo
    print_r($configData);
    flush();                                            // 1.1. Forzar envío inmediato
    $system->lanzarProcesamientoSegundoPlano();         // 2. Lanzar en segundo plano el procesamiento de datos
    
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

#endregion 3.- Programa principal

?>
