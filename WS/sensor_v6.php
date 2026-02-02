<?php
// if (function_exists('opcache_invalidate')) { opcache_invalidate(__FILE__, true); }
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
                // Si no hay settings, devolver un objeto con valores por defecto
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
                // Completar settings faltantes con valores por defecto
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
        // $this->escribirLog("formatSettingsForDevice...");
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
        
        $logData = $this->crearLogData($data);
        $dayLogsFile = $this->baseUrl . "dayLogs.json";
        
        if ($this->esPrimerRegistroDelDia($dayLogsFile)) {
            $this->escribirLog("esPrimerRegistroDelDia: No existe registro - es primer registro del día");
            $this->procesarPrimerRegistro($dayLogsFile, $logData);
        } else {
            $this->escribirLog("esPrimerRegistroDelDia: Ya existe registro");
            $currentDate = $this->getCurrentDate($logData['date']);
            $this->escribirLog("currentDate: " . $currentDate);
            $lastDate = $this->obtenerUltimaFechaDia($dayLogsFile);
            $this->escribirLog("lastDate: " . $lastDate);
            
            if ($this->esMismoDia($currentDate, $lastDate)) {
                $this->escribirLog("Procesar mismo día ");
                $this->procesarMismoDia($dayLogsFile, $logData);
            } else {
                $this->escribirLog("Procesar cambio de día ");
                $this->procesarCambioDia($dayLogsFile, $logData, $lastDate);
            }
        }
        
        // Siempre guardar en logs.json principal
        // $this->guardarEnLogsPrincipal($logData);
    }
    
    /**
     * Crear estructura de datos del log
     */
    private function crearLogData(array $data): array {
        $date = $this->getDateTime($this->getLocalZone())->format('Ymd hia');
        
        // Redondear todos los valores float a 1 decimal
        $roundedData = array_map(function($value) {
            if (is_numeric($value) && $value !== "NaN" && $value !== '-127') {
                return round((float)$value, 1);
            }
            return $value;
        }, $data);
        
        // Convertir array de 4 valores por sensor [Ms,Hr,T,Vcc] a 8 valores [Ms,Hr,Tmin,Tmax,T,ETc,Hf,Vcc]
        $totalSensors = 10;
        $valuesPerSensor = 4; // [Ms, Hr, T, Vcc]
        $expandedData = [];
        
        for ($i = 0; $i < $totalSensors; $i++) {
            $msIndex = $i * $valuesPerSensor;     // Ms
            $hrIndex = $i * $valuesPerSensor + 1; // Hr
            $tIndex = $i * $valuesPerSensor + 2;  // T
            $vccIndex = $i * $valuesPerSensor + 3; // Vcc
            
            $msValue = $roundedData[$msIndex] ?? "NaN";
            $hrValue = $roundedData[$hrIndex] ?? "NaN";
            $tValue = $roundedData[$tIndex] ?? "NaN";
            $vccValue = $roundedData[$vccIndex] ?? "NaN";
            
            // Para registros individuales, Tmin = Tmax = T (es el valor actual)
            $tValueFloat = is_numeric($tValue) && $tValue !== "NaN" ? round((float)$tValue, 1) : "NaN";
            
            // Calcular ETc y Hf para este registro individual
            $hrValueFloat = is_numeric($hrValue) && $hrValue !== "NaN" ? round((float)$hrValue, 1) : "NaN";
            $etc = (is_numeric($tValueFloat) && is_numeric($hrValueFloat) && $tValueFloat !== "NaN" && $hrValueFloat !== "NaN") 
                ? round($this->calcularETo($tValueFloat, $hrValueFloat), 1) 
                : "NaN";
            $hf = (is_numeric($tValueFloat) && $tValueFloat !== "NaN") 
                ? $this->calcularHorasFrio($tValueFloat) 
                : "NaN";
            
            // Construir array expandido: [Ms, Hr, Tmin, Tmax, T, ETc, Hf, Vcc]
            $expandedData[] = (string) $msValue;        // Ms
            $expandedData[] = (string) $hrValue;        // Hr
            $expandedData[] = (string) $tValueFloat;    // Tmin   (igual a T en registro individual)
            $expandedData[] = (string) $tValueFloat;    // Tmax (igual a T en registro individual)
            $expandedData[] = (string) $tValueFloat;    // T
            $expandedData[] = (string) $etc;            // ETc
            $expandedData[] = (string) $hf;             // Hf
            $expandedData[] = (string) $vccValue;       // Vcc
        }
        
        return [
            'date' => $date,
            'dataRaw' => json_encode($expandedData),
            'signal' => $_GET['si'] ?? '',
            'qos' => $_GET['qos'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er', 'ini']) ? $_GET['rx'] : ''
        ];
    }
    
    private function esPrimerRegistroDelDia(string $dayLogsFile): bool {
        $response = $this->executeRequest($dayLogsFile);
        return $response === null;
    }
    
    private function getCurrentDate(string $fullDate): string {
        return substr($fullDate, 0, 8);
    }
    
    private function obtenerUltimaFechaDia(string $dayLogsFile): ?string {
        $response = $this->executeRequest($dayLogsFile);
        $this->escribirLog("Response: " . json_encode($response));
        if ($response === null) {
            return null;
        }
        $dayLogs = json_decode(json_encode($response), true);
        if (empty($dayLogs)) {
            return null;
        }
        $lastLog = end($dayLogs);

        if (!isset($lastLog['date'])) {
            return null; // o ajusta según tu estructura
        }
        return substr($lastLog['date'], 0, 8);
    }

    private function esMismoDia(string $currentDate, ?string $lastDate): bool {
        return $lastDate !== null && $currentDate === $lastDate;
    }
    
    private function procesarPrimerRegistro(string $dayLogsFile, array $logData): void {
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
        $this->escribirLog("Primer registro del día - guardado en dayLogs.json");
    }
    
    private function procesarMismoDia(string $dayLogsFile, array $logData): void {
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
        $this->escribirLog("Mismo día - guardado en dayLogs.json");
    }
    
    /**
     * Procesar cambio de día (calcular promedio y reiniciar) - usando Firebase
     */
    private function procesarCambioDia(string $dayLogsFile, array $logData, ?string $lastDate): void {
        $this->escribirLog("Cambio de día detectado - calculando promedio");
        
        $dayLogs = $this->leerDayLogs($dayLogsFile);
        $promedioDataRaw = $this->calcularPromedioDataRaw($dayLogs);
        
        // Eliminar dayLogs.json completo
        $this->executeRequest($dayLogsFile, 'DELETE');
        $this->escribirLog("dayLogs.json eliminado");
        
        // Crear registro promedio
        $summaryLogData = $this->crearRegistroPromedio($lastDate ?? '', $promedioDataRaw);
        
        // Guardar promedio en archivo de resumen
        $summaryFile = $this->baseUrl . "summaryLogs.json";
        $this->executeRequest($summaryFile, 'POST', json_encode($summaryLogData));
        $this->escribirLog("Resumen del día guardado en summaryLogs.json");
        
        // Guardar promedio en logs.json principal
        $this->guardarEnLogsPrincipal($summaryLogData);
        
        // Iniciar nuevo día con el registro actual
        $this->executeRequest($dayLogsFile, 'POST', json_encode($logData));
        $this->escribirLog("Nuevo día iniciado - registro actual guardado en dayLogs.json");
    }
    
    /**
     * Leer dayLogs.json (usando Firebase)
     */
    private function leerDayLogs(string $dayLogsFile): array {
        $response = $this->executeRequest($dayLogsFile);
        if ($response === null) {
            return [];
        }
        
        return is_object($response) ? get_object_vars($response) : [];
    }
    
    /**
     * Crear registro promedio
     */
    private function crearRegistroPromedio(string $lastDate, array $promedioDataRaw): array {
        return [
            'date' => ($lastDate ?: date('Ymd')) . ' 0000am',
            'dataRaw' => json_encode($promedioDataRaw),
            'signal' => $_GET['si'] ?? '',
            'qos' => $_GET['qos'] ?? '',
            'reception' => in_array($_GET['rx'] ?? '', ['Ok', 'Er', 'ini']) ? $_GET['rx'] : ''
        ];
    }
    
    /**
     * Guardar en logs.json principal
     */
    private function guardarEnLogsPrincipal(array $logData): void {
        $this->executeRequest(
            $this->baseUrl . "logs.json",
            'POST',
            json_encode($logData)
        );
    }
    
    /**
     * Calcular el promedio del campo dataRaw de todos los registros (usando objetos Firebase)
     * Estructura: 10 sensores × 8 valores [Ms, Hr, Tmin, Tmax, T, ETc, Hf, Vcc] = 80 elementos
     * Resultado: 10 sensores × 8 valores [Ms, Hr, Tmin, Tmax, T, ETc, Hf, Vcc] = 80 elementos
     */
    private function calcularPromedioDataRaw(array $dayLogs): array {
        if (empty($dayLogs)) {
            return [];
        }
        
        $totalSensors = 10; // Siempre 10 sensores
        $valuesPerSensor = 8; // [Ms, Hr, Tmin, Tmax, T, ETc, Hf, Vcc]
        
        // Inicializar arrays para acumular
        $sumsMs = array_fill(0, $totalSensors, 0);
        $sumsHr = array_fill(0, $totalSensors, 0);
        $sumsT = array_fill(0, $totalSensors, 0);
        $lastVcc = array_fill(0, $totalSensors, 0);
        $counts = array_fill(0, $totalSensors, 0);
        
        // Arrays para Tmin y Tmax (promediar los valores individuales)
        $sumsTmin = array_fill(0, $totalSensors, 0);
        $sumsTmax = array_fill(0, $totalSensors, 0);
        
        // Arrays para ETc y Hf (acumular directamente)
        $sumsETc = array_fill(0, $totalSensors, 0);
        $sumsHf = array_fill(0, $totalSensors, 0);
        
        foreach ($dayLogs as $log) {
            $dataRaw = json_decode($log->dataRaw, true);
            if (!is_array($dataRaw) || count($dataRaw) !== $totalSensors * $valuesPerSensor) {
                continue;
            }
            $this->escribirLog("DataRaw: " . json_encode($dataRaw));
            
            for ($i = 0; $i < $totalSensors; $i++) {
                $msIndex = $i * $valuesPerSensor;     // Ms
                $hrIndex = $i * $valuesPerSensor + 1; // Hr
                $tminIndex = $i * $valuesPerSensor + 2; // Tmin
                $tmaxIndex = $i * $valuesPerSensor + 3; // Tmax
                $tIndex = $i * $valuesPerSensor + 4;  // T
                $etcIndex = $i * $valuesPerSensor + 5; // ETc
                $hfIndex = $i * $valuesPerSensor + 6;  // Hf
                $vccIndex = $i * $valuesPerSensor + 7; // Vcc
                
                // Obtener valores
                $msValue = $dataRaw[$msIndex] ?? "NaN";
                $hrValue = $dataRaw[$hrIndex] ?? "NaN";
                $tminValue = $dataRaw[$tminIndex] ?? "NaN";
                $tmaxValue = $dataRaw[$tmaxIndex] ?? "NaN";
                $tValue = $dataRaw[$tIndex] ?? "NaN";
                $etcValue = $dataRaw[$etcIndex] ?? "NaN";
                $hfValue = $dataRaw[$hfIndex] ?? "NaN";
                $vccValue = $dataRaw[$vccIndex] ?? "NaN";
                
                // Acumular Ms, Hr, T (ignorar NaN)
                if ($msValue !== "NaN" && is_numeric($msValue)) {
                    $sumsMs[$i] += round((float)$msValue, 1);
                    $counts[$i]++;
                }
                
                if ($hrValue !== "NaN" && is_numeric($hrValue)) {
                    $sumsHr[$i] += round((float)$hrValue, 1);
                }
                
                if ($tValue !== "NaN" && is_numeric($tValue)) {
                    $tValueFloat = round((float)$tValue, 1);
                    $sumsT[$i] += $tValueFloat;
                }
                
                // Acumular Tmin y Tmax (promediar los valores individuales)
                if ($tminValue !== "NaN" && is_numeric($tminValue)) {
                    $sumsTmin[$i] += round((float)$tminValue, 1);
                }
                
                if ($tmaxValue !== "NaN" && is_numeric($tmaxValue)) {
                    $sumsTmax[$i] += round((float)$tmaxValue, 1);
                }
                
                // Acumular ETc y Hf directamente
                if ($etcValue !== "NaN" && is_numeric($etcValue)) {
                    $sumsETc[$i] += round((float)$etcValue, 1);
                }
                
                if ($hfValue !== "NaN" && is_numeric($hfValue)) {
                    $sumsHf[$i] += round((float)$hfValue, 1); // Hf ahora puede ser decimal (0.5, 1.0, 0.0, -1.0)
                }
                
                // Guardar Vcc del último registro válido
                if ($vccValue !== "NaN" && is_numeric($vccValue)) {
                    $lastVcc[$i] = round((float)$vccValue, 1);
                }
            }
        }
        
        // Construir array final con todos los valores
        $result = [];
        for ($i = 0; $i < $totalSensors; $i++) {
            $result[] = $counts[$i] > 0 ? round($sumsMs[$i] / $counts[$i], 1) : "NaN";       // Ms promedio
            $result[] = $sumsHr[$i] > 0 ? round($sumsHr[$i] / $counts[$i], 1) : "NaN";       // Hr promedio
            $result[] = $sumsTmin[$i] > 0 ? round($sumsTmin[$i] / $counts[$i], 1) : "NaN";   // Tmin promedio
            $result[] = $sumsTmax[$i] > 0 ? round($sumsTmax[$i] / $counts[$i], 1) : "NaN";   // Tmax promedio
            $result[] = $sumsT[$i] > 0 ? round($sumsT[$i] / $counts[$i], 1) : "NaN";         // T promedio
            $result[] = $sumsETc[$i] > 0 ? round($sumsETc[$i] / $counts[$i], 1) : "NaN";      // ETc promedio
            $result[] = $sumsHf[$i] != 0 ? round($sumsHf[$i] / $counts[$i], 1) : "NaN";      // Hf promedio (ahora puede ser decimal)
            $result[] = $lastVcc[$i] ?: "NaN";                                               // Vcc último registro
        }
        
        return $result;
    }
    
    /**
     * Calcular Evapotranspiración de Referencia (ETo) usando fórmula simplificada
     * Basado en temperatura y humedad relativa
     */
    private function calcularETo(float $temp, float $hr): float {
        // Fórmula simplificada de Hargreaves
        // ETo = 0.0023 × (Tmean + 17.8) × (Tmax - Tmin)^0.5 × Ra
        
        // Para simplificar, usamos una versión basada en temperatura actual
        $tMean = $temp; // En realidad debería ser promedio diario
        $hrDecimal = $hr / 100; // Convertir humedad a decimal
        
        // Factor de radiación (simplificado)
        $ra = 0.408 * exp(0.051 * $tMean); // Estimación simplificada
        
        // Factor de presión de vapor
        $ea = $hrDecimal * 0.6108 * exp(17.27 * $tMean / ($tMean + 237.3));
        
        // ETo simplificado (mm/día)
        $eTo = 0.408 * $ra * (0.05 * $tMean) * (1 - $hrDecimal);
        
        // Redondear a 1 decimal y asegurar que no sea negativo
        return round(max(0, $eTo), 1);
    }

    /**
     * Calcular Horas Frío (Hf)
     * Reglas de cálculo:
     * +1/2 si la temperatura está entre -2°C y 0°C
     * +1 si la temperatura está entre 0°C y 7°C
     * 0 si la temperatura está entre 7° y 30°C
     * -1 si la temperatura es mayor a 30°C
     */
    private function calcularHorasFrio(float $temp): float {
        if (-2 <= $temp && $temp < 0) {
            return 0.5;  // +1/2 si está entre -2°C y 0°C
        } elseif (0 <= $temp && $temp < 7) {
            return 1.0;  // +1 si está entre 0°C y 7°C
        } elseif (7 <= $temp && $temp <= 30) {
            return 0.0;  // 0 si está entre 7° y 30°C
        } else { // $temp > 30
            return -1.0; // -1 si es mayor a 30°C
        }
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
            $sensorLength = ($sensor->type ?? "SHT4") == "SHT4" ? 4 : ((($sensor->type ?? "SHT4") == "STH" || ($sensor->type ?? "SHT4") == "FlP") ? 3 : 1);
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

    private function getHumidity($lat, $lon) {
        $apiKey = "db9c92bd1f6d8d5db0aa0bae36ce093f";
        $apiUrl = "https://api.openweathermap.org/data/2.5/weather?lat={$lat}&lon={$lon}&appid={$apiKey}&units=metric";
        $response = file_get_contents($apiUrl);        // Obtener datos desde la API
        $data = json_decode($response, true);
        $humidity = $data["main"]["humidity"] ?? 0;    // Extraer la humedad
        return round((float)$humidity, 1);             // Redondear a 1 decimal
    }

    private function processRegularData() {
        $settings = $this->getSettings();
        $data = $this->fillEmptyData($_GET['data'], $settings->sensors, $settings->sensors->sensorNumber);
        if ($settings->operationMode && ($settings->operationMode == "" || $settings->operationMode == "0" || $settings->operationMode == 0)) {
            $this->sensorsDiscovery($data);
        } else {
            $length = count($data);
            $readyToUpdate = true;
            $idx = 0;
            for ($i = 0; $i < $length; $i++) {
                if ($data[$i] !== 'NaN' && isset($data[$i + 3])) {
                    $value = (float)$data[$i + 3];
                    if (2.5 < $value && $value < 5.5) {
                        if ((float)$data[$i + 1] === -1.0) {
                            $sensorId = "S$idx";
                            $latitude = $settings->sensors->$sensorId->latitude;
                            $longitude = $settings->sensors->$sensorId->longitude;
                            $data[$i + 1] = $this->getHumidity($latitude, $longitude);
                        }
                        $i += 3;
                        $idx++;
                    } else {
                        $readyToUpdate = false;
                        break;
                    }
                }
            }
            if ($readyToUpdate) {
                // $this->escribirLog("Data array: " . json_encode($data));
                $this->updateLog($data);
                $this->verifyAlerts($data);
            }
        }
    }
    
    private function processEmptyData() {
        // Implementación para procesar datos vacíos si es necesario
        $this->escribirLog("Datos vacíos recibidos");
    }
    
    private function sensorsDiscovery($data) {
        $settings = $this->getSettings();
        $actualize = true;
        $length = count($data);
        for ($i = 0; $i < $length; $i++) {
            $idx = "S$i";
            if (isset($data[$i]) && strpos($data[$i], '0x') === 0) {
                $settings->sensors->$idx->id = $data[$i];
                $settings->sensors->$idx->latitude = $settings->sensors->$idx->latitude ?? 0.0;
                $settings->sensors->$idx->longitude = $settings->sensors->$idx->longitude ?? 0.0;
                $settings->sensors->$idx->type = $settings->sensors->$idx->type ?? "SHT4";
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
    }
}

// Programa principal - solo ejecutar si se accede directamente al archivo
// if (basename($_SERVER['PHP_SELF']) === 'sensor_v6.php') {
    try {
        // Verificar que se proporcionó el ID del sistema
        if (!isset($_GET['id']) || empty($_GET['id'])) {
            http_response_code(400);
            echo "Error: Falta el parámetro 'id' del sistema";
            exit;
        }
        
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
// }

?>
