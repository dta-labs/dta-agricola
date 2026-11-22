<?php
// Servicio PHP para procesar sistemas de tipo Sensor cada 10 minutos
declare(strict_types=1);

class SensorService {
    private $firebaseUrl;
    private $curlHandle;
    private $logFile;

    public function __construct() {
        $this->firebaseUrl = "https://dta-agricola.firebaseio.com/systems";
        $this->logFile = __DIR__ . '/sensor_service.log';
        $this->initCurl();
    }

    private function initCurl(): void {
        $this->curlHandle = curl_init();
        curl_setopt($this->curlHandle, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($this->curlHandle, CURLOPT_TIMEOUT, 30);
    }

    public function __destruct() {
        if ($this->curlHandle) {
            curl_close($this->curlHandle);
        }
    }

    /**
     * Ejecuta el servicio principal
     */
    public function run(): void {
        $this->log("Iniciando servicio de sensores - " . date('Y-m-d H:i:s'));
        
        try {
            // Obtener todos los sistemas de Firebase
            $systems = $this->getAllSystems();
            
            if ($systems === null) {
                $this->log("Error: No se pudieron obtener los sistemas de Firebase");
                return;
            }

            $sensorCount = 0;
            $processedCount = 0;

            // Procesar cada sistema
            foreach ($systems as $systemId => $systemData) {
                $sensorCount++;
                
                if ($this->isSensorSystem($systemData)) {
                    $key = $this->getSystemKey($systemData);
                    if ($key) {
                        $this->log("Procesando sistema Sensor: $systemId (key: $key)");
                        
                        // Realizar llamada al servicio
                        $success = $this->callSensorService($key);
                        
                        if ($success) {
                            $processedCount++;
                            $this->log("✓ Llamada exitosa para sistema $key");
                        } else {
                            $this->log("✗ Error en llamada para sistema $key");
                        }
                    }
                }
            }

            $this->log("Resumen: $sensorCount sistemas analizados, $processedCount sensores procesados");
            
        } catch (Exception $e) {
            $this->log("Error crítico: " . $e->getMessage());
        }
        
        $this->log("Servicio finalizado - " . date('Y-m-d H:i:s'));
    }

    /**
     * Obtiene todos los sistemas desde Firebase
     */
    private function getAllSystems(): ?object {
        $url = $this->firebaseUrl . ".json";
        
        curl_setopt_array($this->curlHandle, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => 'GET'
        ]);
        
        $response = curl_exec($this->curlHandle);
        $error = curl_errno($this->curlHandle);
        
        if ($error) {
            $this->log("Error cURL: " . curl_error($this->curlHandle));
            return null;
        }
        
        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return json_decode($response);
        }
        
        $this->log("Error HTTP $httpCode al obtener sistemas");
        return null;
    }

    /**
     * Verifica si un sistema es de tipo Sensor
     */
    private function isSensorSystem($systemData): bool {
        if (!isset($systemData->settings) || !isset($systemData->settings->type)) {
            return false;
        }
        
        return $systemData->settings->type === 'Sensor';
    }

    /**
     * Obtiene la key de un sistema
     */
    private function getSystemKey($systemData): ?string {
        if (!isset($systemData->settings) || !isset($systemData->settings->key)) {
            return null;
        }
        
        return $systemData->settings->key;
    }

    /**
     * Realiza la llamada al servicio sensor_v6.1.php
     */
    private function callSensorService(string $key): bool {
        $url = "https://dtaamerica.com/ws/sensor_v6.1.php?id=$key&data=[]&rx=Ok&si=26";
        
        curl_setopt_array($this->curlHandle, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15
        ]);
        
        $response = curl_exec($this->curlHandle);
        $error = curl_errno($this->curlHandle);
        
        if ($error) {
            $this->log("Error cURL llamando a sensor_v6.1.php para key $key: " . curl_error($this->curlHandle));
            return false;
        }
        
        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            $this->log("Respuesta de sensor_v6.1.php para key $key: " . substr($response, 0, 100));
            return true;
        }
        
        $this->log("Error HTTP $httpCode llamando a sensor_v6.1.php para key $key");
        return false;
    }

    /**
     * Registra mensaje en log
     */
    private function log(string $message): void {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message" . PHP_EOL;
        
        // Escribir en archivo de log
        file_put_contents($this->logFile, $logMessage, FILE_APPEND | LOCK_EX);
        
        // También mostrar en pantalla si se ejecuta desde CLI
        if (php_sapi_name() === 'cli') {
            echo $logMessage;
        }
    }

    /**
     * Programa la ejecución periódica del servicio
     */
    public function startScheduler(): void {
        $this->log("Iniciando scheduler - ejecutando cada 10 minutos");
        
        while (true) {
            $this->run();
            
            // Esperar 10 minutos (600 segundos)
            $this->log("Esperando 10 minutos para la siguiente ejecución...");
            sleep(600);
        }
    }
}

// Ejecución del servicio
if (php_sapi_name() === 'cli') {
    // Modo línea de comandos
    $service = new SensorService();
    
    // Verificar argumentos
    if ($argc > 1 && $argv[1] === '--daemon') {
        // Modo daemon (ejecución continua)
        $service->startScheduler();
    } else {
        // Ejecución única
        $service->run();
    }
} else {
    // Modo web (ejecución única)
    header('Content-Type: text/plain');
    $service = new SensorService();
    $service->run();
}
?>
