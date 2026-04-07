<?php
// Servicio PHP optimizado para ejecución en cPanel Cron Jobs
declare(strict_types=1);

class SensorServiceCron {
    private $firebaseUrl;
    private $curlHandle;
    private $logFile;

    public function __construct() {
        $this->firebaseUrl = "https://dta-agricola.firebaseio.com/systems";
        $this->logFile = __DIR__ . '/sensor_service_cron.log';
        $this->initCurl();
    }

    private function initCurl(): void {
        $this->curlHandle = curl_init();
        curl_setopt($this->curlHandle, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($this->curlHandle, CURLOPT_TIMEOUT, 30);
        curl_setopt($this->curlHandle, CURLOPT_SSL_VERIFYPEER, false); // Importante para cPanel
        curl_setopt($this->curlHandle, CURLOPT_FOLLOWLOCATION, true);
    }

    public function __destruct() {
        if ($this->curlHandle) {
            curl_close($this->curlHandle);
        }
    }

    /**
     * Ejecuta el servicio principal (optimizado para cron)
     */
    public function run(): void {
        $startTime = microtime(true);
        $this->log("=== INICIO EJECUCIÓN CRON - " . date('Y-m-d H:i:s') . " ===");
        
        try {
            // Limitar tiempo de ejecución para cron
            set_time_limit(300); // 5 minutos máximo
            
            // Obtener todos los sistemas de Firebase
            $systems = $this->getAllSystems();
            
            if ($systems === null) {
                $this->log("ERROR: No se pudieron obtener los sistemas de Firebase");
                $this->log("=== FIN EJECUCIÓN CRON (ERROR) - " . date('Y-m-d H:i:s') . " ===");
                return;
            }

            $sensorCount = 0;
            $processedCount = 0;
            $skippedCount = 0;
            $errorCount = 0;

            // Procesar cada sistema
            foreach ($systems as $systemId => $systemData) {
                $sensorCount++;
                
                if ($this->isSensorSystem($systemData)) {
                    $key = $this->getSystemKey($systemData);
                    if ($key) {
                        $this->log("Analizando sistema Sensor: $systemId (key: $key)");
                        
                        // Verificar si necesita actualización
                        $needsUpdate = $this->needsUpdate($systemId, $systemData);
                        
                        if ($needsUpdate['should_update']) {
                            $this->log("→ Necesita actualización (último: {$needsUpdate['last_update']})");
                            
                            // Realizar llamada al servicio
                            $result = $this->callSensorService($key);
                            
                            if ($result['success']) {
                                $processedCount++;
                                $this->log("✓ OK: Sistema $key actualizado");
                            } else {
                                $errorCount++;
                                $this->log("✗ ERROR: Sistema $key - " . $result['message']);
                            }
                        } else {
                            $skippedCount++;
                            $this->log("→ OMITIDO: Actualizado recientemente ({$needsUpdate['last_update']})");
                        }
                    }
                }
            }

            $executionTime = round(microtime(true) - $startTime, 2);
            $this->log("RESUMEN: $sensorCount sistemas analizados, $processedCount actualizados, $skippedCount omitidos, $errorCount errores");
            $this->log("TIEMPO EJECUCIÓN: {$executionTime} segundos");
            
        } catch (Exception $e) {
            $this->log("ERROR CRÍTICO: " . $e->getMessage());
        }
        
        $this->log("=== FIN EJECUCIÓN CRON - " . date('Y-m-d H:i:s') . " ===");
        echo "Servicio ejecutado correctamente. Revisa el log para detalles.\n";
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
            $this->log("ERROR cURL Firebase: " . curl_error($this->curlHandle));
            return null;
        }
        
        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            $data = json_decode($response);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $data;
            } else {
                $this->log("ERROR JSON Firebase: " . json_last_error_msg());
                return null;
            }
        }
        
        $this->log("ERROR HTTP Firebase: $httpCode");
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
     * Verifica si un sistema necesita actualización basado en actualData y operationMode
     */
    private function needsUpdate(string $systemId, $systemData): array {
        // Obtener configuración de operación (minutos entre actualizaciones)
        $operationMode = $this->getOperationMode($systemData);
        
        // Si operationMode es 0, no actualizar nunca
        if ($operationMode == 0) {
            return ['should_update' => false, 'last_update' => 'Modo desactivado (0)'];
        }
        
        // Para cualquier otro valor, verificar tiempo
        return $this->checkTimeBasedUpdate($systemId, $systemData, $operationMode);
    }

    /**
     * Obtiene el operationMode de los settings (minutos entre actualizaciones)
     */
    private function getOperationMode($systemData): int {
        if (isset($systemData->settings) && isset($systemData->settings->operationMode)) {
            return intval($systemData->settings->operationMode);
        }
        
        // Valor por defecto si no está configurado
        return 10; // 10 minutos por defecto
    }

    /**
     * Verifica actualización basada en tiempo
     */
    private function checkTimeBasedUpdate(string $systemId, $systemData, int $minutesThreshold): array {
        // Obtener configuración de zona horaria
        $timezone = $this->getSystemTimezone($systemData);
        
        // Obtener fecha y hora actual en la zona del sistema
        $now = new DateTime();
        $now->modify("$timezone hours");
        $currentTimestamp = $now->getTimestamp();
        
        // Obtener actualData del sistema
        $actualDataUrl = $this->firebaseUrl . "/$systemId/actualData.json";
        
        curl_setopt_array($this->curlHandle, [
            CURLOPT_URL => $actualDataUrl,
            CURLOPT_CUSTOMREQUEST => 'GET'
        ]);
        
        $response = curl_exec($this->curlHandle);
        $error = curl_errno($this->curlHandle);
        
        if ($error) {
            $this->log("ERROR obteniendo actualData para $systemId: " . curl_error($this->curlHandle));
            return ['should_update' => true, 'last_update' => 'Error al obtener datos'];
        }
        
        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
        
        if ($httpCode !== 200 || empty($response)) {
            // No hay actualData, necesita actualización
            return ['should_update' => true, 'last_update' => 'Sin datos previos'];
        }
        
        $actualData = json_decode($response);
        
        if (!$actualData || !isset($actualData->date)) {
            return ['should_update' => true, 'last_update' => 'Datos inválidos'];
        }
        
        // Parsear la fecha del formato "20260406 0738pm"
        $lastUpdateStr = $actualData->date;
        
        try {
            // Convertir el formato "20260406 0738pm" a timestamp
            // Formato: Ymd Hi a (año mes día hora_minutos am/pm sin dos puntos)
            $dateTime = DateTime::createFromFormat('Ymd Hi a', $lastUpdateStr);
            
            if (!$dateTime) {
                $this->log("ERROR: No se pudo parsear fecha '$lastUpdateStr' para sistema $systemId");
                return ['should_update' => true, 'last_update' => 'Fecha inválida'];
            }
            
            $lastTimestamp = $dateTime->getTimestamp();
            
            // Calcular diferencia en minutos
            $timeDiff = ($currentTimestamp - $lastTimestamp) / 60;
            
            // Si han pasado más minutos que el umbral, necesita actualización
            $shouldUpdate = $timeDiff >= $minutesThreshold;
            
            return [
                'should_update' => $shouldUpdate,
                'last_update' => $lastUpdateStr,
                'minutes_ago' => round($timeDiff, 1),
                'operation_mode' => $minutesThreshold,
                'threshold' => $minutesThreshold
            ];
            
        } catch (Exception $e) {
            $this->log("ERROR procesando fecha para $systemId: " . $e->getMessage());
            return ['should_update' => true, 'last_update' => 'Error procesando fecha'];
        }
    }

    /**
     * Obtiene la zona horaria del sistema considerando zona y summerHour
     */
    private function getSystemTimezone($systemData): int {
        $zona = -6; // valor por defecto
        $summerHour = 0; // valor por defecto
        
        if (isset($systemData->settings)) {
            $zona = $systemData->settings->zona ?? -6;
            $summerHour = $systemData->settings->summerHour ?? 0;
        }
        
        return intval($zona) + intval($summerHour);
    }

    /**
     * Realiza la llamada al servicio sensor_v6.php
     */
    private function callSensorService(string $key): array {
        $url = "https://dtaamerica.com/ws/sensor_v6.php?id=$key&data=[]&rx=Ok&si=26";
        
        curl_setopt_array($this->curlHandle, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_FOLLOWLOCATION => true
        ]);
        
        $response = curl_exec($this->curlHandle);
        $error = curl_errno($this->curlHandle);
        
        if ($error) {
            return [
                'success' => false,
                'message' => 'cURL Error: ' . curl_error($this->curlHandle)
            ];
        }
        
        $httpCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return [
                'success' => true,
                'message' => 'HTTP 200 OK',
                'response' => substr($response, 0, 200)
            ];
        }
        
        return [
            'success' => false,
            'message' => "HTTP Error $httpCode"
        ];
    }

    /**
     * Registra mensaje en log con rotación automática
     */
    private function log(string $message): void {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message" . PHP_EOL;
        
        // Rotación de logs: mantener solo últimos 7 días
        $this->rotateLogIfNeeded();
        
        // Escribir en archivo de log
        file_put_contents($this->logFile, $logMessage, FILE_APPEND | LOCK_EX);
    }

    /**
     * Rota el archivo de log si es muy grande o muy antiguo
     */
    private function rotateLogIfNeeded(): void {
        if (!file_exists($this->logFile)) {
            return;
        }
        
        $maxSize = 10 * 1024 * 1024; // 10MB
        $maxAge = 7 * 24 * 60 * 60; // 7 días
        
        $fileSize = filesize($this->logFile);
        $fileAge = time() - filemtime($this->logFile);
        
        if ($fileSize > $maxSize || $fileAge > $maxAge) {
            $backupFile = str_replace('.log', '_' . date('Y-m-d_H-i-s') . '.log', $this->logFile);
            rename($this->logFile, $backupFile);
        }
    }
}

// Ejecución del servicio (optimizado para cron)
$service = new SensorServiceCron();
$service->run();
?>
