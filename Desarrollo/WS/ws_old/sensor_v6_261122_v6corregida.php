<?php
// if (function_exists('opcache_invalidate')) { opcache_invalidate(__FILE__, true); }
declare(strict_types=1);

/*
 * sensor_v6.php (correcciones 2026-11-21 mientras se publica WS/v7)
 *  - id validado (no puede apuntar a otra ruta de Firebase).
 *  - Si Firebase no responde: un reintento y, si sigue sin settings, HTTP 503. Antes se respondía "0"
 *    (frecuencia 0 = modo descubrimiento) y se lanzaba curl con una URL vacía.
 *  - El log se escribe directo en {aaaa-mm-dd}_log.txt (mismo archivo y formato que log_writer.php),
 *    sin lanzar un curl por cada petición.
 *  - Tiempos máximos en cURL; la respuesta se entrega al equipo antes de lanzar el procesamiento.
 */
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
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 15
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

    /** true si se obtuvieron los settings (un reintento si Firebase falla). */
    public function getSettings(): bool {
        for ($intento = 0; $intento < 2; $intento++) {
            $this->settings = $this->executeRequest($this->baseUrl . "settings.json");
            if (is_object($this->settings)) return true;
        }
        $this->settings = null;
        return false;
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

    #endregion 0.- Funciones básicas

    #region 1.- Enviar configuración al dispositivo

    public function formatSettingsForDevice(): string {
        $queryString = urldecode(http_build_query($_GET));
        $this->escribirLog($queryString);
        $frequency = (int) ($this->settings->operationMode ?? 0);
        if ($frequency == 10) $frequency = $this->getDynamicFrequency();
        $sendData = "\"{$frequency}";
        $count = (int) ($this->settings->sensors->sensorNumber ?? 0);
        for ($i = 0; $i < $count; $i++) {
            $idx = "S{$i}";
            $id = $this->settings->sensors->$idx->id ?? '';
            $sendData .= "\"{$id}";
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

    /** Mismo archivo y formato que log_writer.php: {aaaa-mm-dd}_log.txt, "[HH:MM:SS] mensaje". */
    private function escribirLog($mensaje): void {
        $fecha = $this->getDateTime($this->getLocalZone());
        $archivo = __DIR__ . '/' . $fecha->format('Y-m-d') . '_log.txt';
        $linea = '[' . $fecha->format('H:i:s') . '] ' . str_replace(["\r", "\n"], ' ', (string) $mensaje) . "\n";
        if (@file_put_contents($archivo, $linea, FILE_APPEND | LOCK_EX) === false) {
            error_log("No se pudo escribir el log en $archivo");
        }
    }

    public function lanzarProcesamientoSegundoPlano(): void {
        $queryString = http_build_query($_GET);
        $updateUrl = "";
        $type = $this->settings->type ?? '';
        if ($type === 'Sensor') {
            $updateUrl = "https://dtaamerica.com/ws/updateSensorDB.php?$queryString";
        } else if ($type === 'Nevera') {
            $updateUrl = "https://dtaamerica.com/ws/updateNeveraDB.php?$queryString";
        }
        if ($updateUrl === "") return;                       // otro tipo: no hay procesamiento
        $cmd = "curl -s -m 120 " . escapeshellarg($updateUrl) . " > /dev/null 2>&1 &";
        $proc = @popen($cmd, 'r');
        if ($proc === false) {
            error_log("No se pudo lanzar $updateUrl");
            return;
        }
        pclose($proc);
    }

    #endregion 2.- Lanzar en segundo plano el procesamiento de datos
}

#region 3.- Programa principal

try {
    // id obligatorio y sin caracteres que cambien la ruta de Firebase (/ . # $ [ ] ? & %)
    if (!isset($_GET['id']) || !is_string($_GET['id']) || $_GET['id'] === '' || preg_match('/[\/.#$\[\]?&%\s\\]/', $_GET['id'])) {
        http_response_code(400);
        echo "Error: Falta el parámetro 'id' del sistema";
        exit;
    }
    
    $system = new SensorSystem($_GET['id']);
    if (!$system->getSettings()) {                      // 0. Obtener la configuración del dispositivo
        http_response_code(503);
        echo "Error: No se pudo leer la configuración del sistema";
        exit;
    }
    $configData = $system->formatSettingsForDevice();   // 1. Devolver la configuración al dispositivo
    print_r($configData);
    if (function_exists('fastcgi_finish_request')) {    // 1.1. Entregar la respuesta antes de seguir
        fastcgi_finish_request();
    } else {
        @ob_flush();
        flush();
    }
    $system->lanzarProcesamientoSegundoPlano();         // 2. Lanzar en segundo plano el procesamiento de datos
    
} catch (Throwable $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

#endregion 3.- Programa principal

?>
